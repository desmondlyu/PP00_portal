# JB Booking Seven-Column Floor Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the PP00 Floor Plan presentation as the user-approved seven-column grid while preserving all Booking identities, handlers, and data flow.

**Architecture:** Add a presentation-only grid definition keyed by existing tester IDs and equipment labels. Three.js creates machines, equipment, transparent walkways, PC layer, and pipeline strips from the grid; DOM buttons and labels consume the projected positions but retain all existing Booking behavior.

**Tech Stack:** Vanilla JavaScript, Three.js r186, CSS, Node.js contract tests.

---

### Task 1: Restore the stable production baseline

**Files:**
- Restore: `tool/JB_booking/index.html`
- Restore: `tool/JB_booking/static/css/style.css`
- Restore: `tool/JB_booking/static/js/app.js`
- Restore: `tool/JB_booking/static/js/floor-plan-3d.js`
- Restore: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Remove only the uncommitted experimental implementation**

Restore the listed files from current `HEAD`. Do not modify or remove untracked preview assets.

```powershell
git restore -- tool\JB_booking\index.html tool\JB_booking\static\css\style.css tool\JB_booking\static\js\app.js tool\JB_booking\static\js\floor-plan-3d.js tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
```

- [ ] **Step 2: Confirm production files are clean**

```powershell
git status --short
```

Expected: no modified entries for the five restored production/test files.

### Task 2: Specify the immutable seven-column grid contract

**Files:**
- Modify: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Add failing grid assertions**

Require the presentation definitions:

```js
assert.match(appSource, /FLOOR_PLAN_VISUAL_GRID/);
assert.match(appSource, /type:\s*'pipeline'/);
assert.match(appSource, /columns:\s*7/);
assert.match(floorPlan3dSource, /createVisualGridMetrics/);
assert.match(floorPlan3dSource, /createFloorLayerMesh/);
assert.match(floorPlan3dSource, /gridRow/);
assert.match(floorPlan3dSource, /gridColumn/);
```

Add exact row assertions for the five equipment rows, including `null` cells:

```js
const grid = vm.runInNewContext(
    appSource.slice(0, appSource.indexOf('const LOCAL_CLIENT_ID_KEY')) +
    ';FLOOR_PLAN_VISUAL_GRID',
    { window: {} },
);
assert.equal(grid.columns, 7);
assert.equal(JSON.stringify(grid.rows[2].cells), JSON.stringify([
    'T5833-2(.84)',
    'T5830ES_WBN12(.79)',
    '點針座2',
    'Ms3490#3',
    'T5830ES_WBN10(.74)',
    'T5385ES_WBN1(.42)',
    'UF3000@row1',
]));
```

Repeat the exact expected cell arrays for rows 5, 7, 9, and 11 from the approved spec.

- [ ] **Step 2: Run the contract and verify RED**

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
```

Expected: FAIL because `FLOOR_PLAN_VISUAL_GRID` does not exist.

### Task 3: Add the presentation-only visual grid

**Files:**
- Modify: `tool/JB_booking/static/js/app.js`
- Test: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Define the grid**

Add before `LOCAL_CLIENT_ID_KEY`:

```js
const FLOOR_PLAN_VISUAL_GRID = Object.freeze({
    columns: 7,
    rows: [
        { type: 'walkway', label: '走道' },
        { type: 'pc-equipment', label: 'PC/設備/烤箱' },
        {
            type: 'equipment-row',
            cells: [
                'T5833-2(.84)',
                'T5830ES_WBN12(.79)',
                '點針座2',
                'Ms3490#3',
                'T5830ES_WBN10(.74)',
                'T5385ES_WBN1(.42)',
                'UF3000@row1',
            ],
        },
        { type: 'walkway', label: '走道' },
        {
            type: 'equipment-row',
            cells: [
                'T5833-3(.92)',
                'Ms3490#2',
                'UF3000@row2',
                'T5830ES_WBN15(.89)',
                'T5385ES_WBN6(.56)',
                '點針座1',
                'Ms3480#1',
            ],
        },
        { type: 'pipeline', label: '管線' },
        {
            type: 'equipment-row',
            cells: [
                'T5385ES_PT22',
                'T5833-4(.96)',
                'T5833-5(.97)',
                'T5830ES_WBN11(.78)',
                null,
                'T5830ES_WBN3(.61)',
                'UF3000@row3',
            ],
        },
        { type: 'walkway', label: '走道' },
        {
            type: 'equipment-row',
            cells: [
                null,
                'T5833-6(.98)',
                'T5833-1(.80)',
                'UF3000@row4-left',
                'T5830ES_WBN8(.75)',
                'UF3000@row4-right',
                null,
            ],
        },
        { type: 'pipeline', label: '管線' },
        {
            type: 'equipment-row',
            cells: [
                null,
                null,
                'T5781-3(.33)',
                'Auto Hander',
                'T5781-2(.32)',
                null,
                null,
            ],
        },
    ],
});
```

The suffixed UF3000 keys are presentation identities only; tester IDs remain unchanged.

- [ ] **Step 2: Pass the grid to Three.js**

Add `visualGrid: FLOOR_PLAN_VISUAL_GRID` to `createFloorPlan3D()` arguments. Do not alter appointment lookup or click handlers.

- [ ] **Step 3: Run the contract**

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
```

Expected: remaining failures only for missing Three.js grid rendering.

### Task 4: Render all objects from the shared grid

**Files:**
- Modify: `tool/JB_booking/static/js/floor-plan-3d.js`
- Test: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Accept and validate visualGrid**

Extend `createFloorPlan3D()`:

```js
export function createFloorPlan3D({
    host,
    machines,
    staticBlocks,
    visualGrid,
    onHover = () => {},
    onLayout = () => {},
}) {
```

Throw a clear presentation error if `visualGrid.columns !== 7` or rows are missing.

- [ ] **Step 2: Build grid metrics**

Implement `createVisualGridMetrics(visualGrid)` using:

```js
const GRID_LEFT = -7.8;
const GRID_RIGHT = 7.8;
const GRID_TOP = -7.2;
const COLUMN_GAP = 0.16;
const EQUIPMENT_ROW_DEPTH = 1.42;
const WALKWAY_DEPTH = 0.62;
const PC_LAYER_DEPTH = 0.78;
const PIPELINE_DEPTH = 0.34;
const ROW_GAP = 0.24;
```

Return each row center Z, row depth, and seven column center X values.

- [ ] **Step 3: Map machine IDs**

Create a map from `machines` by `tester`. For every `equipment-row` tester cell, assign:

```js
group.userData.gridRow = rowIndex;
group.userData.gridColumn = columnIndex;
group.position.x = metrics.columnCenters[columnIndex];
group.position.z = metrics.rows[rowIndex].centerZ;
```

Do not use or mutate the original machine x/y values.

- [ ] **Step 4: Map duplicate equipment identities**

Map the presentation keys:

```js
const equipmentKeyBySource = new Map([
    ['UF3000@row1', { label: 'UF3000', sourceIndex: 0 }],
    ['UF3000@row2', { label: 'UF3000', sourceIndex: 1 }],
    ['UF3000@row3', { label: 'UF3000', sourceIndex: 2 }],
    ['UF3000@row4-left', { label: 'UF3000', sourceIndex: 3 }],
    ['UF3000@row4-right', { label: 'UF3000', sourceIndex: 4 }],
]);
```

Create one equipment group for each matching grid cell and attach its original static block index so DOM text projection remains stable.

- [ ] **Step 5: Create transparent floor layers**

Implement `createFloorLayerMesh()` for `walkway`, `pc-equipment`, and `pipeline`:

```js
const style = {
    walkway: { color: 0x9fcfd2, opacity: 0.14 },
    'pc-equipment': { color: 0xaac8cb, opacity: 0.18 },
    pipeline: { color: 0x98bfd0, opacity: 0.16 },
}[row.type];
```

Use a height of `0.035`. Set `userData.blockLabel`, `gridRow`, and a stable projection key. Do not add floor layers to raycaster targets.

- [ ] **Step 6: Align row baselines**

Use one Z center per row. Machines in the same row must share the same footprint baseline. Do not apply post-clamp offsets or DOM percentage offsets.

### Task 5: Synchronize DOM labels

**Files:**
- Modify: `tool/JB_booking/static/js/app.js`
- Modify: `tool/JB_booking/static/css/style.css`
- Modify: `tool/JB_booking/index.html`
- Test: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Return projection keys and bounds**

In `projectSceneLayout()`, return:

```js
{
    x,
    y,
    width,
    height,
    gridRow: group.userData.gridRow,
    gridColumn: group.userData.gridColumn,
    projectionKey: group.userData.projectionKey,
}
```

- [ ] **Step 2: Position tester buttons**

Keep each button centered on the projected tester group. Keep the existing tester name, status, hover, focus, and click handler.

- [ ] **Step 3: Position static text**

Use `projectionKey` to align:

- `走道`
- `PC/設備/烤箱`
- `管線`
- UF3000
- 點針座1／2
- Auto Hander

Set the DOM block background and border to transparent because the visible layer is now Three.js:

```css
.floor-static-block.is-3d-projected {
    border: 0;
    background: transparent;
    box-shadow: none;
    pointer-events: none;
}
```

- [ ] **Step 4: Remove obsolete fixed-offset helpers**

Remove `MIDDLE_ZONE_OFFSET_PERCENT`, `LOWER_ZONE_OFFSET_PERCENT`, `LOWER_WALKWAY_OFFSET_PERCENT`, `getFloorPlanStaticOffset()`, and row-specific DOM top offsets. The seven-column grid becomes the single source of presentation position.

- [ ] **Step 5: Update asset versions**

Use one matching cache version in `index.html` and the dynamic Three.js import.

### Task 6: Verify and preview

**Files:**
- Test: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`
- Test: `tool/JB_booking/design-preview/route.test.mjs`

- [ ] **Step 1: Run complete targeted verification**

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

- [ ] **Step 2: Open isolated preview**

```text
http://127.0.0.1:4181/index.html?preview=seven-column-grid
```

Confirm every row and blank cell matches the approved table, labels do not collide with walkways or pipelines, all 21 tester buttons remain clickable, and no new console error appears.

- [ ] **Step 3: Commit after user confirmation**

```powershell
git add tool\JB_booking\index.html tool\JB_booking\static\css\style.css tool\JB_booking\static\js\app.js tool\JB_booking\static\js\floor-plan-3d.js tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
git commit -m "Build seven-column JB Booking floor grid"
```
