const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '../static/js');
function game() {
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
  vm.createContext(context);
  for (const name of ['config', 'world']) vm.runInContext(fs.readFileSync(path.join(root, name + '.js'), 'utf8'), context);
  let source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  source = source.replace("  window.addEventListener('DOMContentLoaded', init);", `
    isLoggedIn = true;
    network = {broadcastPacket() {}, getPublicState: () => localPlayer, getAllOtherPlayers: () => []};
    ecosystem = {groundItems: []};
    updatePoseLabelUI = () => {}; updateInjuryCountdownHUD = () => {}; pushStatusLog = () => {};
    window.game = {player: localPlayer, keys, move: updateLocalPlayerMovement, start: startContextualAction, setupTouch: setupTouchControls};
  `);
  vm.runInContext(source, context);
  context.window.isPositionBlocked = () => false;
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
  g.keys.d = true; g.move(); assert.equal(g.player.x, 400); assert.equal(g.player.actionState, 'sleep_bed');
});
