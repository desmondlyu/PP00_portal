const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Black Screen Prevention: simulation updates are isolated from canvas rendering', () => {
  const appCode = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // 1. Check simulation try/catch block
  assert.ok(
    appCode.includes('// 1. 遊戲邏輯與網路模擬階段（獨立捕捉異常，避免中斷 Canvas 畫面渲染）'),
    'gameLoop must separate simulation phase with isolated try/catch'
  );
  assert.ok(
    appCode.includes('console.warn(\'Simulation tick error (isolated):\', simErr);'),
    'gameLoop must catch simulation errors without aborting rendering'
  );

  // 2. Check rendering try/catch block
  assert.ok(
    appCode.includes('// 2. Canvas 畫面渲染階段（保證每幀繪製世界地圖、人物、光影與雷達）'),
    'gameLoop must guarantee canvas rendering in dedicated block'
  );
  assert.ok(
    appCode.includes('catch (loopErr)'),
    'gameLoop render must catch loop errors and schedule next animation frame'
  );
  assert.ok(
    appCode.includes('finally {\r\n      requestAnimationFrame(gameLoop);') ||
    appCode.includes('finally {\n      requestAnimationFrame(gameLoop);'),
    'gameLoop must schedule requestAnimationFrame in finally block'
  );

  // 3. Canvas context state stack safety with try ... finally { ctx.restore(); }
  assert.ok(
    appCode.includes('ctx.save();\r\n      try {') || appCode.includes('ctx.save();\n      try {'),
    'ctx.save() must be guarded with try...finally to ensure ctx.restore() is always called'
  );
  assert.ok(
    appCode.includes('} finally {\r\n        ctx.restore();') || appCode.includes('} finally {\n        ctx.restore();'),
    'ctx.restore() must be guaranteed in finally block'
  );

  // 4. Camera NaN & Non-finite protection
  assert.ok(
    appCode.includes('Number.isFinite(camera.zoom)'),
    'camera.zoom must be checked for finite value'
  );
  assert.ok(
    appCode.includes('Number.isFinite(localPlayer.x)'),
    'localPlayer.x must fall back if non-finite'
  );
  assert.ok(
    appCode.includes('Number.isFinite(localPlayer.y)'),
    'localPlayer.y must fall back if non-finite'
  );
  assert.ok(
    appCode.includes('!Number.isFinite(camera.x)'),
    'camera.x must have non-finite fallback'
  );
  assert.ok(
    appCode.includes('!Number.isFinite(camera.y)'),
    'camera.y must have non-finite fallback'
  );

  // 5. Defensive optional chaining for external modules
  assert.ok(
    appCode.includes('window.OfficeFacilities?.nearby?.(localPlayer,season.client?.snapshot)'),
    'OfficeFacilities.nearby must be safely optional chained'
  );
  assert.ok(
    appCode.includes('window.OfficeProgression?.speed'),
    'OfficeProgression.speed must have fallback check'
  );
  assert.ok(
    appCode.includes('window.OfficeProgression?.pickupRadius'),
    'OfficeProgression.pickupRadius must have fallback check'
  );
  assert.ok(
    appCode.includes('window.OfficeHunt?.clock?.()?.active'),
    'OfficeHunt.clock().active must be safely guarded with optional chaining'
  );
  assert.ok(
    appCode.includes('window.OfficeCombat?.reactionPose'),
    'OfficeCombat.reactionPose must have fallback check'
  );
  assert.ok(
    appCode.includes('window.OfficeCombat?.defeatVisible'),
    'OfficeCombat.defeatVisible must have fallback check'
  );

  // 6. ctx.roundRect fallback protection
  assert.ok(
    appCode.includes("typeof ctx.roundRect === 'function'"),
    'ctx.roundRect must have fallback check for browsers without native support'
  );
});

test('Injury Coordinates and Recovery state clearing', () => {
  const appCode = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // Verify that recovery location verifies finite numbers
  assert.ok(
    appCode.includes('!Number.isFinite(spot.x) || !Number.isFinite(spot.y)'),
    'onRecoveryLocation must validate finite coordinates'
  );

  // Verify that snapshot application sets finite coordinates
  assert.ok(
    appCode.includes('Number.isFinite(p.x) && Number.isFinite(p.y)'),
    'applySeasonSnapshot must ensure snapshot coordinates are finite'
  );

  // Verify that injury reset clears injuredX and injuredY
  assert.ok(
    appCode.includes('localPlayer.injuredX = null; localPlayer.injuredY = null;'),
    'Injury recovery must reset injuredX and injuredY to null'
  );
});
