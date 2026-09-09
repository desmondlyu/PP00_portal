# JB Booking Browser Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the JB Booking Floor Plan from becoming ultra-wide and misaligning machines and labels when browser zoom is below 100%.

**Architecture:** Keep the existing Three.js projection and DOM overlay synchronization unchanged. Constrain the shared Floor Plan canvas to its established `1520px × 760px` maximum logical size and center it inside wider containers, so every visual layer continues to use the same stable aspect ratio.

**Tech Stack:** CSS, JavaScript source-contract tests, Playwright viewport testing.

---

### Task 1: Add a failing zoom-stability contract

**Files:**
- Modify: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: Add CSS source assertions**

Add beside the existing CSS presentation assertions:

```js
assert.match(
    cssSource,
    /\.floor-plan-canvas\s*\{[\s\S]*?max-width:\s*1520px;/,
    'Floor Plan should stop growing beyond its designed 2:1 canvas width',
);
assert.match(
    cssSource,
    /\.floor-plan-canvas\s*\{[\s\S]*?margin-inline:\s*auto;/,
    'Floor Plan should remain centered when the viewport becomes wider',
);
```

- [ ] **Step 2: Run the contract and verify it fails**

Run:

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
```

Expected: FAIL because `.floor-plan-canvas` has no `max-width` or
`margin-inline` declarations.

### Task 2: Constrain the shared Floor Plan canvas

**Files:**
- Modify: `tool/JB_booking/static/css/style.css`

- [ ] **Step 1: Add the maximum logical width and centering**

Update the main `.floor-plan-canvas` rule:

```css
.floor-plan-canvas {
    width: 100%;
    max-width: 1520px;
    margin-inline: auto;
    min-height: 560px;
    height: clamp(560px, 62vw, 760px);
    /* Keep the existing border, background, position, overflow, and shadow. */
}
```

This keeps the current appearance near the designed desktop width. At browser
zoom below 100%, excess horizontal space remains outside the centered canvas
instead of stretching the Three.js host and percentage-based DOM overlays.

- [ ] **Step 2: Preserve the small-screen rule**

Keep the existing mobile declarations unchanged:

```css
.floor-plan-canvas {
    min-width: 900px;
    min-height: 560px;
}
```

The existing `.floor-plan-view { overflow-x: auto; }` continues to provide
horizontal scrolling on small screens.

- [ ] **Step 3: Run the focused contract**

Run:

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
```

Expected: PASS.

### Task 3: Refresh and verify browser zoom behavior

**Files:**
- Modify: `tool/JB_booking/index.html`

- [ ] **Step 1: Update the stylesheet cache version**

Change only the `style.css` query string to:

```html
<link rel="stylesheet" href="./static/css/style.css?v=20260909-1922">
```

- [ ] **Step 2: Run complete focused validation**

Run:

```powershell
node tool\JB_booking\design-preview\threejs-floor-contract.test.mjs
node --check tool\JB_booking\static\js\app.js
node --check tool\JB_booking\static\js\floor-plan-3d.js
git diff --check
```

Expected: all commands pass.

- [ ] **Step 3: Compare normal and ultra-wide viewports**

Open the local preview at both viewport sizes:

```text
1920 × 1000
3840 × 1000
```

At each size, record:

```js
document.querySelector('.floor-plan-canvas').getBoundingClientRect()
```

Expected:

- normal viewport: canvas uses available width up to `1520px`;
- ultra-wide viewport: canvas width remains at or below `1520px`;
- canvas remains horizontally centered;
- machines, tester overlays, floor layers, and dashed frames remain aligned;
- all 21 tester controls remain visible;
- no new console errors appear.

- [ ] **Step 4: Leave implementation uncommitted for approval**

Do not merge or push until the corrected preview is approved.
