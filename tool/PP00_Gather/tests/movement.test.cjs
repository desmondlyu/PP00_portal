const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '../static/js');
function game(realCollision = false) {
  const nodes = new Map(); const listeners = {};
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, {style: {}, textContent: '', events: {},
      classList: {add() {}, toggle: () => true}, setAttribute() {},
      addEventListener(name, fn) { this.events[name] = fn; }, setPointerCapture() {},
      getBoundingClientRect: () => ({left: 0, top: 0, width: 112, height: 112})});
    return nodes.get(id);
  };
  const context = {console, setTimeout: () => 0, clearTimeout() {}, localStorage: {getItem: () => null},
    document: {getElementById: node, querySelectorAll: () => [], addEventListener(n, fn) { listeners[n] = fn; }},
    window: {addEventListener(n, fn) { listeners[n] = fn; }, matchMedia: () => ({matches: true})}, Date, Math};
  context.window.document = context.document;
  vm.createContext(context);
  for (const name of ['config', 'world']) vm.runInContext(fs.readFileSync(path.join(root, name + '.js'), 'utf8'), context);
  let source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  source = source.replace("  window.addEventListener('DOMContentLoaded', init);", `
    isLoggedIn = true;
    network = {broadcastPacket() {}, getPublicState: () => localPlayer, getAllOtherPlayers: () => []};
    ecosystem = {groundItems: []};
    updatePoseLabelUI = () => {}; updateInjuryCountdownHUD = () => {}; pushStatusLog = () => {}; showToast = () => {};
    window.game = {fitOverview: (width, height) => { canvas = {width, height}; fitOverviewCamera(); return {...camera}; }, player: localPlayer, keys, move: updateLocalPlayerMovement, start: startContextualAction, setupTouch: setupTouchControls};
  `);
  vm.runInContext(source, context);
  if (!realCollision) context.window.isPositionBlocked = () => false;
  const g = context.window.game;
  g.player.x = 1100; g.player.y = 800;
  return {g, window: context.window, nodes, listeners};
}
for (const action of ['sit_code', 'toilet', 'wash_hands', 'drink_coffee', 'slack_nap', 'sleep_bed', 'daydream', 'pray_kuaikuai', 'watch_stock', 'sweep_floor', 'victory_dance', 'zen_debug', 'meeting_discuss', 'cry', 'cheer_stock', 'golf_putt']) {
  test(`${action}: movement cancels pose and moves immediately`, () => {
    const {g} = game(); g.player.actionState = action; g.keys.d = true;
    g.move(); assert.equal(g.player.actionState, null); assert(g.player.x > 1100);
  });
}
test('an active pose suppresses old auto navigation', () => {
  const {g} = game(); g.player.actionState = 'sleep_bed'; g.player.autoWalkTarget = {x: 1500, y: 800};
  g.move(); assert.equal(g.player.x, 1100); assert.equal(g.player.isMoving, false);
});
test('starting a pose clears navigation and moving flag', () => {
  const {g} = game(); g.player.autoWalkTarget = {x: 1500, y: 800}; g.player.isMoving = true;
  g.start('sleep_bed'); assert.equal(g.player.autoWalkTarget, null); assert.equal(g.player.isMoving, false);
});
test('walking out releases toilet and occupied seat', () => {
  const {g, window} = game(); const stall = window.WORLD_MAP.toiletStalls[0];
  stall.occupiedBy = g.player.id; g.player.occupiedSpotId = stall.id; g.player.actionState = 'toilet';
  g.keys.w = true; g.move(); assert.equal(stall.occupiedBy, null); assert.equal(g.player.occupiedSpotId, null);
});

test('touch drag cancels pose and moves; pointer cancellation stops movement', () => {
  const {g, nodes} = game(); g.setupTouch();
  const pad = nodes.get('touchMovePad');
  const event = {pointerId: 1, clientX: 100, clientY: 56, preventDefault() {}};
  g.player.actionState = 'sleep_bed'; pad.events.pointerdown(event); g.move();
  assert.equal(g.player.actionState, null); assert(g.player.x > 1100);
  pad.events.pointercancel(event); const x = g.player.x; g.move(); assert.equal(g.player.x, x);
});
test('window blur clears both keyboard and touch movement', () => {
  const {g, nodes, listeners} = game(); g.setupTouch(); g.keys.d = true;
  nodes.get('touchMovePad').events.pointerdown({pointerId: 2, clientX: 100, clientY: 56, preventDefault() {}});
  listeners.blur(); g.move(); assert.equal(g.player.x, 1100); assert.equal(g.player.isMoving, false);
});
test('injury recovery cannot be bypassed by keyboard movement', () => {
  const {g} = game(); g.player.isInjured = true; g.player.injuredUntil = Date.now() + 100000;
  g.keys.d = true; g.move(); assert.equal(g.player.x, 1100); assert.equal(g.player.actionState, 'sleep_bed');
});

test('expired guard detention exits a closed stall and clears occupancy before movement', () => {
  const {g, window} = game(true);
  const stall = window.WORLD_MAP.toiletStalls[0];
  g.player.x = stall.seatX; g.player.y = stall.seatY;
  stall.occupiedBy = g.player.id; stall.doorOpen = 0;
  g.player.actionState = 'toilet'; g.player.occupiedSpotId = stall.id;
  g.player.isRestrained = true; g.player.restrainedUntil = Date.now() - 1;
  g.move();
  assert.equal(g.player.isRestrained, false);
  assert.equal(g.player.restrainedUntil, 0);
  assert.equal(g.player.actionState, null);
  assert.equal(g.player.occupiedSpotId, null);
  assert.equal(stall.occupiedBy, null);
  assert.equal(g.player.x, stall.x - 28);
  assert.equal(g.player.y, stall.y + 48);
  assert.equal(window.isPositionBlocked(g.player.x, g.player.y, 14, g.player.id), false);
  const x = g.player.x; g.keys.a = true; g.move();
  assert(g.player.x < x, 'movement resumes outside the stall');
});
test('guard detention still prevents early movement', () => {
  const {g, window} = game(true);
  const stall = window.WORLD_MAP.toiletStalls[0];
  g.player.x = stall.seatX; g.player.y = stall.seatY;
  stall.occupiedBy = g.player.id;
  g.player.actionState = 'toilet'; g.player.isRestrained = true;
  g.player.restrainedUntil = Date.now() + 10000;
  g.keys.a = true; g.move();
  assert.equal(g.player.x, stall.seatX);
  assert.equal(g.player.isRestrained, true);
  assert.equal(stall.occupiedBy, g.player.id);
});

for (const [width, height, hudBottom, dockTop] of [[390, 800, 160, 730], [844, 346, 190, 280], [320, 696, 350, 630]]) {
  test(`overview fits between HUD and controls at ${width}x${height}`, () => {
    const {g, window} = game();
    window.innerWidth = width;
    // Use actual world dimensions and the same camera transform as the renderer.
    const document = window.document;
    document.querySelector = selector => ({getBoundingClientRect: () => selector === '.mobile-hud-stack' ? {bottom: hudBottom} : {top: dockTop}});
    const camera = g.fitOverview(width, height);
    const x = -camera.x * camera.zoom, y = -camera.y * camera.zoom;
    const right = x + window.WORLD_MAP.width * camera.zoom;
    const bottom = y + window.WORLD_MAP.height * camera.zoom;
    assert(x >= 8 - 1e-6 && right <= width - 8 + 1e-6);
    assert(y >= hudBottom + 8 - 1e-6 && bottom <= dockTop - 8 + 1e-6);
    assert(Math.abs((y + bottom) / 2 - (hudBottom + dockTop) / 2) < 1e-6);
    assert(Math.abs((x + right) / 2 / camera.zoom + camera.x - window.WORLD_MAP.width / 2) < 1e-6);
  });
}
