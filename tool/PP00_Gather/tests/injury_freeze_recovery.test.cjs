const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('Critical Injury & Freeze Prevention: emergency revive button and loop protection', () => {
  const appCode = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // 1. gameLoop is protected with try...catch...finally to guarantee requestAnimationFrame
  assert.ok(appCode.includes('try {'), 'gameLoop must have try block');
  assert.ok(appCode.includes('catch (loopErr)'), 'gameLoop must catch loop errors');
  assert.ok(appCode.includes('finally {\r\n      requestAnimationFrame(gameLoop);') || appCode.includes('finally {\n      requestAnimationFrame(gameLoop);'), 'gameLoop must schedule requestAnimationFrame in finally block');

  // 2. updateInjuryCountdownHUD creates interactive banner with emergency revive button
  assert.ok(appCode.includes("hud.style.pointerEvents = 'auto'"), 'HUD banner must have pointerEvents: auto for clickability');
  assert.ok(appCode.includes('btnEmergencyRevive'), 'HUD banner must include btnEmergencyRevive');
  assert.ok(appCode.includes('✨ 立即急救甦醒 (緊急脫困)'), 'HUD banner must have emergency escape label');

  // 3. emergencyReviveLocalPlayer function exists and clears injury state
  assert.ok(appCode.includes('function emergencyReviveLocalPlayer()'), 'emergencyReviveLocalPlayer function must exist');
  assert.ok(appCode.includes('window.emergencyReviveLocalPlayer = emergencyReviveLocalPlayer'), 'emergencyReviveLocalPlayer must be exposed globally');

  // 4. updateLocalPlayerMovement handles isInjured at the top before speed === 0
  const moveFnIdx = appCode.indexOf('function updateLocalPlayerMovement()');
  const injuredCheckIdx = appCode.indexOf('if (localPlayer.isInjured) {', moveFnIdx);
  const speedZeroIdx = appCode.indexOf('if(localPlayer.speed===0', moveFnIdx);
  assert.ok(injuredCheckIdx > 0 && injuredCheckIdx < speedZeroIdx, 'isInjured must be checked before speed === 0 early return');
});

test('emergencyReviveLocalPlayer execution clears injury and unlocks movement', () => {
  const root = path.join(__dirname, '../static/js');
  const nodes = new Map();
  const listeners = {};
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, {
      id,
      style: {},
      textContent: '',
      events: {},
      classList: { add() {}, toggle: () => true },
      setAttribute() {},
      querySelector() { return null; },
      appendChild() {},
      addEventListener(name, fn) { this.events[name] = fn; },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 112, height: 112 })
    });
    return nodes.get(id);
  };
  const context = {
    console,
    setTimeout: () => 0,
    clearTimeout() {},
    localStorage: { getItem: () => null, setItem() {} },
    document: {
      getElementById: node,
      createElement: (tag) => node(tag + '_' + Math.random()),
      querySelectorAll: () => [],
      body: { appendChild() {}, classList: { toggle() {}, add() {}, remove() {} } },
      addEventListener(n, fn) { listeners[n] = fn; }
    },
    window: {
      addEventListener(n, fn) { listeners[n] = fn; },
      matchMedia: () => ({ matches: true }),
      WORLD_MAP: { width: 3000, height: 2000 },
      isPositionBlocked: () => false
    },
    Date,
    Math
  };
  context.window.document = context.document;
  vm.createContext(context);
  for (const name of ['config', 'world']) {
    vm.runInContext(fs.readFileSync(path.join(root, name + '.js'), 'utf8'), context);
  }
  context.window.GATHER_CONFIG.season2 = false;

  let source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  source = source.replace("  window.addEventListener('DOMContentLoaded', init);", `
    isLoggedIn = true;
    network = {
      clientId: 'tester_client',
      broadcastPacket() {},
      getPublicState: () => localPlayer,
      getAllOtherPlayers: () => []
    };
    ecosystem = { groundItems: [] };
    updatePoseLabelUI = () => {};
    pushStatusLog = () => {};
    showToast = () => {};
    window.game = {
      player: localPlayer,
      keys,
      move: updateLocalPlayerMovement,
      revive: emergencyReviveLocalPlayer
    };
  `);
  vm.runInContext(source, context);

  const g = context.window.game;
  // Put player into critical injury state
  g.player.isInjured = true;
  g.player.injuredUntil = Date.now() + 300000;
  g.player.actionState = 'sleep_bed';
  g.player.x = 1100;
  g.player.y = 800;

  // Moving should be blocked while injured
  g.keys.d = true;
  g.move();
  assert.equal(g.player.isInjured, true);
  assert.equal(g.player.actionState, 'sleep_bed');
  assert.equal(g.player.x, 1100);

  // Trigger emergency revival
  g.revive();
  assert.equal(g.player.isInjured, false);
  assert.equal(g.player.injuredUntil, 0);
  assert.equal(g.player.actionState, null);

  // Now movement should be unblocked immediately!
  g.move();
  assert.ok(g.player.x > 1100, 'Movement must resume immediately after emergency revival');
});
