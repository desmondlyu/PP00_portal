# JB Booking Top Walkway Offset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move only the first walkway below the upper dashed line while preserving every other row and all Booking behavior.

**Architecture:** Add one presentation-only Z offset for visual-grid row `0` after vertical-fill row centers are calculated. The walkway mesh and DOM label already share the row projection, so both move together without changing any machine or other environmental row.

**Tech Stack:** JavaScript ES modules, Three.js, Node.js contract tests, Playwright local preview.

---

### Task 1: Lock the top-walkway offset contract

**Files:**
- Modify: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Add failing source assertions**

```js
assert.match(
    floorPlan3dSource,
    /const TOP_WALKWAY_Z_OFFSET = 0\.85;/,
    'the first walkway should have its own downward visual offset',
);
assert.match(
    floorPlan3dSource,
    /row\.index === 0 \? TOP_WALKWAY_Z_OFFSET : 0/,
    'only visual-grid row zero should receive the offset',
);
```

- [ ] **Step 2: Run the contract test**

Run:

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
```

Expected: FAIL because `TOP_WALKWAY_Z_OFFSET` does not exist.

### Task 2: Move only visual-grid row zero

**Files:**
- Modify: `tool/JB_booking/static/js/floor-plan-3d.js`

- [ ] **Step 1: Add the presentation-only constant**

Add beside the visual-grid constants:

```js
const TOP_WALKWAY_Z_OFFSET = 0.85;
```

- [ ] **Step 2: Apply the offset after vertical fill**

Inside the `rawRows.map()` that creates the final `rows`, use:

```js
const rowOffset = row.index === 0 ? TOP_WALKWAY_Z_OFFSET : 0;
return {
    ...row,
    centerZ: frameCenterZ + (
        rawCenterZ - rawGridCenterZ
    ) * GRID_VERTICAL_FILL_SCALE + rowOffset,
};
```

Do not modify any other row, machine group, environmental layer size,
horizontal position, camera setting, or Booking-related code.

- [ ] **Step 3: Run focused validation**

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

- [ ] **Step 1: Update the cache version**

Use `20260909-1858` for `style.css`, `app.js`, and the dynamic
`floor-plan-3d.js` import.

- [ ] **Step 2: Run complete focused checks**

Run:

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
node tool\JB_booking\design-preview\route.test.mjs
node --check tool\JB_booking\static\js\app.js
node --check tool\JB_booking\static\js\floor-plan-3d.js
git diff --check
```

Expected: all commands pass.

- [ ] **Step 3: Inspect the preview**

Open:

```text
http://127.0.0.1:4181/index.html?preview=top-walkway-offset
```

Confirm:

- the first walkway is completely below the dashed line;
- a visible gap remains above the PC/equipment/oven layer;
- rows `1` through `10` did not move;
- all 21 tester controls remain present;
- no new JavaScript errors appear.

- [ ] **Step 4: Tune only the top-walkway offset if necessary**

Adjust `TOP_WALKWAY_Z_OFFSET` in `0.05` increments only. Do not alter the
vertical-fill scale or any other row center.

- [ ] **Step 5: Leave implementation uncommitted**

Do not merge, push, or commit production visual changes until the user approves
the preview.
