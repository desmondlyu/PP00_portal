# JB Booking Floor Layer Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the walkway, pipeline, and PC/equipment/oven floor layers approximately twice as deep without moving machines or changing JB Booking behavior.

**Architecture:** Keep `FLOOR_PLAN_VISUAL_GRID` row metrics as the single source of equipment positions. Enlarge only the rendered Three.js floor meshes inside the existing unused inter-row spacing, so equipment centers, tester IDs, DOM hitboxes, and booking handlers remain unchanged.

**Tech Stack:** JavaScript ES modules, Three.js, Node.js contract tests, local HTTP preview.

---

### Task 1: Lock the floor-layer width contract

**Files:**
- Modify: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Add a failing source contract for visual depth**

Add these assertions beside the existing floor-layer mesh assertions:

```js
assert.match(
    floorPlan3dSource,
    /const FLOOR_LAYER_DEPTH_SCALE = 2;/,
    'floor layers should render at twice their allocated grid depth',
);
assert.match(
    floorPlan3dSource,
    /rowMetric\.depth \* FLOOR_LAYER_DEPTH_SCALE/,
    'floor layer geometry should use the visual depth scale',
);
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run:

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
```

Expected: FAIL because `FLOOR_LAYER_DEPTH_SCALE` does not exist yet.

### Task 2: Double only the rendered environmental mesh depth

**Files:**
- Modify: `tool/JB_booking/static/js/floor-plan-3d.js`

- [ ] **Step 1: Add the presentation-only scale constant**

Add beside the other visual-grid constants:

```js
const FLOOR_LAYER_DEPTH_SCALE = 2;
```

- [ ] **Step 2: Apply the scale only to floor-layer geometry**

Update `createFloorLayerMesh()`:

```js
function createFloorLayerMesh(rowMetric, gridMetrics) {
    const palette = {
        walkway: { color: 0x9fcfd2, opacity: 0.14 },
        pc: { color: 0xaac8cb, opacity: 0.18 },
        pipeline: { color: 0x98bfd0, opacity: 0.16 },
    };
    const style = palette[rowMetric.type];
    const visualDepth = rowMetric.depth * FLOOR_LAYER_DEPTH_SCALE;
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(gridMetrics.width, 0.08, visualDepth),
        new THREE.MeshStandardMaterial({
            color: style.color,
            transparent: true,
            opacity: style.opacity,
            roughness: 0.72,
            metalness: 0.08,
        }),
    );
    mesh.position.set(gridMetrics.centerX, 0.05, rowMetric.centerZ);
    mesh.userData.gridRow = rowMetric.rowIndex;
    mesh.userData.layerType = rowMetric.type;
    return mesh;
}
```

Do not change `createVisualGridMetrics()`, machine group positions, equipment group positions, tester buttons, or booking callbacks.

- [ ] **Step 3: Run the focused contract and syntax checks**

Run:

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
node --check tool\JB_booking\static\js\floor-plan-3d.js
```

Expected: both commands pass.

### Task 3: Refresh and verify the isolated preview

**Files:**
- Modify: `tool/JB_booking/index.html`
- Modify: `tool/JB_booking/static/js/app.js`

- [ ] **Step 1: Update only the local asset cache versions**

Use the same new version string for:

```html
<link rel="stylesheet" href="./static/css/style.css?v=20260909-1720">
<script src="./static/js/app.js?v=20260909-1720"></script>
```

and:

```js
floorPlan3dModulePromise = import('./floor-plan-3d.js?v=20260909-1720');
```

- [ ] **Step 2: Run all focused validation**

Run:

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
node tool\JB_booking\design-preview\route.test.mjs
node --check tool\JB_booking\static\js\app.js
node --check tool\JB_booking\static\js\floor-plan-3d.js
git diff --check
```

Expected: all commands pass.

- [ ] **Step 3: Inspect the local preview**

Open:

```text
http://127.0.0.1:4181/index.html?preview=wider-floor-layers
```

Confirm:

- walkway, pipeline, and PC/equipment/oven meshes are visibly about twice as deep;
- environmental labels remain readable;
- the seven-column equipment order is unchanged;
- all 21 machine controls remain present;
- clicking a machine still reaches the existing booking flow;
- no new JavaScript console errors appear.

- [ ] **Step 4: Leave implementation uncommitted for user approval**

Do not merge, push, or commit the production visual changes until the user approves the preview.
