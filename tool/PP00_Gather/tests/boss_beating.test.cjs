const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '../static/js');

function setupGame(randomRoll = 0.1) {
  let currentTime = 1000000;
  const nodes = new Map();
  const listeners = {};
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, {
      style: {}, textContent: '', events: {},
      classList: { add() {}, toggle: () => true }, setAttribute() {},
      replaceChildren() {}, querySelectorAll: () => [],
      addEventListener(name, fn) { this.events[name] = fn; }, setPointerCapture() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 112, height: 112 }),
      getContext: () => ({
        save() {}, restore() {}, translate() {}, scale() {}, rotate() {},
        fillRect() {}, clearRect() {}, drawImage() {}, beginPath() {}, closePath() {},
        moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, fill() {}, stroke() {}, strokeRect() {}, roundRect() {}
      }),
    });
    return nodes.get(id);
  };
  const math = Object.create(Math);
  math.random = () => randomRoll;

  const date = {
    now: () => currentTime,
  };

  const context = {
    console, setTimeout: () => 0, clearTimeout() {}, localStorage: { getItem: () => null, setItem: () => {} },
    document: {
      createElement: () => ({ style: {}, classList: { add() {} }, appendChild() {}, textContent: '' }),
      getElementById: node, querySelectorAll: () => [], addEventListener(n, fn) { listeners[n] = fn; }
    },
    window: { addEventListener(n, fn) { listeners[n] = fn; }, matchMedia: () => ({ matches: true }) },
    Date: date, Math: math,
  };
  context.window.document = context.document;
  vm.createContext(context);
  for (const name of ['config', 'world', 'avatars', 'wardrobe', 'combat']) {
    vm.runInContext(fs.readFileSync(path.join(root, name + '.js'), 'utf8'), context);
  }
  // These fixtures cover the retained legacy/offline path; Season 2 server rules have separate tests.
  context.window.GATHER_CONFIG.season2 = false;
  let source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  source = source.replace("  window.addEventListener('DOMContentLoaded', init);", `
    isLoggedIn = true;
    network = {
      clientId: 'usr_test',
      broadcastPacket() {},
      getPublicState: () => localPlayer,
      getAllOtherPlayers: () => [],
      remotePlayers: new Map(),
      npcPlayers: new Map(),
      isRoomMaster: () => true,
    };
    ecosystem = { groundItems: [], mobs: [] };
    updatePoseLabelUI = () => {}; updateInjuryCountdownHUD = () => {}; pushStatusLog = () => {}; showToast = () => {}; appendCombatText = () => true; pushCombatLog = () => {};
    window.game = {
      player: localPlayer,
      keys,
      move: updateLocalPlayerMovement,
      attack: triggerWeaponAttack,
      advance: (ms) => { Date.advance(ms); },
      network,
    };
  `);
  context.Date.advance = (ms) => { currentTime += ms; };
  vm.runInContext(source, context);
  context.window.isPositionBlocked = () => false;
  const g = context.window.game;
  // Give localPlayer a weapon
  const weapon = { uid: 'w1', id: 'bench', name: '折疊板凳', emoji: '🪑', power: 30, durability: 5, maxDurability: 5 };
  g.player.inventory = [weapon];
  g.player.equippedSlots = [weapon, null, null];
  g.player.activeEquipIndex = 0;
  return { g, win: context.window };
}

test('attacking VP with roll < 0.50 drags player to VP office, restrains without severe injury, and plays beating animation', () => {
  const { g, win } = setupGame(0.2); // roll < 0.50
  const vp = { id: 'npc_vp_boss', name: 'NPC:VP大老闆', avatarId: 'npc_vp_uncle', x: 500, y: 500 };
  g.network.npcPlayers.set(vp.id, vp);

  g.player.x = 510;
  g.player.y = 500;
  g.attack();

  // Player and VP transported to VP room (380, 310)
  assert.equal(g.player.x, 380, 'Player teleported to VP office');
  assert.equal(g.player.y, 310, 'Player teleported to VP office');
  assert.equal(vp.x, 380 + 32, 'VP teleported alongside player');
  assert.equal(vp.y, 310);

  // Restrained, but NOT injured!
  assert.equal(g.player.isRestrained, true, 'Player should be restrained');
  assert.equal(g.player.isInjured, false, 'Continuous beating must NOT cause severe injury');
  assert.ok(g.player.beatingSession, 'Beating session must be active');
  assert.equal(win.MEETING_LOCK_STATE.roomId, 'vp_room');
  assert.equal(vp.isBerserk, true, 'VP enters berserk mode');

  // While in beating session, tick triggers beating animations
  for (let i = 0; i < 20; i++) {
    g.move();
  }
  assert.equal(g.player.isInjured, false, 'Still not severely injured during beating');
  assert.equal(g.player.actionState, 'cry', 'Player in cry/pleading pose');

  // Advance time past the session (8000ms)
  g.advance(8500);
  g.move();
  assert.equal(g.player.isRestrained, false, 'Restraint released after session ends');
  assert.equal(g.player.beatingSession, null, 'Beating session cleared');
  assert.equal(g.player.isInjured, false, 'Player recovers unharmed without injury');
  assert.equal(vp.isBerserk, false, 'VP calms down');
});

test('attacking Director PP00 with roll < 0.50 drags player to PP00 office without severe injury', () => {
  const { g, win } = setupGame(0.3); // roll < 0.50
  const dir = { id: 'npc_dir_pp00', name: 'NPC:PP00處長', avatarId: 'npc_dir_pp00_slim', x: 600, y: 600 };
  g.network.npcPlayers.set(dir.id, dir);

  g.player.x = 610;
  g.player.y = 600;
  g.attack();

  assert.equal(g.player.x, 755, 'Player teleported to PP00 office');
  assert.equal(g.player.y, 310, 'Player teleported to PP00 office');
  assert.equal(g.player.isRestrained, true);
  assert.equal(g.player.isInjured, false, 'Must NOT cause severe injury');
  assert.equal(win.MEETING_LOCK_STATE.roomId, 'dir_pp00');
});

test('attacking Cleaner Auntie with roll < 0.50 drags player to restroom without severe injury', () => {
  const { g, win } = setupGame(0.1); // roll < 0.50
  const auntie = { id: 'npc_auntie_meifeng', name: 'NPC:美鳳姐', isSweeper: true, x: 700, y: 700 };
  g.network.npcPlayers.set(auntie.id, auntie);

  g.player.x = 710;
  g.player.y = 700;
  g.attack();

  assert.equal(g.player.x, 2340, 'Player teleported to cleaning restroom');
  assert.equal(g.player.y, 820, 'Player teleported to cleaning restroom');
  assert.equal(g.player.isRestrained, true);
  assert.equal(g.player.isInjured, false, 'Must NOT cause severe injury');
  assert.equal(win.MEETING_LOCK_STATE.roomId, 'restroom');
});

test('attacking with roll >= 0.50 does NOT trigger detention or beating', () => {
  const { g, win } = setupGame(0.6); // roll >= 0.50
  const vp = { id: 'npc_vp_boss', name: 'NPC:VP大老闆', avatarId: 'npc_vp_uncle', x: 500, y: 500 };
  g.network.npcPlayers.set(vp.id, vp);

  g.player.x = 510;
  g.player.y = 500;
  g.attack();

  // Position unchanged, not restrained
  assert.equal(g.player.x, 510);
  assert.equal(g.player.y, 500);
  assert.equal(g.player.isRestrained, false);
  assert.equal(g.player.beatingSession, undefined);
  assert.equal(win.MEETING_LOCK_STATE.roomId, null);
});
