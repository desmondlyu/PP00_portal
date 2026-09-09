# JB Booking Floor Grid Vertical Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the approved seven-column layout vertically so it occupies most of the PP00 dashed frame without changing horizontal positions, object sizes, or Booking behavior.

**Architecture:** Identify the PP00 frame as the largest `frame` definition and derive the visual grid's vertical center from that frame. Apply a presentation-only multiplier to row-center offsets, leaving each machine mesh, tester button, environmental mesh, camera, PQ00, and FAE unchanged.

**Tech Stack:** JavaScript ES modules, Three.js, Node.js contract tests, Playwright local preview.

---

### Task 1: Lock the PP00 vertical-fill contract

**Files:**
- Modify: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Add failing source assertions**

Add:

```js
assert.match(
    floorPlan3dSource,
    /const GRID_VERTICAL_FILL_SCALE = 1\.35;/,
    'the PP00 visual grid should expand vertically in screen space',
);
assert.match(
    floorPlan3dSource,
    /function getPrimaryFloorFrameBounds\(/,
    'the visual grid should derive its center from the PP00 frame',
);
assert.match(
    floorPlan3dSource,
    /createVisualGridMetrics\(visualGrid, primaryFrameBounds\)/,
    'visual grid metrics should receive the PP00 frame bounds',
);
assert.match(
    floorPlan3dSource,
    /rawCenterZ - rawGridCenterZ\) \* GRID_VERTICAL_FILL_SCALE/,
    'row centers should expand around the grid center',
);
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
```

Expected: FAIL because the PP00 vertical-fill helpers do not exist.

### Task 2: Expand only row-center positions inside PP00

**Files:**
- Modify: `tool/JB_booking/static/js/floor-plan-3d.js`

- [ ] **Step 1: Add the visual-only fill constant**

Add beside the grid constants:

```js
const GRID_VERTICAL_FILL_SCALE = 1.35;
```

- [ ] **Step 2: Add a PP00 frame selector**

Add after `getFrameBounds()`:

```js
function getPrimaryFloorFrameBounds(staticBlocks, inset = FRAME_INSET) {
    const primaryFrame = staticBlocks
        .filter(({ kind }) => kind === 'frame')
        .sort((a, b) => (b.w * b.h) - (a.w * a.h))[0];
    const x = percentRangeToWorld(
        primaryFrame.x,
        primaryFrame.w,
        WORLD_WIDTH,
    );
    const z = percentRangeToWorld(
        primaryFrame.y,
        primaryFrame.h,
        WORLD_DEPTH,
    );
    return {
        minX: Math.min(x.min, x.max) + inset,
        maxX: Math.max(x.min, x.max) - inset,
        minZ: Math.min(z.min, z.max) + inset,
        maxZ: Math.max(z.min, z.max) - inset,
    };
}
```

- [ ] **Step 3: Expand calculated row centers around the PP00 center**

Change the signature:

```js
function createVisualGridMetrics(visualGrid, primaryFrameBounds) {
```

Keep the current row depth and gap calculations to create `rawRows`, then
replace their final centers:

```js
const rawGridMinZ = rawRows[0].centerZ - rawRows[0].depth / 2;
const lastRow = rawRows.at(-1);
const rawGridMaxZ = lastRow.centerZ + lastRow.depth / 2;
const rawGridCenterZ = (rawGridMinZ + rawGridMaxZ) / 2;
const frameCenterZ = (
    primaryFrameBounds.minZ + primaryFrameBounds.maxZ
) / 2;
const rows = rawRows.map((row) => {
    const rawCenterZ = row.centerZ;
    return {
        ...row,
        centerZ: frameCenterZ + (
            rawCenterZ - rawGridCenterZ
        ) * GRID_VERTICAL_FILL_SCALE,
    };
});
```

This changes only row center positions. Do not scale machine groups, mesh
dimensions, horizontal column centers, camera settings, or DOM hitboxes.

- [ ] **Step 4: Wire PP00 bounds into grid metrics**

Inside `createFloorPlan3D()`:

```js
const primaryFrameBounds = getPrimaryFloorFrameBounds(staticBlocks);
const gridMetrics = createVisualGridMetrics(
    visualGrid,
    primaryFrameBounds,
);
```

- [ ] **Step 5: Run focused validation**

Run:

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
node --check tool\JB_booking\static\js\floor-plan-3d.js
```

Expected: both commands pass.

### Task 3: Refresh and inspect the isolated preview

**Files:**
- Modify: `tool/JB_booking/index.html`
- Modify: `tool/JB_booking/static/js/app.js`

- [ ] **Step 1: Update the local asset cache version**

Use `20260909-1840` for the stylesheet, `app.js`, and dynamic
`floor-plan-3d.js` import query strings.

- [ ] **Step 2: Run all focused checks**

Run:

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
node tool\JB_booking\design-preview\route.test.mjs
node --check tool\JB_booking\static\js\app.js
node --check tool\JB_booking\static\js\floor-plan-3d.js
git diff --check
```

Expected: all commands pass.

- [ ] **Step 3: Inspect the browser preview**

Open:

```text
http://127.0.0.1:4181/index.html?preview=vertical-fill
```

Confirm:

- the first walkway is close to the PP00 inner top edge;
- the final equipment row is close to the PP00 inner bottom edge;
- top and bottom safety margins remain;
- environmental layers do not overlap machines;
- horizontal positions and object sizes are unchanged;
- all 21 tester controls remain available;
- no new JavaScript errors appear.

- [ ] **Step 4: Tune only the fill scale if needed**

If the visual result is still too compressed or reaches the frame boundary,
adjust only `GRID_VERTICAL_FILL_SCALE` in increments of `0.05`, rerun the
checks, and capture a new preview. Do not change individual row positions.

- [ ] **Step 5: Leave implementation uncommitted**

Do not merge, push, or commit production visual changes until the user approves
the preview.
