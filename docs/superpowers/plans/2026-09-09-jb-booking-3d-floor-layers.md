# JB Booking 3D Floor Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render walkways and `PC/設備/烤箱` as transparent Three.js floor objects and position lower machine rows relative to their 3D boundaries.

**Architecture:** `floor-plan-3d.js` owns all geometric placement and returns projected anchors for DOM text. `app.js` keeps existing data, Booking handlers, fallback DOM blocks, and applies projection results without changing tester identities or business logic.

**Tech Stack:** Three.js r186, vanilla JavaScript, CSS, Node.js contract tests.

---

### Task 1: Replace stale row-offset contract

**Files:**
- Modify: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`
- Test: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Remove uncommitted fixed-row assertions**

Remove assertions for `LOWER_FIRST_ROW_Y`, `LOWER_SECOND_ROW_Y`, `LOWER_SECOND_ROW_GAP_PERCENT`, and `.lower-label-above`.

- [ ] **Step 2: Add failing 3D floor-layer assertions**

```js
assert.match(floorPlan3dSource, /createFloorLayerMesh/);
assert.match(floorPlan3dSource, /kind === 'walkway'/);
assert.match(floorPlan3dSource, /blockDef\.label === 'PC\/設備\/烤箱'/);
assert.match(floorPlan3dSource, /LOWER_ROW_CLEARANCE/);
assert.match(floorPlan3dSource, /lowerWalkwayBounds/);
assert.doesNotMatch(floorPlan3dSource, /createWalkwayAnchor/);
assert.match(appSource, /position\.width/);
assert.match(appSource, /position\.height/);
```

- [ ] **Step 3: Run the test and verify RED**

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
```

Expected: FAIL because visible floor-layer meshes and projected dimensions do not exist.

### Task 2: Create transparent 3D floor layers

**Files:**
- Modify: `tool/JB_booking/static/js/floor-plan-3d.js`
- Test: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Add a shared floor-layer mesh**

Implement:

```js
function createFloorLayerMesh(blockDef) {
    const width = (blockDef.w / 100) * WORLD_WIDTH;
    const depth = (blockDef.h / 100) * WORLD_DEPTH;
    const isWalkway = blockDef.kind === 'walkway';
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.035, depth),
        createMaterial(isWalkway ? 0x9fcfd2 : 0x88b7bd, {
            roughness: 0.88,
            metalness: 0.04,
            transparent: true,
            opacity: isWalkway ? 0.14 : 0.18,
        }),
    );
    mesh.position.set(
        percentToWorld(blockDef.x + blockDef.w / 2, WORLD_WIDTH),
        -0.035,
        percentToWorld(blockDef.y + blockDef.h / 2, WORLD_DEPTH),
    );
    mesh.userData.blockLabel = blockDef.label;
    mesh.userData.kind = blockDef.kind;
    return mesh;
}
```

- [ ] **Step 2: Render walkway and PC layers**

In `createStaticBlock()`, return `createFloorLayerMesh(blockDef)` for walkway blocks and the `PC/設備/烤箱` block. Do not add these meshes to `pickTargets`.

- [ ] **Step 3: Project object dimensions**

Extend `projectGroup()` to project the `THREE.Box3` corners and return:

```js
{
    x,
    y,
    width: projectedMaxX - projectedMinX,
    height: projectedMaxY - projectedMinY,
}
```

This allows DOM labels to follow the exact visible 3D layer rather than retaining percentage dimensions.

### Task 3: Position lower rows from the lowest walkway

**Files:**
- Modify: `tool/JB_booking/static/js/floor-plan-3d.js`
- Test: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Add boundary constants**

```js
const LOWER_ROW_CLEARANCE = 0.55;
const LOWER_ROW_GAP = 0.72;
```

- [ ] **Step 2: Calculate lower walkway bounds**

After creating static groups:

```js
const lowerWalkway = staticBlockGroups
    .filter((group) => group?.userData.kind === 'walkway')
    .sort((a, b) => b.position.z - a.position.z)[0];
const lowerWalkwayBounds = new THREE.Box3().setFromObject(lowerWalkway);
```

- [ ] **Step 3: Place lower machine rows**

Keep row-1 objects above unchanged. For y `71.5`, set the group footprint minimum Z to `lowerWalkwayBounds.max.z + LOWER_ROW_CLEARANCE`. For y `78.5`, set minimum Z to the first row maximum Z plus `LOWER_ROW_GAP`.

Apply the same rule to the two lower UF3000 groups and Auto Hander.

- [ ] **Step 4: Preserve label direction**

Set first-row tester and UF3000 `labelPlacement` to `above`; keep second-row labels below. Only DOM label children move—the tester button remains the click hitbox.

### Task 4: Synchronize DOM labels and validate

**Files:**
- Modify: `tool/JB_booking/static/js/app.js`
- Modify: `tool/JB_booking/static/css/style.css`
- Modify: `tool/JB_booking/index.html`
- Test: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`
- Test: `tool/JB_booking/design-preview/route.test.mjs`

- [ ] **Step 1: Apply projected floor-layer bounds**

For projected walkway and PC blocks:

```js
block.style.left = `${(position.x - position.width / 2) / width * 100}%`;
block.style.top = `${(position.y - position.height / 2) / height * 100}%`;
block.style.width = `${position.width / width * 100}%`;
block.style.height = `${position.height / height * 100}%`;
```

Keep the text and transparent CSS styling.

- [ ] **Step 2: Apply first-row label classes**

Toggle `.lower-label-above` only from projected `labelPlacement`. Keep the tester button at its projected machine location.

- [ ] **Step 3: Update asset versions**

Use one matching query version in `index.html` and the dynamic `floor-plan-3d.js` import.

- [ ] **Step 4: Run verification**

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
node tool\JB_booking\design-preview\route.test.mjs
node --check tool\JB_booking\static\js\app.js
node --check tool\JB_booking\static\js\floor-plan-3d.js
git diff --check
```

Expected:

```text
Three.js presentation contract and 21-machine layout passed.
21 machine routes, mid-walk retargeting, obstacles and invalid inputs passed.
```

- [ ] **Step 5: Open isolated preview**

```text
http://127.0.0.1:4181/index.html?preview=3d-floor-layers
```

Verify that the four walkways and PC layer are transparent 3D objects with visible text, the lowest first row sits below the walkway, the second row has separate label space, and tester clicks retain the original Booking behavior.

- [ ] **Step 6: Commit**

```powershell
git add tool\JB_booking\index.html tool\JB_booking\static\css\style.css tool\JB_booking\static\js\app.js tool\JB_booking\static\js\floor-plan-3d.js tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
git commit -m "Build transparent 3D floor layers"
```
