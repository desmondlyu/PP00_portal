# JB Booking PC/設備/烤箱走道底色 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `PC/設備/烤箱` static layer use the exact same background texture as the existing `走道` layer while preserving its text and position.

**Architecture:** Keep the existing `FLOOR_PLAN_STATIC_BLOCKS` data and `renderFloorPlan()` flow unchanged except for adding a presentation-only class to the PC layer. Add a more specific CSS rule that reuses the walkway background and removes only the PC-specific border, fill, and shadow. No Three.js, booking, data, or click behavior changes.

**Tech Stack:** Existing vanilla JavaScript, CSS, Node.js contract tests, Playwright local preview.

---

## File map

- Modify: `tool/JB_booking/static/js/app.js`
  - Add `pc-equipment-layer` only when `blockDef.label === 'PC/設備/烤箱'`.
  - Preserve the existing label, coordinates, dimensions, and static block index.
- Modify: `tool/JB_booking/static/css/style.css`
  - Add the PC-specific override after the existing `.floor-static-block.device` rule.
  - Use the exact `走道` repeating-linear-gradient.
  - Remove the PC-specific border and shadow without changing other device labels.
- Modify: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`
  - Add source contracts for the presentation class and shared walkway background.
- Modify: `docs/superpowers/specs/2026-09-09-jb-booking-pc-walkway-color-design.md`
  - Already approved; keep it as the design reference.

## Task 1: Add the failing presentation contract

**Files:**
- Modify: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Add assertions for the PC presentation class and shared background**

Add these assertions after the existing CSS contract checks:

```js
assert.match(appSource, /pc-equipment-layer/);
assert.match(cssSource, /\.floor-static-block\.device\.pc-equipment-layer/);
assert.match(
    cssSource,
    /background:\s*repeating-linear-gradient\(\s*90deg,\s*rgba\(139,\s*198,\s*190,\s*0\.035\)\s*0\s*24px,\s*rgba\(173,\s*231,\s*219,\s*0\.065\)\s*24px\s*25px\)/,
);
assert.match(
    cssSource,
    /\.floor-static-block\.device\.pc-equipment-layer[\s\S]{0,300}border:\s*none[\s\S]{0,300}box-shadow:\s*none/,
);
```

- [ ] **Step 2: Run the contract to verify it fails for the missing class**

Run:

```powershell
Set-Location C:\D_BACKUP\AI_Project\web_app\PP00_Portal\.worktrees\jb-booking-playful
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
```

Expected: FAIL because `pc-equipment-layer` does not yet exist.

- [ ] **Step 3: Commit the failing contract**

```powershell
git add tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
git commit -m "test: specify pc walkway color contract" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 2: Add the presentation-only class

**Files:**
- Modify: `tool/JB_booking/static/js/app.js`

- [ ] **Step 1: Add the class without changing mapping**

Update only the class-name expression in the static block creation:

```js
block.className = `floor-static-block ${
    blockDef.kind || 'machine'
}${
    blockDef.kind === 'device' && blockDef.label !== 'PC/設備/烤箱'
        ? ' device-label'
        : ''
}${
    blockDef.label === 'PC/設備/烤箱' ? ' pc-equipment-layer' : ''
}`;
```

Do not change `blockDef.x`, `blockDef.y`, `blockDef.w`, `blockDef.h`, `blockIndex`, `staticBlockElements`, or `onLayout`.

## Task 3: Match the walkway visual treatment

**Files:**
- Modify: `tool/JB_booking/static/css/style.css`

- [ ] **Step 1: Add the specific PC override after `.floor-static-block.device`**

Add:

```css
.floor-static-block.device.pc-equipment-layer {
    border: none;
    background: repeating-linear-gradient(
        90deg,
        rgba(139, 198, 190, 0.035) 0 24px,
        rgba(173, 231, 219, 0.065) 24px 25px
    );
    color: rgba(206, 237, 237, 0.19);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.25em;
    box-shadow: none;
}
```

This intentionally matches the existing `.floor-static-block.walkway` visual values and leaves the generic `.device` style unchanged for other devices.

- [ ] **Step 2: Run the contract and syntax checks**

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

- [ ] **Step 3: Commit the implementation**

```powershell
git add tool\JB_booking\static\js\app.js tool\JB_booking\static\css\style.css
git commit -m "style: match pc equipment layer to walkway" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 4: Verify the isolated browser preview

**Files:**
- No additional source files.

- [ ] **Step 1: Reload the local preview**

Open:

```text
http://127.0.0.1:4181/index.html
```

- [ ] **Step 2: Verify the rendered presentation**

Confirm:

1. `PC/設備/烤箱` text remains present and centered.
2. Its computed background matches the walkway repeating-linear-gradient.
3. Its border is `none`.
4. Its box-shadow is `none`.
5. All four walkway layers remain unchanged.
6. UF3000, 點針座, Auto Hander, tester IDs, and booking click behavior remain unchanged.

- [ ] **Step 3: Capture the updated preview**

Save a screenshot as:

```text
jb-booking-pc-matches-walkway.png
```

The preview remains isolated on branch `design/jb-booking-playful`; do not merge or push.
