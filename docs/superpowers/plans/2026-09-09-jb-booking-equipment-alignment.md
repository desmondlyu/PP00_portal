# JB Booking 3D Equipment Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic UF3000／點針座 blocks with recognizable Three.js equipment, align every visual machine row on a shared baseline, and keep every mesh inside the existing Floor Plan frame without changing booking behavior.

**Architecture:** Keep `renderFloorPlan()` and its DOM buttons as the source of truth for tester identity, booking state, keyboard access, and click handling. Extend the existing Three.js presentation module with pure layout metrics, equipment-specific mesh factories, bottom-aligned row placement, and frame-bound clamping; the canvas remains visual-only and the DOM layer remains the click fallback.

**Tech Stack:** Native ES modules, local Three.js r186 (`OrthographicCamera`, `BoxGeometry`, `MeshStandardMaterial`, `Group`, `Box3`), existing Node ESM contract tests, existing browser preview harness.

---

## File map

- Modify: `tool/JB_booking/static/js/floor-plan-3d.js`
  - Add pure frame/row metrics.
  - Add UF3000 and probe-seat mesh factories.
  - Position all mesh groups by bottom/front baseline and clamp their geometry to the frame.
  - Keep existing hover, Raycaster, resize, dispose, and DOM fallback contracts.
- Modify: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`
  - Add source contracts for equipment factories, row metrics, baseline placement, frame bounds, and unchanged booking integration.
- Do not modify: `tool/JB_booking/static/js/app.js`
  - The existing machine records, appointment lookup, tester IDs, CSS button coordinates, and `openAppointmentModal()` call remain unchanged.
- Do not modify unless browser verification proves layer overlap: `tool/JB_booking/static/css/style.css`
  - If required, only adjust `.floor-plan-3d-host`, `.floor-plan-label-layer`, or their presentation-only `z-index`/`pointer-events`.

## Task 1: Add failing presentation contracts

**Files:**
- Modify: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Add required source contracts**

Extend the existing `required` checks with these exact presentation symbols and labels:

```js
for (const required of [
    'createLayoutMetrics',
    'createEquipmentMesh',
    'createUf3000Mesh',
    'createProbeSeatMesh',
    'FRAME_INSET',
    'rowBaseline',
    'frameBounds',
    'Box3',
]) {
    assert.match(floorPlan3dSource, new RegExp(required));
}
for (const required of [
    'UF3000',
    '點針座1',
    '點針座2',
    'setFromObject',
    'clamp',
]) {
    assert.match(floorPlan3dSource, new RegExp(required));
}
```

Add explicit safeguards that the source still does not contain booking dependencies:

```js
assert.doesNotMatch(floorPlan3dSource, /appointments|openAppointmentModal|supabase/i);
assert.match(appSource, /openAppointmentModal\(slot\.tester, dateStr\)/);
assert.match(appSource, /machineAppointments\.length > 0/);
```

- [ ] **Step 2: Run the focused contract test and confirm it fails**

Run:

```powershell
node tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
```

Expected: FAIL because the new equipment and layout symbols do not yet exist. Do not change application code before observing this failure.

- [ ] **Step 3: Commit the failing-test contract**

```powershell
git add tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
git commit -m "test: specify equipment alignment contracts" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 2: Implement frame bounds and shared row baselines

**Files:**
- Modify: `tool/JB_booking/static/js/floor-plan-3d.js`

- [ ] **Step 1: Add layout constants and pure coordinate helpers**

Add these constants below the existing world constants:

```js
const FRAME_INSET = 0.72;
const ROW_Y_TOLERANCE = 1.25;
const MAX_EQUIPMENT_HEIGHT = 1.62;
const MAX_MACHINE_HEIGHT = 1.58;
```

Add helpers that preserve the existing percentage-to-world mapping:

```js
function percentRangeToWorld(start, size, total) {
    return {
        min: percentToWorld(start, total),
        max: percentToWorld(start + size, total),
    };
}

function getFrameBounds(staticBlocks) {
    const frames = staticBlocks.filter(({ kind }) => kind === 'frame');
    const x = frames.map(({ x, w }) => percentRangeToWorld(x, w, WORLD_WIDTH));
    const z = frames.map(({ y, h }) => percentRangeToWorld(y, h, WORLD_DEPTH));
    return {
        minX: Math.min(...x.map(({ min, max }) => Math.min(min, max))) + FRAME_INSET,
        maxX: Math.max(...x.map(({ min, max }) => Math.max(min, max))) - FRAME_INSET,
        minZ: Math.min(...z.map(({ min, max }) => Math.min(min, max))) + FRAME_INSET,
        maxZ: Math.max(...z.map(({ min, max }) => Math.max(min, max))) - FRAME_INSET,
    };
}

function groupMachineRows(machines) {
    return machines
        .slice()
        .sort((a, b) => a.y - b.y)
        .reduce((rows, machine) => {
            const row = rows.find(
                ({ y }) => Math.abs(y - machine.y) <= ROW_Y_TOLERANCE,
            );
            if (row) {
                row.machines.push(machine);
            } else {
                rows.push({ y: machine.y, machines: [machine] });
            }
            return rows;
        }, []);
}
```

- [ ] **Step 2: Add `createLayoutMetrics()` with bottom/front row alignment**

Implement a pure metrics function that returns frame bounds, row baselines, and per-machine placements. Use the CSS block bottom edge (`machine.y + machine.height`) as the visual front edge, so machines with different 3D heights share the same row baseline:

```js
function createLayoutMetrics(staticBlocks, machines) {
    const frameBounds = getFrameBounds(staticBlocks);
    const rows = groupMachineRows(machines);
    const machinePlacements = new Map();

    rows.forEach((row) => {
        const rowBottomPercent = Math.max(
            ...row.machines.map(({ y, height }) => y + height),
        );
        const rowBaseline = percentToWorld(rowBottomPercent, WORLD_DEPTH);
        row.machines.forEach((machine) => {
            machinePlacements.set(machine.tester, {
                x: percentToWorld(machine.x + machine.width / 2, WORLD_WIDTH),
                rowBaseline,
                rowKey: row.y,
            });
        });
    });

    return { frameBounds, rows, machinePlacements };
}
```

- [ ] **Step 3: Add `clampGroupToBounds()` using `THREE.Box3`**

After a group is assembled, compute its world-space bounding box. Clamp its horizontal center to the frame inset; if the footprint is still too large, apply one uniform scale before the final clamp:

```js
function clampGroupToBounds(group, frameBounds) {
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group);
    const width = bounds.max.x - bounds.min.x;
    const depth = bounds.max.z - bounds.min.z;
    const availableWidth = frameBounds.maxX - frameBounds.minX;
    const availableDepth = frameBounds.maxZ - frameBounds.minZ;
    const footprintScale = Math.min(
        1,
        availableWidth / Math.max(width, 0.001),
        availableDepth / Math.max(depth, 0.001),
    );

    if (footprintScale < 1) {
        group.scale.multiplyScalar(footprintScale);
        group.updateMatrixWorld(true);
    }

    const finalBounds = new THREE.Box3().setFromObject(group);
    group.position.x += Math.max(
        frameBounds.minX - finalBounds.min.x,
        Math.min(0, frameBounds.maxX - finalBounds.max.x),
    );
    group.position.z += Math.max(
        frameBounds.minZ - finalBounds.min.z,
        Math.min(0, frameBounds.maxZ - finalBounds.max.z),
    );
    group.userData.frameBounds = frameBounds;
}
```

Keep `FRAME_INSET` and the final `Box3` calculation in the module so a browser check can inspect the same geometry policy as production.

- [ ] **Step 4: Run the focused test and confirm Task 2 symbols are present**

Run:

```powershell
node tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
```

Expected: still FAIL on equipment-specific symbols, but no longer fail because `createLayoutMetrics`, `FRAME_INSET`, `rowBaseline`, `frameBounds`, or `Box3` are absent.

## Task 3: Build recognizable UF3000 and probe-seat meshes

**Files:**
- Modify: `tool/JB_booking/static/js/floor-plan-3d.js`

- [ ] **Step 1: Add shared equipment material helpers**

Add a small material helper that preserves the existing dark premium palette:

```js
function createEquipmentMaterial(color, options = {}) {
    return createMaterial(color, {
        roughness: options.roughness ?? 0.52,
        metalness: options.metalness ?? 0.36,
        emissive: options.emissive ?? 0x000000,
        emissiveIntensity: options.emissiveIntensity ?? 0.12,
    });
}
```

- [ ] **Step 2: Implement `createUf3000Mesh(blockDef, metrics)`**

Use the static block dimensions as the footprint source, but keep enough inset for the 3D details:

```js
function createUf3000Mesh(blockDef, metrics) {
    const width = Math.max(0.72, (blockDef.w / 100) * WORLD_WIDTH * 0.72);
    const depth = Math.max(0.62, (blockDef.h / 100) * WORLD_DEPTH * 0.62);
    const bodyHeight = 1.18;
    const group = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(width, bodyHeight, depth),
        createEquipmentMaterial(0x1b6f8d, { emissive: 0x062d3b }),
    );
    body.position.y = bodyHeight / 2 + MACHINE_Y;

    const topPanel = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.66, 0.10, depth * 0.70),
        createEquipmentMaterial(0x8cecf4, { metalness: 0.55, emissive: 0x0b5a6d }),
    );
    topPanel.position.set(0, bodyHeight + MACHINE_Y + 0.05, 0);

    const frontDoor = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.52, bodyHeight * 0.48, 0.045),
        createEquipmentMaterial(0x0d4056, { metalness: 0.48 }),
    );
    frontDoor.position.set(0, bodyHeight * 0.45 + MACHINE_Y, depth / 2 + 0.025);

    const controlPanel = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.18, 0.16, 0.05),
        createEquipmentMaterial(0xf1b65d, { emissive: 0x4a2107 }),
    );
    controlPanel.position.set(width * 0.28, bodyHeight * 0.78 + MACHINE_Y, depth / 2 + 0.05);

    group.add(body, topPanel, frontDoor, controlPanel);
    group.userData.equipment = 'UF3000';
    group.userData.blockLabel = blockDef.label;
    group.userData.frameBounds = metrics.frameBounds;
    return group;
}
```

Set the group position from the static block center, then set its Z position so the front footprint edge rests on the block bottom baseline before calling `clampGroupToBounds()`.

- [ ] **Step 3: Implement `createProbeSeatMesh(blockDef, metrics)`**

Build a visibly different low base, vertical probe column, and probe head:

```js
function createProbeSeatMesh(blockDef, metrics) {
    const width = Math.max(0.68, (blockDef.w / 100) * WORLD_WIDTH * 0.70);
    const depth = Math.max(0.58, (blockDef.h / 100) * WORLD_DEPTH * 0.58);
    const baseHeight = 0.30;
    const columnHeight = 0.72;
    const group = new THREE.Group();

    const base = new THREE.Mesh(
        new THREE.BoxGeometry(width, baseHeight, depth),
        createEquipmentMaterial(0x55469c, { emissive: 0x171037 }),
    );
    base.position.y = baseHeight / 2 + MACHINE_Y;

    const column = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.13, columnHeight, depth * 0.16),
        createEquipmentMaterial(0x9a86e8, { metalness: 0.50 }),
    );
    column.position.set(0, baseHeight + columnHeight / 2 + MACHINE_Y, 0);

    const probeHead = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.48, 0.16, depth * 0.38),
        createEquipmentMaterial(0xd7ccff, { metalness: 0.58, emissive: 0x281e5a }),
    );
    probeHead.position.set(0, baseHeight + columnHeight + 0.08 + MACHINE_Y, 0);

    const needle = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.035, 0.30, depth * 0.035),
        createEquipmentMaterial(0xf6de9b, { metalness: 0.68 }),
    );
    needle.position.set(0, baseHeight + columnHeight - 0.08 + MACHINE_Y, 0);

    group.add(base, column, probeHead, needle);
    group.userData.equipment = blockDef.label;
    group.userData.blockLabel = blockDef.label;
    group.userData.frameBounds = metrics.frameBounds;
    return group;
}
```

- [ ] **Step 4: Add `createEquipmentMesh()` dispatch**

Dispatch only by the existing static label:

```js
function createEquipmentMesh(blockDef, metrics) {
    const group = blockDef.label === 'UF3000'
        ? createUf3000Mesh(blockDef, metrics)
        : blockDef.label === '點針座1' || blockDef.label === '點針座2'
            ? createProbeSeatMesh(blockDef, metrics)
            : createGenericEquipmentMesh(blockDef, metrics);
    positionEquipmentOnBlock(group, blockDef);
    clampGroupToBounds(group, metrics.frameBounds);
    group.traverse((child) => {
        child.castShadow = true;
        child.receiveShadow = true;
    });
    return group;
}
```

Keep `blockDef.label` unchanged for the existing DOM label layer.

- [ ] **Step 5: Run the focused contract test**

Run:

```powershell
node tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
```

Expected: PASS for equipment factory and presentation contract checks; any remaining failure must be from the machine integration in Task 4.

- [ ] **Step 6: Commit equipment mesh work**

```powershell
git add tool/JB_booking/static/js/floor-plan-3d.js tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
git commit -m "feat: add 3d uf3000 and probe seat meshes" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 4: Integrate row-aligned machine meshes and static equipment

**Files:**
- Modify: `tool/JB_booking/static/js/floor-plan-3d.js`

- [ ] **Step 1: Update `createMachineMesh()` to accept layout metrics**

Change the presentation-only signature to `createMachineMesh(machine, metrics)`. Use the existing T／Ms dimensions and booking color, but position the group from `metrics.machinePlacements.get(machine.tester)`:

```js
const placement = metrics.machinePlacements.get(machine.tester);
const machineDepth = isMs ? 0.9 : 0.78;
group.position.set(
    placement.x,
    0,
    placement.rowBaseline - machineDepth / 2,
);
group.userData.rowBaseline = placement.rowBaseline;
group.userData.rowKey = placement.rowKey;
```

Keep `group.userData.tester`, `group.userData.booked`, `group.userData.model`, and `group.userData.body` unchanged. Call `clampGroupToBounds(group, metrics.frameBounds)` after all child meshes are added.

- [ ] **Step 2: Update `createStaticBlock()` to render equipment-specific 3D**

Keep frame and walkway rendering behavior. For `kind === 'device'`, replace the generic `BoxGeometry` path with:

```js
if (kind === 'device') {
    const equipment = createEquipmentMesh(blockDef, metrics);
    scene.add(equipment);
    return equipment;
}
```

The existing DOM `floor-static-block device` label remains created by `app.js`; do not add a second text label in Three.js.

- [ ] **Step 3: Compute metrics once per scene**

At the start of `createFloorPlan3D()`:

```js
const layoutMetrics = createLayoutMetrics(staticBlocks, machines);
```

Pass `layoutMetrics` to both static block and machine creation:

```js
staticBlocks.forEach((blockDef) => createStaticBlock(scene, blockDef, layoutMetrics));
const machineGroups = machines.map((machine) => {
    const group = createMachineMesh(machine, layoutMetrics);
    // existing material configuration and scene.add(group) remain here
    return group;
});
```

- [ ] **Step 4: Preserve picking and hover contracts**

Keep `pickTargets` limited to machine bodies:

```js
const pickTargets = machineGroups
    .map((group) => group.userData.body)
    .filter(Boolean);
```

Do not add equipment meshes to `pickTargets`; UF3000 and probe seats are visual-only.

- [ ] **Step 5: Run all static regression checks**

Run:

```powershell
node tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
node tool/JB_booking/design-preview/route.test.mjs
node --check tool/JB_booking/static/js/app.js
node --check tool/JB_booking/static/js/floor-plan-3d.js
git diff --check
```

Expected: all commands exit 0; the route test still reports the original 21-machine layout.

- [ ] **Step 6: Commit the integration**

```powershell
git add tool/JB_booking/static/js/floor-plan-3d.js
git commit -m "fix: align floor plan 3d rows within frame" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 5: Browser verification and presentation-only CSS guard

**Files:**
- Modify only if the browser check proves an overlay defect: `tool/JB_booking/static/css/style.css`
- Test: `tool/JB_booking/design-preview/browser-check.js`

- [ ] **Step 1: Start the isolated preview**

From the repository root, run the existing preview command used by this worktree:

```powershell
node tool/JB_booking/design-preview/serve.mjs
```

Open the printed local URL and switch to the Floor Plan view.

- [ ] **Step 2: Verify desktop geometry**

Check all of the following in the browser:

1. Every UF3000 has a tall body, front door, top panel, and control detail.
2. Every 點針座 has a low base, vertical probe column, probe head, and needle.
3. T and Ms tester labels remain readable and retain the original text.
4. The bottom edges of machines in each row form one horizontal visual baseline.
5. No machine, UF3000, probe head, or static device geometry crosses the outer Floor Plan frame.
6. Hover lifts only the selected tester mesh and keeps the DOM label synchronized.

- [ ] **Step 3: Verify booking interaction**

Click one left-side T tester and one right-side tester. Confirm:

- The original booking modal opens.
- The selected tester ID is unchanged.
- The selected date and appointment count are unchanged.
- UF3000／點針座 do not open booking modal or intercept the tester button.

- [ ] **Step 4: Verify mobile behavior**

Set the viewport to 700px wide and confirm:

- The existing horizontal scroll behavior remains.
- All 21 `.tester-block` buttons remain in the DOM.
- A tester remains keyboard-focusable and clickable.
- No new console error appears.

- [ ] **Step 5: Apply CSS only if the check finds overlay interference**

If and only if the label layer blocks the intended visual presentation, keep the existing structure and change only the relevant presentation declarations:

```css
.floor-plan-3d-host {
    z-index: 1;
    pointer-events: none;
}

.floor-plan-label-layer {
    z-index: 2;
}
```

Do not change `.tester-block` positioning, dimensions, click handlers, state classes, or responsive layout.

- [ ] **Step 6: Run the final verification set**

```powershell
node tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
node tool/JB_booking/design-preview/route.test.mjs
node --check tool/JB_booking/static/js/app.js
node --check tool/JB_booking/static/js/floor-plan-3d.js
git diff --check
```

Expected: all checks pass, browser console has no new JavaScript error, and `git status --short` shows only the intended presentation files plus pre-existing untracked design-preview assets.

- [ ] **Step 7: Commit any narrowly scoped CSS correction**

Only if Step 5 changed CSS:

```powershell
git add tool/JB_booking/static/css/style.css
git commit -m "fix: preserve floor plan label interaction layer" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Final scope check

Before handing off, verify the diff does not contain changes to:

- `tool/JB_booking/index.html`
- backend/API files
- appointment schema or data loading
- Calendar code
- auth, permission, or route code
- `openAppointmentModal()` implementation
- tester ID or coordinate constants

The final branch remains isolated, unmerged, and unpushed.
