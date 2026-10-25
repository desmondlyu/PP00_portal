const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('hunt mode alert: center beacon banner with fadeout, top-right countdown, and edge glow', () => {
  const huntCode = fs.readFileSync(path.join(__dirname, '../static/js/hunt.js'), 'utf8');
  assert.ok(huntCode.includes('hunt-start-icon'), 'hunt banner must include alert beacon icon');
  assert.ok(huntCode.includes('警告：鳥人指揮官追殺模式啟動'), 'hunt banner must have exact warning title');
  assert.ok(huntCode.includes('fade-out'), 'hunt banner must apply fade-out class before removal');
  assert.ok(huntCode.includes('document.body.classList.toggle(\'hunt-active\''), 'must toggle hunt-active on body for edge glow');
});

test('status messages and HUD banners are positioned at top-right, not center-top', () => {
  const css = fs.readFileSync(path.join(__dirname, '../static/css/style.css'), 'utf8');
  const appCode = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // 1. gather-toast-container must be top-right
  const toastMatch = css.match(/\.gather-toast-container\s*\{([^}]+)\}/);
  assert.ok(toastMatch, 'gather-toast-container must exist');
  assert.ok(toastMatch[1].includes('right:'), 'toast container must position to right');
  assert.ok(toastMatch[1].includes('left: auto'), 'toast container must not center to left: 50%');
  assert.ok(toastMatch[1].includes('align-items: flex-end'), 'toast items must align to flex-end');

  // 2. huntHud must be top-right
  const huntHudMatch = css.match(/#huntHud\s*\{([^}]+)\}/);
  assert.ok(huntHudMatch, 'huntHud must exist');
  assert.ok(huntHudMatch[1].includes('right:'), 'huntHud must position to right');
  assert.ok(huntHudMatch[1].includes('left: auto'), 'huntHud must not center to left: 50%');

  // 3. berserk-warning-modal must be top-right
  const berserkMatch = css.match(/\.berserk-warning-modal\s*\{([^}]+)\}/);
  assert.ok(berserkMatch, 'berserk-warning-modal must exist');
  assert.ok(berserkMatch[1].includes('right:'), 'berserk modal must position to right');
  assert.ok(berserkMatch[1].includes('left: auto'), 'berserk modal must not center to left: 50%');

  // 4. injuryHudBanner in app.js must position to top-right
  assert.ok(appCode.includes("hud.style.right = '16px'"), 'injury HUD banner must position to right: 16px');
  assert.ok(appCode.includes("hud.style.left = 'auto'"), 'injury HUD banner must clear left centering');
});

test('overview map can be toggled and closed via button, function, and Escape key', () => {
  const appCode = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // overview close bar and setOverviewMode
  assert.ok(appCode.includes('function setOverviewMode'), 'setOverviewMode function must exist');
  assert.ok(appCode.includes('overviewCloseBar'), 'overviewCloseBar must exist for exit affordance');
  assert.ok(appCode.includes('btnExitOverview'), 'btnExitOverview close button must exist');
  assert.ok(appCode.includes("e.key === 'Escape'"), 'Escape key must be listened to close overviewMode');
  assert.ok(appCode.includes('setOverviewMode(false)'), 'Escape key must trigger setOverviewMode(false)');

  // minimap radar supports minimapHidden flag and close icon
  assert.ok(appCode.includes('camera.minimapHidden'), 'camera must support minimapHidden flag');
  assert.ok(appCode.includes("camera.minimapHidden = true"), 'minimap must allow closing via close click');
});
