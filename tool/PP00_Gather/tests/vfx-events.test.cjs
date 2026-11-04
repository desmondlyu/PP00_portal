const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function createMockDate(getNow) {
  return class MockDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(getNow());
      else super(...args);
    }
    static now() {
      return getNow();
    }
  };
}

function createVfxCombatEnv(options = {}) {
  let now = 100000;
  let roll = 0.9;
  const math = Object.create(Math);
  math.random = () => roll;

  const MockDate = createMockDate(() => now);

  const c = {
    window: {
      addEventListener: () => {},
      isPositionBlocked: options.isBlocked || (() => false),
      GATHER_CONFIG: { season2: false, npcDialogues: {}, items: [] },
      AVATAR_CATALOG: [{ id: 'avatar_default' }],
      OfficeWardrobe: {
        canAdd: () => true,
        add: () => {}
      }
    },
    Math: math,
    Date: MockDate,
    performance: { now: () => now },
    console
  };
  vm.createContext(c);

  // Load vfx presets, manager, config, combat, and network
  const jsDir = path.join(__dirname, '../static/js');
  vm.runInContext(fs.readFileSync(path.join(jsDir, 'vfxPresets.js'), 'utf8'), c);
  vm.runInContext(fs.readFileSync(path.join(jsDir, 'vfx.js'), 'utf8'), c);
  vm.runInContext(fs.readFileSync(path.join(jsDir, 'config.js'), 'utf8'), c);
  vm.runInContext(fs.readFileSync(path.join(jsDir, 'combat.js'), 'utf8'), c);
  vm.runInContext(fs.readFileSync(path.join(jsDir, 'network.js'), 'utf8'), c);

  // Instantiate officeVfx on window
  c.window.officeVfx = new c.window.OfficeVfx({
    maxActive: 24,
    maxSeen: 512,
    vfxEnabled: true
  });

  const mob = { id: 'mob_low_yield', uid: 'mob_instance_1', isMob: true, name: '怪物', x: 50, y: 0 };
  const npc = { id: 'npc_aunt', name: '阿姨', x: 50, y: 0 };
  const picked = [];
  const effects = [];

  const n = {
    clientId: 'player_1',
    localPlayer: { id: 'player_1', x: 0, y: 0, dir: 'right', isFist: false, equippedSlots: [{ id: 'bench' }], activeEquipIndex: 0 },
    remotePlayers: new Map(),
    npcPlayers: new Map([['npc_aunt', npc]]),
    isRoomMaster: () => true,
    callbacks: {
      getMobs: () => [mob],
      onCombatPickup: (i) => picked.push(i),
      onCombatDamage: (e) => effects.push(e)
    },
    broadcastPacket() {}
  };

  return {
    c,
    h: c.window.OfficeCombat,
    vfx: c.window.officeVfx,
    n,
    mob,
    npc,
    advance: (ms) => { now += ms; },
    roll: (r) => { roll = r; }
  };
}

function setupAppVfxSnapshotEnv() {
  let now = 100000;
  const nodes = new Map();
  function makeEl() {
    const el = {
      classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
      style: {},
      setAttribute: () => {},
      getAttribute: () => null,
      appendChild: () => {},
      removeChild: () => {},
      replaceChildren: () => {},
      remove: () => {},
      addEventListener: () => {},
      querySelector: () => defaultEl,
      querySelectorAll: () => [],
      children: [],
      dataset: {},
      content: { textContent: '' },
      _html: '',
      getContext: () => ({ clearRect: () => {}, fillText: () => {}, drawImage: () => {} }),
      width: 32,
      height: 32
    };
    Object.defineProperty(el, 'innerHTML', {
      get() { return el._html; },
      set(val) { el._html = String(val); el.content.textContent = String(val); el.textContent = String(val); }
    });
    Object.defineProperty(el, 'textContent', {
      get() { return el.content.textContent; },
      set(val) { el.content.textContent = String(val); el._html = String(val); }
    });
    return el;
  }
  const defaultEl = makeEl();
  const doc = {
    getElementById: (id) => nodes.get(id) || defaultEl,
    querySelector: () => defaultEl,
    querySelectorAll: () => [],
    createElement: makeEl,
    body: { appendChild: () => {}, removeChild: () => {}, remove: () => {}, classList: { add: () => {}, remove: () => {} } },
    documentElement: { style: {}, classList: { toggle: () => {} } },
    head: { appendChild: () => {} },
  };

  const MockDate = createMockDate(() => now);

  const context = {
    console,
    Date: MockDate,
    Math,
    performance: { now: () => now },
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    requestAnimationFrame: () => {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    window: {
      addEventListener: () => {},
      innerWidth: 1200,
      innerHeight: 800,
      WORLD_MAP: { workstations: [], labEquipments: [], toiletStalls: [] },
      GATHER_CONFIG: { season2: true, statuses: [{ id: 'active', dot: '#22c55e' }], items: [], npcDialogues: {} },
      AVATAR_CATALOG: [{ id: 'avatar_default' }],
      COSTUME_CATALOG: [],
      OfficeWardrobe: { canAdd: () => true, add: () => {}, worn: () => null },
      drawWackyAvatar: () => {}
    }
  };
  context.window.document = doc;
  context.document = doc;
  context.window.window = context.window;
  vm.createContext(context);

  const jsDir = path.join(__dirname, '../static/js');
  vm.runInContext(fs.readFileSync(path.join(jsDir, 'vfxPresets.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(jsDir, 'vfx.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(jsDir, 'config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(jsDir, 'wardrobe.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(jsDir, 'combat.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(jsDir, 'network.js'), 'utf8'), context);

  let appSrc = fs.readFileSync(path.join(jsDir, 'app.js'), 'utf8');
  appSrc = appSrc.replace("window.addEventListener('DOMContentLoaded', init);", 'window.__testInit = init;');
  vm.runInContext(appSrc, context);

  context.window.officeVfx = new context.window.OfficeVfx({
    maxActive: 24,
    maxSeen: 512,
    vfxEnabled: true
  });

  const T = context.window.__PP00_TEST__;
  const mob = { id: 'mob_low_yield', uid: 'mob_instance_1', isMob: true, name: '怪物', x: 50, y: 0 };
  const npc = { id: 'npc_aunt', uid: 'npc_aunt', name: '阿姨', x: 50, y: 0 };
  const network = new context.window.EphemeralOfficeNetwork({
    getMobs: () => [mob],
    onCombatPickup: () => {},
    onCombatDamage: () => {}
  });
  network.clientId = 'player_1';
  network.localPlayer = { id: 'player_1', x: 0, y: 0, dir: 'right', isFist: false, equippedSlots: [{ id: 'bench' }], activeEquipIndex: 0 };
  network.npcPlayers.set('npc_aunt', npc);
  network.isRoomMaster = () => true;
  network.broadcastPacket = () => {};

  T.setNetwork(network);
  T.setEcosystem({ groundItems: [], mobs: [mob] });

  return {
    context,
    T,
    network,
    npc,
    mob,
    vfx: context.window.officeVfx,
    advance: (ms) => { now += ms; }
  };
}

test('P2: same reaction arriving via snapshot poll and apply triggers exactly one hit effect', () => {
  // Drives the real app.js applySeasonSnapshot entrypoint and combat.apply
  const env = setupAppVfxSnapshotEnv();
  const initialReaction = { id: 'reaction_multi_1', kind: 'hit', angle: 0, at: 100000, duration: 450 };

  // Route 0: Establish combatInitialized baseline on P2P network so subsequent packets enter receiveReaction
  env.network.remotePlayers.set('host_0', { id: 'host_0', name: '遠端房長' });
  const initPkt = {
    type: 'combat_state',
    senderId: 'host_0',
    state: {
      enemies: {
        npc_aunt: { hp: 3, maxHp: 3, reaction: initialReaction }
      },
      items: [],
      grants: {},
      effects: {},
      cooldowns: {}
    }
  };
  env.context.window.OfficeCombat.packet(env.network, initPkt);
  assert.equal(env.network.combatInitialized, true, 'P2P network combatInitialized established');
  assert.equal(env.vfx.activeCount, 0, 'First apply creates baseline, does not replay history');

  const snap1 = {
    now: 100000,
    player: { id: 'player_1', exp: 0, totalLogins: 1, avatarId: 'avatar_default', items: [], effects: {} },
    players: [],
    stalls: {},
    drops: [],
    broken: [],
    enemies: {
      npc_aunt: { hp: 3, maxHp: 3, x: 50, y: 0, reaction: initialReaction }
    }
  };

  // Route A: First snapshot poll establishing baseline via real app.js entrypoint (season.isFirstSnapshot === true)
  env.T.applySeasonSnapshot(snap1);
  assert.equal(env.vfx.activeCount, 0, 'First snapshot poll creates baseline, does not replay history');
  assert.equal(env.vfx.seen.has('reaction:npc_aunt:reaction_multi_1:hit'), true, 'Baseline registered into bounded seen cache');

  // Route B: Fresh reaction arrives via snapshot poll (app.js:642 -> OfficeCombat.receiveReaction)
  env.advance(150);
  const newReaction = { id: 'reaction_multi_2', kind: 'hit', isFist: false, angle: 0, at: 100150, duration: 450 };
  const snap2 = {
    now: 100150,
    player: { id: 'player_1', exp: 0, totalLogins: 1, avatarId: 'avatar_default', items: [], effects: {} },
    players: [],
    stalls: {},
    drops: [],
    broken: [],
    enemies: {
      npc_aunt: { hp: 2, maxHp: 3, x: 55, y: 0, reaction: newReaction }
    }
  };
  env.T.applySeasonSnapshot(snap2);
  assert.equal(env.vfx.activeCount, 1, 'Fresh reaction arriving via snapshot poll triggers hit visual');
  assert.equal(env.vfx.active[0].kind, 'hit');

  // Route C: Same reaction arrives via subsequent P2P combat_state broadcast (combat.apply -> receiveReaction)
  const statePkt = {
    type: 'combat_state',
    senderId: 'host_0',
    state: {
      enemies: {
        npc_aunt: { hp: 2, maxHp: 3, reaction: newReaction }
      },
      items: [],
      grants: {},
      effects: {},
      cooldowns: {}
    }
  };
  env.context.window.OfficeCombat.packet(env.network, statePkt);
  // Route D: Next repeated snapshot poll arrives with the same reaction
  env.T.applySeasonSnapshot(snap2);
  assert.equal(env.vfx.activeCount, 1, 'Duplicate reaction across snapshot poll and subsequent apply must be strictly deduplicated');
});

test('P2: fist attack triggers blunt_hit while weapon attack triggers hit', () => {
  const env = createVfxCombatEnv();
  // Mark player as using fist
  env.n.localPlayer.isFist = true;
  env.n.localPlayer.equippedSlots = [];
  env.n.localPlayer.heldItem = null;
  env.roll(0.9); // roll > dodge -> hit

  // First apply marks baseline
  const initialPkt = {
    type: 'combat_state',
    senderId: 'player_1',
    state: { enemies: { npc_aunt: { hp: 3, maxHp: 3 } }, items: [], grants: {}, effects: {}, cooldowns: {} }
  };
  env.h.packet(env.n, initialPkt);

  // Fist attack strike
  env.h.strike(env.n, 'player_1', 'npc_aunt');
  
  const bluntHits = env.vfx.active.filter(e => e.kind === 'blunt_hit');
  assert.equal(bluntHits.length, 1, 'Fist attack must trigger blunt_hit');

  // Now switch player to weapon attack
  env.n.localPlayer.isFist = false;
  env.n.localPlayer.equippedSlots = [{ id: 'bench' }];
  env.n.localPlayer.heldItem = 'bench';
  env.advance(300);

  env.h.strike(env.n, 'player_1', 'npc_aunt');
  const normalHits = env.vfx.active.filter(e => e.kind === 'hit');
  assert.equal(normalHits.length, 1, 'Weapon attack must trigger standard hit');

  // Season mode client prediction fallback: Edge Function response omits isFist
  // but client predictImpact(npc, angle, now, isFist=true) supplies isFist to receiveReaction
  const seasonEnv = createVfxCombatEnv();
  const attackNonce = 'nonce_hero_1';
  seasonEnv.h.predictImpact(seasonEnv.npc, 0, 100000, true, attackNonce);
  const edgeReaction = { id: 'edge_reaction_fist', kind: 'hit', angle: 0, at: 100050, duration: 450, attackNonce };
  seasonEnv.h.receiveReaction(seasonEnv.npc, edgeReaction, 100050);
  const seasonBluntHits = seasonEnv.vfx.active.filter(e => e.kind === 'blunt_hit');
  assert.equal(seasonBluntHits.length, 1, 'Client prediction provides isFist when Edge Function response omits it');

  // Verify stale isFist prevention without new prediction:
  // After the fist hit is confirmed, a subsequent reaction without isFist and WITHOUT a new prediction
  // must NOT inherit the stale confirmed isFist: true, but must trigger standard 'hit'
  seasonEnv.advance(1000); // 1 second later
  // Note: NO predictImpact called!
  const staleCheckReaction = { id: 'edge_reaction_unpredicted', kind: 'hit', angle: 0, at: 101100, duration: 450 };
  seasonEnv.h.receiveReaction(seasonEnv.npc, staleCheckReaction, 101100);
  const totalBluntHits = seasonEnv.vfx.active.filter(e => e.kind === 'blunt_hit');
  const totalStandardHits = seasonEnv.vfx.active.filter(e => e.kind === 'hit');
  assert.equal(totalBluntHits.length, 1, 'No stale blunt_hit from confirmed history on unpredicted reaction');
  assert.equal(totalStandardHits.length, 1, 'Unpredicted reaction correctly emits standard hit');

  // Verify delayed legitimate fist reaction (e.g. 1500ms network latency):
  // Does NOT degrade to hit, but stays blunt_hit because preview.consumed is false until matched
  const delayEnv = createVfxCombatEnv();
  const delayNonce = 'nonce_hero_delay';
  delayEnv.h.predictImpact(delayEnv.npc, 0, 100000, true, delayNonce);
  delayEnv.advance(1500); // 1.5s network delay
  const delayedFistReaction = { id: 'delayed_edge_fist', kind: 'hit', angle: 0, at: 101500, duration: 450, attackNonce: delayNonce };
  delayEnv.h.receiveReaction(delayEnv.npc, delayedFistReaction, 101500);
  const delayedBlunts = delayEnv.vfx.active.filter(e => e.kind === 'blunt_hit');
  assert.equal(delayedBlunts.length, 1, 'Delayed legitimate fist reaction (1500ms) preserves blunt_hit via consumed metadata');
});

test('P2: server clock skew does not break local predictImpact and animation clock via triggerWeaponAttack', () => {
  // Drives the real app.js triggerWeaponAttack entrypoint under server clock offset
  const env = setupAppVfxSnapshotEnv();
  const T = env.T;
  T.setIsLoggedIn(true);

  // Establish cold start snapshot baseline so subsequent snapshots trigger receiveReaction
  T.getSeason().isFirstSnapshot = false;

  // Set local player to fist attack
  const localPlayer = T.getLocalPlayer();
  localPlayer.isFist = true;
  localPlayer.equippedSlots = [];
  localPlayer.activeEquipIndex = 0;
  localPlayer.x = env.npc.x - 20;
  localPlayer.y = env.npc.y;
  env.context.window.isPositionBlocked = () => false;

  // Simulate 10-second forward server skew: gameClock is 110000 while local Date.now() is 100000
  const localClock = 100000;
  const serverSkew = 10000;
  env.context.window.GatherServerClock = { now: () => localClock + serverSkew };

  // Trigger real triggerWeaponAttack
  T.setLastWeaponAttackAt(0);
  T.triggerWeaponAttack();

  // Auntie's preview reaction must have startedAt === localClock (Date.now()), NOT localClock + serverSkew (gameNow())
  assert(env.npc.combatReaction, 'NPC must receive preview reaction from triggerWeaponAttack');
  assert.equal(env.npc.combatReaction.isFist, true, 'Preview reaction must have isFist: true');
  assert.equal(env.npc.combatReaction.predicted, true, 'Preview reaction must be marked predicted');
  assert.equal(env.npc.combatReaction.startedAt, localClock, 'predictImpact must use local Date.now(), not skewed gameNow()');

  // Confirmation arrives 1200ms later from server with server timestamp
  env.advance(1200);
  const confirmedPkt = {
    now: localClock + 1200 + serverSkew,
    player: { id: 'player_1', exp: 0, totalLogins: 1, avatarId: 'avatar_default', items: [], effects: {} },
    players: [],
    stalls: {},
    drops: [],
    broken: [],
    enemies: {
      npc_aunt: {
        hp: 2,
        maxHp: 3,
        x: env.npc.x,
        y: env.npc.y,
        reaction: { id: 'skewed_edge_fist_1', kind: 'hit', angle: 0, at: localClock + serverSkew + 200, duration: 450, attackNonce: env.npc.combatReaction.attackNonce }
      }
    }
  };
  T.applySeasonSnapshot(confirmedPkt);

  // Even after 1200ms delay, the fist reaction should be matched and emit blunt_hit (not hit)
  const bluntHits = env.vfx.active.filter(e => e.kind === 'blunt_hit');
  assert.equal(bluntHits.length, 1, 'Delayed Season fist reaction emits blunt_hit under server clock skew');
});

test('P2: initial snapshot / cold connect establishes baseline without replaying past reactions', () => {
  const env = createVfxCombatEnv();
  // Register remote master 'host_0' (< 'player_1')
  env.n.remotePlayers.set('host_0', { id: 'host_0', name: '房長' });

  // Server state already has a past reaction from 2 seconds ago
  const existingReaction = { id: 'past_reaction_99', kind: 'hit', angle: 0, at: 98000, duration: 450 };
  const initialSnapshotPkt = {
    type: 'combat_state',
    senderId: 'host_0',
    state: {
      enemies: {
        npc_aunt: { hp: 2, maxHp: 3, reaction: existingReaction }
      },
      items: [],
      grants: {},
      effects: {},
      cooldowns: {}
    }
  };

  // Client connects and receives initial state
  env.h.packet(env.n, initialSnapshotPkt);

  // Must NOT replay past reaction on initial connect (§7)
  assert.equal(env.vfx.activeCount, 0, 'Initial connect must establish baseline and suppress past reactions');
  assert(env.vfx.seen.has('reaction:npc_aunt:past_reaction_99:hit'));

  // Subsequent new reaction should trigger normally
  env.advance(100);
  const freshReaction = { id: 'fresh_reaction_100', kind: 'hit', angle: 0, at: 100100, duration: 450 };
  initialSnapshotPkt.state.enemies.npc_aunt.reaction = freshReaction;
  env.h.packet(env.n, initialSnapshotPkt);
  assert.equal(env.vfx.activeCount, 1);
  assert.equal(env.vfx.active[0].id, 'reaction:npc_aunt:fresh_reaction_100:hit');
});

test('P2: predicted impact followed by confirmed dodge suppresses hit visual and plays dodge', () => {
  const env = createVfxCombatEnv();
  // Client-side prediction starts on attack initiation
  const previewId = env.h.predictImpact(env.npc, 0, 100000);
  assert.equal(env.npc.combatReaction.id, previewId);
  // Prediction alone must NEVER emit a hit VFX to the manager (§4.2)
  const hitEffectsBefore = env.vfx.active.filter(e => e.kind === 'hit' || e.kind === 'blunt_hit');
  assert.equal(hitEffectsBefore.length, 0);

  // Server confirms dodge outcome
  const dodgeReaction = { id: 'reaction_dodge_1', kind: 'dodge', angle: 0, duration: 450 };
  const confirmed = env.h.receiveReaction(env.npc, dodgeReaction, 100100);
  assert.equal(confirmed, true);

  // Exactly one dodge effect should be emitted; NO hit or blunt_hit
  const hitEffectsAfter = env.vfx.active.filter(e => e.kind === 'hit' || e.kind === 'blunt_hit');
  assert.equal(hitEffectsAfter.length, 0);

  const dodgeEffects = env.vfx.active.filter(e => e.kind === 'dodge');
  assert.equal(dodgeEffects.length, 1);
  assert.equal(dodgeEffects[0].kind, 'dodge');
});

test('P2: delayed reaction (1200ms) plays from frame 0 at receipt time', () => {
  const env = createVfxCombatEnv();
  const delayedReaction = { id: 'reaction_delayed_1', kind: 'hit', angle: 0, at: 98000, duration: 450 };
  
  env.h.receiveReaction(env.npc, delayedReaction, 100000);
  assert.equal(env.vfx.activeCount, 1);
  const activeHit = env.vfx.active[0];

  // startedAt in vfx manager must be receipt clock (100000), not the delayed server time (98000)
  assert.equal(activeHit.startedAt, 100000);

  // Advancing by 50ms should mean the effect is active at frame t = 50 / 420
  env.advance(50);
  env.vfx.update(100050);
  assert.equal(env.vfx.activeCount, 1);

  // Advancing beyond duration (420ms) expires it cleanly
  env.advance(400);
  env.vfx.update(100450);
  assert.equal(env.vfx.activeCount, 0);
});

test('P2: strike defeat emits poof and blunt_hit effects', () => {
  const env = createVfxCombatEnv();
  const defeatReaction = { id: 'reaction_defeat_1', kind: 'defeat', angle: 0, duration: 650 };
  
  env.h.receiveReaction(env.mob, defeatReaction, 100000);
  
  const kinds = env.vfx.active.map(e => e.kind);
  assert(kinds.includes('poof'), 'should emit poof visual on defeat');
  assert(kinds.includes('hit') || kinds.includes('blunt_hit'), 'should emit impact visual on defeat');
});

test('P2: wall blocking and distance bounds prevent reaction emit', () => {
  const blockedEnv = createVfxCombatEnv({ isBlocked: () => true });
  blockedEnv.roll(0.9);
  blockedEnv.h.strike(blockedEnv.n, 'player_1', 'npc_aunt');
  assert.equal(blockedEnv.vfx.activeCount, 0, 'Blocked strike must not emit reaction vfx');

  const farEnv = createVfxCombatEnv();
  farEnv.npc.x = 999;
  farEnv.npc.y = 999;
  farEnv.roll(0.9);
  farEnv.h.strike(farEnv.n, 'player_1', 'npc_aunt');
  assert.equal(farEnv.vfx.activeCount, 0, 'Out-of-range strike must not emit reaction vfx');
});

test('P2: remote weapon_swing packet emits swing and thrust vfx for remote player', () => {
  const env = createVfxCombatEnv();
  // Use real EphemeralOfficeNetwork instance
  const net = new env.c.window.EphemeralOfficeNetwork();
  net.localPlayer = { id: 'player_1', x: 0, y: 0 };
  const remotePlayer = { id: 'remote_colleague_1', x: 200, y: 300, dir: 'left' };
  net.remotePlayers.set(remotePlayer.id, remotePlayer);

  // Drives network.js:1082 via real net.handleIncomingPacket
  net.handleIncomingPacket({
    type: 'weapon_swing',
    nonce: 'swing_nonce_1',
    senderId: 'remote_colleague_1',
    emoji: '🪑',
    isFist: false
  });

  assert.equal(env.vfx.activeCount, 1, 'Remote weapon swing emits 1 vfx');
  assert.equal(env.vfx.active[0].kind, 'swing');
  assert.equal(env.vfx.active[0].entityId, 'remote_colleague_1');
  assert.equal(env.vfx.active[0].angle, Math.PI, 'Direction left maps to Math.PI');

  // Advance time and remote colleague attacks with fist (thrust)
  env.advance(350);
  remotePlayer.dir = 'up';
  net.handleIncomingPacket({
    type: 'weapon_swing',
    nonce: 'swing_nonce_2',
    senderId: 'remote_colleague_1',
    emoji: '👊',
    isFist: true
  });

  assert.equal(env.vfx.activeCount, 2, 'Remote fist attack emits thrust vfx');
  assert.equal(env.vfx.active[1].kind, 'thrust');
  assert.equal(env.vfx.active[1].angle, -Math.PI / 2, 'Direction up maps to -Math.PI / 2');
});

test('P2: defeatVisible maintains 650ms grace period without premature removal', () => {
  const env = createVfxCombatEnv();
  const mob = { combatDown: true, combatDownAt: 100000 };
  assert.equal(env.h.defeatVisible(mob, 100000), true);
  assert.equal(env.h.defeatVisible(mob, 100600), true);
  assert.equal(env.h.defeatVisible(mob, 100650), false);
});

test('P2: OfficeVfx.markSeen preserves bounded seen cache and evicts oldest baseline', () => {
  const env = createVfxCombatEnv();
  env.vfx.maxSeen = 5;
  env.vfx.seen.clear();
  env.vfx.seenOrder.length = 0;

  for (let i = 1; i <= 5; i++) {
    assert.equal(env.vfx.markSeen('baseline_' + i), true);
  }
  assert.equal(env.vfx.seen.size, 5);
  assert.equal(env.vfx.seenOrder.length, 5);
  assert.equal(env.vfx.seen.has('baseline_1'), true);

  // Duplicate markSeen is suppressed
  assert.equal(env.vfx.markSeen('baseline_3'), false);
  assert.equal(env.vfx.seen.size, 5);

  // 6th item evicts oldest baseline_1
  assert.equal(env.vfx.markSeen('baseline_6'), true);
  assert.equal(env.vfx.seen.size, 5);
  assert.equal(env.vfx.seen.has('baseline_1'), false);
  assert.equal(env.vfx.seen.has('baseline_6'), true);
  assert.deepEqual(Array.from(env.vfx.seenOrder), ['baseline_2', 'baseline_3', 'baseline_4', 'baseline_5', 'baseline_6']);
});

test('P2: join room flow: empty local combat state apply never consumes combatInitialized baseline and preserves remote master reaction suppression', () => {
  const env = setupAppVfxSnapshotEnv();
  assert.equal(env.network.combatInitialized, undefined);

  // 1. New player joins room; presence not yet synchronized. Local update/emit runs with empty state
  env.context.window.OfficeCombat.packet(env.network, {
    type: 'combat_state',
    senderId: env.network.clientId,
    state: { enemies: {}, items: [], grants: {}, effects: {}, cooldowns: {} }
  });

  // Empty local state must NOT consume baseline
  assert.equal(env.network.combatInitialized, undefined, 'Empty local state apply must NOT consume combatInitialized baseline');

  // 2. Real remote room master sends combat_state with historical reaction
  env.network.remotePlayers.set('host_0', { id: 'host_0', name: '房長' }); // 'host_0' < 'player_1', so host_0 is master
  env.context.window.OfficeCombat.packet(env.network, {
    type: 'combat_state',
    senderId: 'host_0',
    state: {
      enemies: {
        npc_aunt: {
          hp: 2,
          maxHp: 3,
          reaction: { id: 'remote_history_rx_1', kind: 'hit', angle: 0, at: 100000, duration: 450 }
        }
      },
      items: [],
      grants: {},
      effects: {},
      cooldowns: {}
    }
  });

  assert.equal(env.network.combatInitialized, true, 'Remote master state establishes baseline');
  assert.equal(env.vfx.activeCount, 0, 'Historical reaction from remote master is suppressed as baseline, 0 vfx emitted');
  assert.equal(env.npc.lastConfirmedReactionId, 'remote_history_rx_1');

  // 3. Subsequent real reaction from master triggers vfx
  env.context.window.OfficeCombat.packet(env.network, {
    type: 'combat_state',
    senderId: 'host_0',
    state: {
      enemies: {
        npc_aunt: {
          hp: 1,
          maxHp: 3,
          reaction: { id: 'new_rx_2', kind: 'hit', angle: 0, at: 100500, duration: 450 }
        }
      },
      items: [],
      grants: {},
      effects: {},
      cooldowns: {}
    }
  });

  assert.equal(env.vfx.activeCount, 1, 'Subsequent new reaction from master triggers hit vfx');
  assert.equal(env.vfx.active[0].kind, 'hit');
});

test('P2: room master first attack in new room is never swallowed as baseline', () => {
  // Verifies that a room master starting in an empty room emits hit vfx on very first strike
  const env = createVfxCombatEnv();
  // Ensure network starts uninitialized with empty state
  assert.equal(env.n.combatInitialized, undefined);

  // 1. Local room master update runs with empty state
  env.h.packet(env.n, {
    type: 'combat_state',
    senderId: env.n.clientId,
    state: { enemies: {}, items: [], grants: {}, effects: {}, cooldowns: {} }
  });
  assert.equal(env.n.combatInitialized, undefined, 'Empty local state does not consume baseline');

  // 2. Room master executes first strike
  env.roll(0.9); // roll > dodge -> hit
  env.h.strike(env.n, env.n.clientId, 'npc_aunt');

  // Master's first attack MUST trigger hit vfx, NOT get swallowed as baseline
  assert.equal(env.vfx.activeCount, 1, 'Master first attack must trigger vfx and never get swallowed');
  assert.equal(env.vfx.active[0].kind, 'hit');
  assert.equal(env.npc.combatReaction.kind, 'hit');
});

test('P2: unconfirmed orphan fist prediction expires after 2500ms and never pollutes subsequent weapon reaction', () => {
  const env = createVfxCombatEnv();
  // 1. Local player predicts fist attack, but server never responds (e.g. out of range, blocked, dropped packet)
  const previewId = env.h.predictImpact(env.npc, 0, 100000, true);
  assert.equal(env.npc.combatReaction.id, previewId);
  assert.equal(env.npc.combatReaction.isFist, true);
  assert.equal(env.npc.combatReaction.predicted, true);

  // 2. 3000ms passes (exceeding 2500ms validity window)
  env.advance(3000); // now = 103000

  // 3. A subsequent legitimate weapon reaction arrives (Edge function reaction omits isFist)
  const weaponReaction = { id: 'weapon_reaction_after_orphan', kind: 'hit', angle: 0, at: 103000, duration: 450 };
  const accepted = env.h.receiveReaction(env.npc, weaponReaction, 103000);

  assert.equal(accepted, true);
  assert.equal(env.npc.combatReaction.isFist, false, 'Expired orphan prediction must NOT pollute subsequent reaction');
  assert.equal(env.npc.combatReaction.kind, 'hit');

  // VFX emitted must be standard 'hit', NOT 'blunt_hit'
  assert.equal(env.vfx.activeCount, 1);
  assert.equal(env.vfx.active[0].kind, 'hit', 'Reaction after expired orphan prediction must emit hit, NOT blunt_hit');
});

test('P2: attack request failure / silent server rejection immediately invalidates prediction via invalidatePrediction', () => {
  const env = createVfxCombatEnv();
  // 1. Predict fist attack
  const previewId = env.h.predictImpact(env.npc, 0, 100000, true, 'local_hero');
  assert.equal(env.npc.combatReaction.id, previewId);
  assert.equal(env.npc.combatReaction.isFist, true);
  assert.equal(env.npc.combatReaction.predicted, true);

  // 2. Request fails or server silently rejects (target out of range / blocked): invalidate prediction immediately
  env.h.invalidatePrediction(env.npc, previewId);
  assert.equal(env.npc.combatReaction.predicted, undefined, 'Invalidated prediction must clear predicted flag');
  assert.equal(env.npc.combatReaction.consumed, true);
  assert.equal(env.npc.combatReaction.invalidated, true);

  // 3. Shortly after (500ms later, well within 2500ms window), another source reaction arrives without isFist
  env.advance(500);
  const otherReaction = { id: 'other_source_rx', kind: 'hit', angle: 0, at: 100500, duration: 450, attackerId: 'teammate_1' };
  const accepted = env.h.receiveReaction(env.npc, otherReaction, 100500);

  assert.equal(accepted, true);
  assert.equal(env.npc.combatReaction.isFist, false, 'Invalidated prediction must NOT pollute subsequent reaction even within 2500ms');
  assert.equal(env.npc.combatReaction.kind, 'hit');
  assert.equal(env.vfx.activeCount, 1);
  assert.equal(env.vfx.active[0].kind, 'hit', 'Must emit standard hit, NOT blunt_hit');
});

test('P2: triggerWeaponAttack with silent server rejection retaining historical reaction invalidates prediction and prevents hit pollution', async () => {
  const env = setupAppVfxSnapshotEnv();
  const T = env.T;
  T.setIsLoggedIn(true);
  T.setLastWeaponAttackAt(0);
  T.getSeason().isFirstSnapshot = false;

  // Established historical reaction on target from 5 seconds ago
  const historicalRx = { id: 'rx_retained_historical_999', kind: 'hit', angle: 0, at: 95000, duration: 450 };
  env.npc.lastConfirmedReactionId = historicalRx.id;
  env.network.combat = {
    enemies: {
      npc_aunt: { hp: 3, maxHp: 3, reaction: historicalRx }
    }
  };

  // Player using fist
  const localPlayer = T.getLocalPlayer();
  localPlayer.isFist = true;
  localPlayer.equippedSlots = [];
  localPlayer.activeEquipIndex = 0;
  localPlayer.x = env.npc.x - 20;
  localPlayer.y = env.npc.y;
  env.context.window.isPositionBlocked = () => false;

  // Intercept seasonSend to simulate server response where strike is silently rejected (e.g. out of range)
  // Server engine.mjs:331 returns without modifying e.reaction, retaining historicalRx!
  let sendCalled = false;
  T.getSeason().client = {
    send: async (action, payload) => {
      sendCalled = true;
      const rejectedSnap = {
        now: 100000,
        player: { id: localPlayer.id, exp: 0, items: [], effects: {} },
        players: [],
        drops: [],
        broken: [],
        enemies: {
          // Target retains historical reaction, NOT a new reaction from this attack!
          npc_aunt: { hp: 3, maxHp: 3, reaction: historicalRx }
        }
      };
      // GatherProfileClient triggers onSnapshot before resolve
      T.applySeasonSnapshot(rejectedSnap);
      return { snapshot: rejectedSnap };
    }
  };

  // Trigger weapon attack (fist)
  T.triggerWeaponAttack();
  assert.equal(sendCalled, true);

  // Give promise microtask a tick to resolve .then()
  await new Promise(resolve => setTimeout(resolve, 0));

  // Prediction should have been immediately invalidated by .then() because historicalRx is not a new reaction!
  assert.equal(env.npc.combatReaction.invalidated, true);
  assert.equal(env.npc.combatReaction.predicted, undefined);

  // Shortly after (300ms later), an authoritative weapon reaction arrives from another source without isFist
  env.advance(300);
  const subsequentRx = { id: 'legit_weapon_rx', kind: 'hit', angle: 0, at: 100300, duration: 450 };
  const accepted = env.context.window.OfficeCombat.receiveReaction(env.npc, subsequentRx, 100300);

  assert.equal(accepted, true);
  assert.equal(env.npc.combatReaction.isFist, false, 'Invalidated prediction must NOT pollute subsequent reaction');
  assert.equal(env.npc.combatReaction.kind, 'hit');
  const hits = env.vfx.active.filter(e => e.kind === 'hit');
  assert.equal(hits.length, 1, 'Must emit standard hit');
  const bluntHits = env.vfx.active.filter(e => e.kind === 'blunt_hit');
  assert.equal(bluntHits.length, 0, 'Must NOT emit blunt_hit');
});

test('P2: reaction lacking attackNonce from other source strictly rejected by prediction and emits standard hit', () => {
  const env = createVfxCombatEnv();
  // 1. Local player predicts fist attack with local attackNonce
  const previewId = env.h.predictImpact(env.npc, 0, 100000, true, 'atk_local_123');
  assert.equal(env.npc.combatReaction.id, previewId);
  assert.equal(env.npc.combatReaction.isFist, true);
  assert.equal(env.npc.combatReaction.attackNonce, 'atk_local_123');

  // 2. An edge function reaction from another source arrives without attackNonce (or different attackNonce)
  const otherRx = { id: 'other_source_rx_no_nonce', kind: 'hit', angle: 0, at: 100200, duration: 450 }; // no attackNonce!
  const accepted = env.h.receiveReaction(env.npc, otherRx, 100200);

  assert.equal(accepted, true);
  assert.equal(env.npc.combatReaction.isFist, false, 'Reaction lacking matching attackNonce must NEVER inherit fist prediction');
  assert.equal(env.npc.combatReaction.kind, 'hit');
  const hits = env.vfx.active.filter(e => e.kind === 'hit');
  assert.equal(hits.length, 1, 'Must emit standard hit');
  const bluntHits = env.vfx.active.filter(e => e.kind === 'blunt_hit');
  assert.equal(bluntHits.length, 0, 'Must NOT emit blunt_hit');
});

test('P2: reaction lacking attackerId or with mismatched attackerId strictly rejected from inheriting fist prediction', () => {
  const env = createVfxCombatEnv();
  // 1. Local player predicts fist attack with attackerId = 'player_me'
  const previewId = env.h.predictImpact(env.npc, 0, 100000, true, 'nonce_p1', 'player_me');
  assert.equal(env.npc.combatReaction.id, previewId);
  assert.equal(env.npc.combatReaction.isFist, true);
  assert.equal(env.npc.combatReaction.attackerId, 'player_me');

  // 2. Reaction arrives lacking attackerId completely (typical Edge Function background reaction)
  const missingAttackerRx = { id: 'rx_no_attacker', kind: 'hit', angle: 0, at: 100100, duration: 450 };
  const accepted1 = env.h.receiveReaction(env.npc, missingAttackerRx, 100100);
  assert.equal(accepted1, true);
  assert.equal(env.npc.combatReaction.isFist, false, 'Reaction missing attackerId must not inherit isFist');
  assert.equal(env.vfx.active.filter(e => e.kind === 'hit').length, 1);
  assert.equal(env.vfx.active.filter(e => e.kind === 'blunt_hit').length, 0);

  // 3. New prediction with attackerId = 'player_me'
  const previewId2 = env.h.predictImpact(env.npc, 0, 101000, true, 'nonce_p2', 'player_me');
  // Reaction arrives with mismatched attackerId = 'player_other'
  const mismatchAttackerRx = { id: 'rx_mismatch_attacker', kind: 'hit', angle: 0, at: 101100, duration: 450, attackerId: 'player_other' };
  const accepted2 = env.h.receiveReaction(env.npc, mismatchAttackerRx, 101100);
  assert.equal(accepted2, true);
  assert.equal(env.npc.combatReaction.isFist, false, 'Reaction with mismatched attackerId must not inherit isFist');

  // 4. New prediction with attackerId = 'player_me', reaction arrives with matching attackerId
  const previewId3 = env.h.predictImpact(env.npc, 0, 102000, true, 'nonce_p3', 'player_me');
  const matchedAttackerRx = { id: 'rx_matched_attacker', kind: 'hit', angle: 0, at: 102100, duration: 450, attackerId: 'player_me' };
  const accepted3 = env.h.receiveReaction(env.npc, matchedAttackerRx, 102100);
  assert.equal(accepted3, true);
  assert.equal(env.npc.combatReaction.isFist, true, 'Reaction with matching attackerId correctly inherits isFist');
  assert.equal(env.vfx.active.filter(e => e.kind === 'blunt_hit').length, 1);
});

test('P2: real GatherProfileClient callback sequence (onSnapshot before Promise resolve) correctly verifies pending attack and plays blunt_hit for delayed fist reaction', async () => {
  const env = setupAppVfxSnapshotEnv();
  const T = env.T;
  T.setIsLoggedIn(true);
  T.setLastWeaponAttackAt(0);
  T.getSeason().isFirstSnapshot = false;

  // Local player is using fist
  const localPlayer = T.getLocalPlayer();
  localPlayer.isFist = true;
  localPlayer.equippedSlots = [];
  localPlayer.activeEquipIndex = 0;
  localPlayer.x = env.npc.x - 20;
  localPlayer.y = env.npc.y;
  env.context.window.isPositionBlocked = () => false;

  let sendExecuted = false;
  T.getSeason().client = {
    send: async (action, payload) => {
      sendExecuted = true;
      // Simulate real Edge Function response where reaction has NO attackNonce and NO attackerId
      const serverSnap = {
        now: 100000,
        player: { id: localPlayer.id, exp: 0, items: [], effects: {} },
        players: [],
        drops: [],
        broken: [],
        enemies: {
          npc_aunt: {
            hp: 2,
            maxHp: 3,
            x: 50,
            y: 0,
            reaction: { id: 'rx_delayed_fist_authoritative', kind: 'hit', at: 100000, duration: 450 }
          }
        }
      };
      // CRITICAL: GatherProfileClient.run() calls onSnapshot synchronously BEFORE returning/resolving result!
      T.applySeasonSnapshot(serverSnap);
      return { snapshot: serverSnap };
    }
  };

  // Trigger weapon attack (fist)
  T.triggerWeaponAttack();
  assert.equal(sendExecuted, true);

  // Allow promise microtask to complete .then()
  await new Promise(resolve => setTimeout(resolve, 0));

  // Assert reaction inherited isFist: true and emitted blunt_hit
  assert.equal(env.npc.combatReaction.isFist, true, 'Real onSnapshot sequence must inherit isFist: true via pendingAttacks');
  assert.equal(env.npc.combatReaction.id, 'rx_delayed_fist_authoritative');
  const bluntHits = env.vfx.active.filter(e => e.kind === 'blunt_hit');
  assert.equal(bluntHits.length, 1, 'Must emit blunt_hit vfx');
  const regularHits = env.vfx.active.filter(e => e.kind === 'hit');
  assert.equal(regularHits.length, 0, 'Must NOT emit regular hit vfx');
});
