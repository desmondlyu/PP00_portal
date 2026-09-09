# JB Booking Lower Row Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate the lower two equipment rows and place first-row labels above their 3D objects without changing Booking data or machine coordinates.

**Architecture:** Add presentation-only row metadata to the Three.js projection payload. The existing DOM buttons and equipment labels keep their click/data responsibilities, while `renderFloorPlan()` applies row-specific label placement from the projected metadata.

**Tech Stack:** Vanilla JavaScript, Three.js r186, CSS, Node.js contract tests.

---

### Task 1: Define lower-row projection contracts

**Files:**
- Modify: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`
- Test: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Write failing source and layout contracts**

Add assertions requiring:

```js
assert.match(floorPlan3dSource, /LOWER_FIRST_ROW_Y/);
assert.match(floorPlan3dSource, /LOWER_SECOND_ROW_Y/);
assert.match(floorPlan3dSource, /LOWER_SECOND_ROW_GAP_PERCENT/);
assert.match(floorPlan3dSource, /labelPlacement/);
assert.match(appSource, /labelPlacement === 'above'/);
assert.match(appSource, /lower-equipment-label-above/);
```

Also assert the immutable tester grouping:

```js
assert.equal(
    JSON.stringify(
        layout.slots
            .filter(({ y }) => y === 71.5)
            .map(({ tester }) => tester),
    ),
    JSON.stringify([
        'T5833-6(.98)',
        'T5833-1(.80)',
        'T5830ES_WBN8(.75)',
    ]),
);

assert.equal(
    JSON.stringify(
        layout.slots
            .filter(({ y }) => y === 78.5)
            .map(({ tester }) => tester),
    ),
    JSON.stringify([
        'T5781-3(.33)',
        'T5781-2(.32)',
    ]),
);
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
```

Expected: FAIL because row metadata and above-label handling do not exist.

- [ ] **Step 3: Commit the failing contract**

```powershell
git add tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
git commit -m "test: specify lower floor row spacing"
```

### Task 2: Separate rows and reposition labels

**Files:**
- Modify: `tool/JB_booking/static/js/floor-plan-3d.js`
- Modify: `tool/JB_booking/static/js/app.js`
- Modify: `tool/JB_booking/static/css/style.css`
- Modify: `tool/JB_booking/index.html`
- Test: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Add row-specific presentation constants**

In `floor-plan-3d.js`, add:

```js
const LOWER_FIRST_ROW_Y = 71.5;
const LOWER_SECOND_ROW_Y = 78.5;
const LOWER_SECOND_ROW_GAP_PERCENT = 5;
```

Keep the first row at its current post-clamp position. Apply the additional world-space delta only when `y >= LOWER_SECOND_ROW_Y`:

```js
function getSecondRowOffset(y) {
    return y >= LOWER_SECOND_ROW_Y
        ? percentDeltaToWorld(LOWER_SECOND_ROW_GAP_PERCENT, WORLD_DEPTH)
        : 0;
}
```

- [ ] **Step 2: Add projection label metadata**

Set machine group metadata:

```js
group.userData.labelPlacement =
    machine.y === LOWER_FIRST_ROW_Y ? 'above' : 'below';
```

Set lower equipment metadata:

```js
group.userData.labelPlacement =
    blockDef.y === LOWER_FIRST_ROW_Y ? 'above' : 'below';
```

Include `labelPlacement` in `projectSceneLayout()` for machine and static block positions.

- [ ] **Step 3: Apply DOM label placement**

In `app.js`, read the projected metadata. For first-row tester buttons, subtract the label height and a small gap from projected Y:

```js
const labelOffset = position.labelPlacement === 'above'
    ? FLOOR_PLAN_BLOCK_SIZE.h + 1.2
    : FLOOR_PLAN_BLOCK_SIZE.h / 2;
button.style.top = `${(position.y / height) * 100 - labelOffset}%`;
```

For first-row UF3000 labels, toggle:

```js
block.classList.toggle(
    'lower-equipment-label-above',
    position.labelPlacement === 'above',
);
```

Apply a matching projected top offset without changing the original static block definition.

- [ ] **Step 4: Add label presentation CSS**

In `style.css`, add:

```css
.floor-static-block.device-label.lower-equipment-label-above {
    transform: translateY(-100%);
}
```

Do not change pointer events, tester button handlers, or booking-state classes.

- [ ] **Step 5: Update asset cache versions**

Update the query strings in `tool/JB_booking/index.html` and the dynamic Three.js import in `app.js` to the same new version.

- [ ] **Step 6: Run targeted verification**

Run:

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

- [ ] **Step 7: Verify local preview**

Open:

```text
http://127.0.0.1:4181/index.html?preview=lower-row-spacing
```

Check:

1. First row does not cover the lowest walkway.
2. First-row tester and UF3000 labels are above their objects.
3. Second row is visibly lower and labels do not collide with the first row.
4. All 21 tester buttons remain available.
5. Tester clicks still open the original Booking modal.

- [ ] **Step 8: Commit**

```powershell
git add tool\JB_booking\index.html tool\JB_booking\static\css\style.css tool\JB_booking\static\js\app.js tool\JB_booking\static\js\floor-plan-3d.js tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
git commit -m "Improve lower floor row spacing"
```
