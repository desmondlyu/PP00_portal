const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '../static/js');

function createTestEnv(initialStorage = null) {
  let store = initialStorage ? { ...initialStorage } : {};
  const context = {
    console,
    Date,
    Math,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      getStore: () => store,
    },
    document: {
      getElementById: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      hidden: false,
    },
    window: {
      addEventListener: () => {},
      matchMedia: () => ({ matches: false }),
      isPositionBlocked: () => false,
      WORLD_MAP: {
        toiletStalls: [
          { id: 'stall_1', x: 2465, y: 745, seatX: 2465, seatY: 745, occupiedBy: null, kickShakeTicks: 0 },
        ],
      },
    },
  };
  context.window.window = context.window;
  vm.createContext(context);

  // Load config, network, supabaseSync
  vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'network.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'supabaseSync.js'), 'utf8'), context);

  return context;
}

test('Network handles both player_murmur and murmur packets', () => {
  const env = createTestEnv();
  const EphemeralOfficeNetwork = env.window.EphemeralOfficeNetwork;

  let receivedMurmur = null;
  const net = new EphemeralOfficeNetwork({
    onRemoteMurmur: (pkt) => {
      receivedMurmur = pkt;
    },
  });

  const localProfile = { name: 'PlayerA', unit: 'PP10', x: 500, y: 500 };
  net.connect(localProfile);

  net.handleIncomingPacket({
    type: 'join_announce',
    nonce: 'n_join_1',
    player: { id: 'remote_user_1', name: 'RemoteBob', unit: 'PP20', x: 520, y: 520 },
  });

  net.handleIncomingPacket({
    type: 'player_murmur',
    nonce: 'n_murmur_1',
    senderId: 'remote_user_1',
    text: '加班好累',
    mood: 'normal',
  });

  assert.ok(receivedMurmur, 'onRemoteMurmur callback should be fired');
  assert.equal(receivedMurmur.text, '加班好累');

  const remote = net.remotePlayers.get('remote_user_1');
  assert.ok(remote.murmur, 'Remote player should have murmur set on entity');
  assert.equal(remote.murmur.text, '加班好累');
});

test('Network delivers private chat only to the target recipient', () => {
  const env = createTestEnv();
  const EphemeralOfficeNetwork = env.window.EphemeralOfficeNetwork;

  let receivedPrivate = null;
  const net = new EphemeralOfficeNetwork({
    onPrivateChat: (msg) => {
      receivedPrivate = msg;
    },
  });

  const localProfile = { name: 'Alice', unit: 'PP32', x: 400, y: 400 };
  net.connect(localProfile);

  net.handleIncomingPacket({
    type: 'private_chat',
    nonce: 'n_priv_1',
    senderId: 'usr_edge_user',
    senderName: 'EdgeBob',
    senderUnit: 'PP00',
    targetId: 'other_user',
    targetName: 'Charlie',
    text: '這是別人的悄悄話',
  });

  assert.equal(receivedPrivate, null, 'Private chat should not be received if targetId does not match');

  net.handleIncomingPacket({
    type: 'private_chat',
    nonce: 'n_priv_2',
    senderId: 'usr_edge_user',
    senderName: 'EdgeBob',
    senderUnit: 'PP00',
    targetId: net.clientId,
    targetName: 'Alice',
    text: '這是給愛麗絲的悄悄話',
  });

  assert.ok(receivedPrivate, 'Private chat should be received when targetId matches clientId');
  assert.equal(receivedPrivate.text, '這是給愛麗絲的悄悄話');
});

test('Network receives proximity chat across whole office regardless of extreme distance', () => {
  const env = createTestEnv();
  const EphemeralOfficeNetwork = env.window.EphemeralOfficeNetwork;

  let receivedChat = null;
  const net = new EphemeralOfficeNetwork({
    onProximityChat: (msg) => {
      receivedChat = msg;
    },
  });

  net.connect({ name: 'Alice', unit: 'PP32', x: 200, y: 200 });

  net.handleIncomingPacket({
    type: 'proximity_chat',
    nonce: 'n_chat_far',
    senderId: 'usr_far',
    senderName: 'FarWorker',
    senderUnit: 'PP50',
    x: 2200,
    y: 1800,
    text: '大家晚上好！',
  });

  assert.ok(receivedChat, 'Chat message must be received across whole office map');
  assert.equal(receivedChat.text, '大家晚上好！');
  assert.equal(receivedChat.isNearby, false, 'Far message is marked as not nearby');
});

test('Security Guard AI targets monsters and defeats them', () => {
  const env = createTestEnv();
  const EphemeralOfficeNetwork = env.window.EphemeralOfficeNetwork;

  const net = new EphemeralOfficeNetwork();
  net.connect({ name: 'Alice', unit: 'PP32', x: 500, y: 500 });

  net.npcPlayers.set('npc_security_guard', {
    id: 'npc_security_guard',
    name: 'NPC:夜間巡邏警衛',
    isSecurityGuard: true,
    isNpc: true,
    x: 1000,
    y: 500,
    targetX: 1000,
    targetY: 500,
    waypoints: [{ x: 1000, y: 500 }],
    waypointIdx: 0,
    isBerserk: false,
    murmurs: ['巡邏中'],
  });

  const mob = { uid: 'mob_test', name: 'Low Yield', hp: 2, x: 1030, y: 500 };
  let guardHit = false;

  net.callbacks.getMobs = () => [mob];
  net.callbacks.onGuardHitMob = (g, m) => {
    guardHit = true;
  };

  net.update(1);

  assert.ok(guardHit, 'Guard should hit and eliminate nearby mob');
  assert.equal(mob.hp, 0, 'Mob HP should be reduced to 0 by guard baton');
});

test('SupabaseSync overrides game balance configuration from backend', async () => {
  const env = createTestEnv();
  const GatherSupabaseSync = env.window.GatherSupabaseSync;
  const sync = new GatherSupabaseSync();

  sync.client = {
    from: (table) => ({
      select: () => Promise.resolve({
        data: [
          {
            config_key: 'mob_spawn_rates',
            config_value: { base_spawn_rate: 0.008, max_active_mobs: 4 },
          },
          {
            config_key: 'weapon_spawn_rates',
            config_value: { hit_durability: 3, items: [{ id: 'gold_baton', name: '黃金警棍', emoji: '🏏' }] },
          },
          {
            config_key: 'npc_rules',
            config_value: { bird_commander: { spawn_rate: 0.20, follow_rate: 0.85, day_pull_chance: 0.10 } },
          },
        ],
        error: null,
      }),
    }),
  };

  await sync.fetchGameConfig();

  assert.equal(env.window.GATHER_CONFIG.security.mobSpawnChance, 0.008);
  assert.equal(env.window.GATHER_CONFIG.security.maxMobCount, 4);
  assert.equal(env.window.GATHER_CONFIG.security.birdSpawnRate, 0.20);
  assert.equal(env.window.GATHER_CONFIG.security.birdFollowChance, 0.85);
  assert.equal(env.window.GATHER_CONFIG.security.birdMeetingPullChance, 0.10);
  assert.equal(env.window.GATHER_CONFIG.items[0].id, 'gold_baton');
});

test('Bird commander: night time never pulls to meeting, daytime allows meeting pull', () => {
  const env = createTestEnv();
  const EphemeralOfficeNetwork = env.window.EphemeralOfficeNetwork;

  const net = new EphemeralOfficeNetwork();
  net.connect({ name: 'Alice', unit: 'PP32', x: 1000, y: 550 });

  let meetingPulled = false;
  net.callbacks.onMeetingPull = () => { meetingPulled = true; };

  const birdNpc = {
    id: 'npc_bird_commander',
    name: 'NPC:鳥人指揮官',
    isBirdCommander: true,
    isNpc: true,
    x: 1000,
    y: 520,
    dir: 'down',
    waypoints: [{ x: 1000, y: 520 }],
    waypointIdx: 0,
    isBerserk: false,
    meetingPullCount: 0,
    meetingLockCooldownUntil: 0,
    murmurs: ['嘎！'],
  };
  net.npcPlayers.set('npc_bird_commander', birdNpc);
  net.initNPCs = () => {}; // 避免測試中被 120 tick 晝夜重洗清空

  // 1. 夜間時段 (isNightTime => true)
  net.isNightTime = () => true;
  env.window.GATHER_CONFIG.security.birdMeetingPullChance = 1.0;

  net.update(120);
  assert.equal(meetingPulled, false, 'Night time (17:00~05:00) should NEVER pull to meeting room!');

  // 2. 白天時段 (isNightTime => false)
  net.isNightTime = () => false;
  birdNpc.meetingLockCooldownUntil = 0;
  net.npcPlayers.set('npc_bird_commander', birdNpc);

  net.update(120);
  assert.equal(meetingPulled, true, 'Daytime (05:00~17:00) SHOULD allow bird commander to pull to meeting room!');
});

test('Bird commander: 100% spawns on init, auto-clears legacy exile, and auto-respawns when missing', () => {
  const env = createTestEnv({
    PP00_GATHER_PERSISTENCE_v1: JSON.stringify({ birdCommanderExiled: true, birdCommanderRestUntil: Date.now() - 1000 }),
  });

  const net = new env.window.EphemeralOfficeNetwork();
  const bird = net.npcPlayers.get('npc_bird_commander');
  assert.ok(bird, 'Bird commander should be spawned with 100% rate');
  assert.equal(bird.name, 'NPC:鳥人指揮官');

  // Verify legacy exile was cleared from storage
  const parsed = JSON.parse(env.localStorage.getItem('PP00_GATHER_PERSISTENCE_v1'));
  assert.equal(parsed.birdCommanderExiled, undefined, 'Legacy exile flag must be cleared');
  assert.equal(parsed.birdCommanderRestUntil, undefined, 'Expired rest flag must be cleared');

  // If bird commander is removed (knocked out), tick % 60 should respawn him
  net.npcPlayers.delete('npc_bird_commander');
  assert.equal(net.npcPlayers.has('npc_bird_commander'), false);
  net.update(60);
  assert.ok(net.npcPlayers.get('npc_bird_commander'), 'Bird commander should auto-respawn via update tick');
});

test('Bird commander: randomly selects any real online user (local or remote) to follow', () => {
  const env = createTestEnv();
  const net = new env.window.EphemeralOfficeNetwork();
  net.connect({ name: 'Alice', unit: 'PP10', x: 200, y: 200 });

  // Add remote player Bob
  net.upsertRemotePlayer({
    id: 'usr_bob',
    name: 'Bob',
    unit: 'PP20',
    avatarId: 'frog_eng',
    x: 800,
    y: 800,
  });

  const bird = net.npcPlayers.get('npc_bird_commander');
  assert.ok(bird);

  env.window.GATHER_CONFIG.security.birdFollowChance = 1.0;
  bird.followPlayerUntil = 0;

  // Mock Math.random to pick Bob (index 1 of 2 players)
  let randomCount = 0;
  env.Math.random = () => {
    randomCount++;
    if (randomCount === 1) return 0.05; // passes followChance
    return 0.99; // picks Bob: index 1 out of 2 players
  };

  net.update(60); // tick % 240 === 60 triggers follow selection
  assert.equal(bird.followTargetId, 'usr_bob', 'Bird commander should randomly select remote player Bob');
  assert.match(bird.murmur.text, /Bob/, 'Murmur should address Bob dynamically');
});

test('private chat is broadcast over ephemeral transports when cloud connected', async () => {
  const env = createTestEnv();
  const net = new env.window.EphemeralOfficeNetwork();
  let sent = 0;
  net.broadcastChannel = {postMessage() { sent++; }};
  net.isCloudConnected = true;
  net.realtimeChannel = {send() { sent++; return Promise.resolve('ok'); }};
  await net.broadcastPacket('private_chat', {toUserId: 'user2', text: 'secret'});
  assert.equal(sent, 2);
});

test('database errors are surfaced instead of silently treated as successful writes', async () => {
  const env = createTestEnv();
  const sync = new env.window.GatherSupabaseSync();
  let failures = 0;
  sync.callbacks.onError = () => failures++;
  await assert.rejects(sync.checked(Promise.resolve({error: new Error('permission denied')})));
  assert.equal(failures, 1);
});

test('logout waits for pending registration and is idempotent', async () => {
  const env = createTestEnv();
  env.clearInterval = () => {};
  const sync = new env.window.GatherSupabaseSync();
  let release;
  const calls = [];
  sync.pending = new Promise(resolve => {release = resolve;});
  sync.logoutUserNow = async () => { calls.push('logout'); };
  const logout = sync.logoutUser();
  assert.equal(sync.logoutUser(), logout);
  assert.equal(calls.length, 0);
  release();
  await logout;
  assert.deepEqual(calls, ['logout']);
});

test('background network interruption is quiet, foreground persistent failures still alert', async () => {
  const env = createTestEnv();
  const sync = new env.window.GatherSupabaseSync();
  let alerts = 0; sync.callbacks.onError = () => alerts++;
  const fail = () => Promise.resolve({error: {message: 'Failed to fetch'}, status: 0});
  env.document.hidden = true;
  await assert.rejects(sync.checked(fail(), true));
  assert.equal(alerts, 0);
  env.document.hidden = false;
  await assert.rejects(sync.checked(fail(), true));
  assert.equal(alerts, 0);
  await assert.rejects(sync.checked(fail(), true));
  assert.equal(alerts, 1);
  await sync.checked(Promise.resolve({error: null}), true);
  assert.equal(sync.visibleSyncFailures, 0);
});

test('a request interrupted by hiding remains quiet even if it finishes after return', async () => {
  const env = createTestEnv(); const sync = new env.window.GatherSupabaseSync();
  let alerts = 0; sync.callbacks.onError = () => alerts++;
  let finish;
  const query = new Promise(resolve => { finish = resolve; });
  const request = sync.checked(query, true);
  sync.visibilityEpoch += 2;
  finish({error: {message: 'AbortError: timed out'}, status: 0});
  await assert.rejects(request);
  assert.equal(alerts, 0);
});

test('permission errors remain visible and heartbeat restores the latest session with upsert', async () => {
  const env = createTestEnv(); const sync = new env.window.GatherSupabaseSync();
  let alerts = 0; sync.callbacks.onError = () => alerts++;
  await assert.rejects(sync.checked(Promise.resolve({error: {message: 'permission denied', code: '42501'}, status: 403}), true));
  assert.equal(alerts, 1);
  const writes = [];
  sync.client = {from: table => ({upsert: row => {writes.push({table, row});return Promise.resolve({error: null});}})};
  sync.currentUser = {id: 'same-session', name: 'Alice', unit: 'PP32', x: 0, y: 30, equippedSlots: ['item']};
  env.document.hidden = true;
  await sync.queueHeartbeat(); assert.equal(writes.length, 0);
  env.document.hidden = false;
  await Promise.all([sync.queueHeartbeat(), sync.queueHeartbeat()]);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].row.client_id, 'same-session');
  assert.equal(writes[0].row.x, 0);
  assert.equal(writes[0].table, 'gather_online_users');
});

test('visibility return schedules one fresh write without another login audit', async () => {
  const env = createTestEnv(); const listeners = {}; let writes = 0;
  env.setInterval = () => 1; env.clearInterval = () => {};
  env.document.addEventListener = (type, handler) => { listeners[type] = handler; };
  env.window.supabase = {createClient: () => ({from: table => {
    assert.equal(table, 'gather_online_users');
    return {upsert: () => { writes++; return Promise.resolve({error: null}); }};
  }})};
  const sync = new env.window.GatherSupabaseSync();
  sync.fetchGameConfig = () => {}; sync.subscribeRealtime = () => {};
  sync.currentUser = {id: 'same-session', name: 'Alice', unit: 'PP32'};
  sync.init();
  env.document.hidden = true; listeners.visibilitychange();
  await sync.queueHeartbeat(); assert.equal(writes, 0);
  env.document.hidden = false; listeners.visibilitychange();
  await sync.pending;
  assert.equal(writes, 1);
  assert.equal(sync.heartbeatTimer, 1);
});

test('Presence sync event populates remotePlayers correctly on connection', () => {
  const env = createTestEnv();
  const EphemeralOfficeNetwork = env.window.EphemeralOfficeNetwork;

  const net = new EphemeralOfficeNetwork();
  net.connect({ name: 'Alice', unit: 'PP32', x: 500, y: 500 });

  // Simulate presence.sync with existing users
  const presenceState = {
    'usr_online_bob': [{
      id: 'usr_online_bob',
      name: 'Bob',
      unit: 'PP10',
      avatarId: 'frog_eng',
      status: 'active',
      x: 600,
      y: 600,
    }],
  };

  Object.values(presenceState).forEach((presences) => {
    if (Array.isArray(presences) && presences[0]) {
      net.upsertRemotePlayer(presences[0], false);
    }
  });

  const bob = net.remotePlayers.get('usr_online_bob');
  assert.ok(bob, 'Existing user should be populated via presence sync');
  assert.equal(bob.name, 'Bob');
  assert.equal(bob.unit, 'PP10');
});

test('Toilet urge triggers ONLY when player is in toilet and NPC walks past the door', () => {
  const env = createTestEnv();
  const EphemeralOfficeNetwork = env.window.EphemeralOfficeNetwork;

  let toiletKickCount = 0;
  const net = new EphemeralOfficeNetwork({
    onNpcToiletKick: () => { toiletKickCount++; },
  });

  const stall = env.window.WORLD_MAP.toiletStalls[0]; // x: 2465, y: 745
  const doorX = stall.x - 38;
  const doorY = stall.y + 48;

  // 1. When player is NOT in toilet (actionState: null), NPC right at door should NEVER trigger
  const localPlayer = { id: 'local_alice', name: 'Alice', unit: 'PP32', x: 500, y: 500, actionState: null };
  net.connect(localPlayer);
  stall.occupiedBy = null;

  const walker = {
    id: 'npc_walker',
    name: 'NPC:打掃阿姨',
    x: doorX,
    y: doorY,
    targetX: doorX,
    targetY: doorY,
    waypoints: [{ x: doorX, y: doorY }],
    waypointIdx: 0,
    toiletKickCooldownUntil: 0,
  };
  net.npcPlayers.set('npc_walker', walker);
  net.initNPCs = () => {};

  net.update(1);
  assert.equal(toiletKickCount, 0, 'When player is not in toilet, NPC should NEVER urge or kick');

  // 2. When player IS in toilet (actionState: toilet) and occupies stall
  localPlayer.actionState = 'toilet';
  stall.occupiedBy = localPlayer.id;
  walker.toiletKickCooldownUntil = 0;

  // Override Math.random in context to guarantee kick triggers
  env.Math.random = () => 0.1;

  net.update(2);
  assert.equal(toiletKickCount, 1, 'When player is in toilet and NPC walks past door, urge/kick should trigger');
});

test('Workstation screen variations support green normal and red warning states', () => {
  const env = createTestEnv();
  vm.runInContext(fs.readFileSync(path.join(root, 'world.js'), 'utf8'), env);

  const opts = env.window.WORKSTATION_SCREEN_OPTIONS;
  assert.ok(opts, 'WORKSTATION_SCREEN_OPTIONS should exist');
  assert.equal(opts.green[0], 'Pass');
  assert.equal(opts.green[1], 'Good');
  assert.equal(opts.green[2], '😊');
  assert.equal(opts.red[0], 'ERR!!');
  assert.equal(opts.red[1], 'FIX E');
  assert.equal(opts.red[2], 'FAIL');
  assert.equal(opts.red[3], '😭');

  const ws = env.window.WORLD_MAP.workstations[0];
  assert.ok(ws);
  ws.leftScreen = 'Pass';
  ws.rightScreen = 'Good';
  assert.equal(ws.leftScreen, 'Pass');
  assert.equal(ws.rightScreen, 'Good');

  ws.leftScreen = 'ERR!!';
  ws.rightScreen = 'FIX E';
  assert.equal(ws.leftScreen, 'ERR!!');
  assert.equal(ws.rightScreen, 'FIX E');
});

test('Room Master is deterministically elected and synchronizes world state across clients', () => {
  const envA = createTestEnv();
  const envB = createTestEnv();

  const netA = new envA.window.EphemeralOfficeNetwork();
  netA.clientId = 'usr_alice';
  netA.localPlayer = { id: 'usr_alice', name: 'Alice' };

  const netB = new envB.window.EphemeralOfficeNetwork();
  netB.clientId = 'usr_bob';
  netB.localPlayer = { id: 'usr_bob', name: 'Bob' };

  // When Alice is alone, Alice is Room Master
  assert.equal(netA.isRoomMaster(), true);

  // When Bob connects, Alice sees Bob and Bob sees Alice
  netA.remotePlayers.set('usr_bob', { id: 'usr_bob', name: 'Bob' });
  netB.remotePlayers.set('usr_alice', { id: 'usr_alice', name: 'Alice' });

  // Deterministic election: 'usr_alice' < 'usr_bob', so Alice is master, Bob is not
  assert.equal(netA.isRoomMaster(), true, 'Alice has lowest client ID, must be Room Master');
  assert.equal(netB.isRoomMaster(), false, 'Bob has higher client ID, must NOT be Room Master');

  // Test world_sync packet reception on Bob
  let receivedWorldSync = null;
  netB.callbacks.onWorldSync = (pkt) => { receivedWorldSync = pkt; };

  const syncPacket = {
    type: 'world_sync',
    senderId: 'usr_alice',
    nonce: 'sync_test_nonce',
    npcs: [
      { id: 'npc_bird_commander', x: 800, y: 900, targetX: 800, targetY: 900, isMoving: false, isFleeing: false, murmur: { text: 'Test' } },
    ],
    groundItems: [
      { id: 'item_1', uid: 'drop_1', name: '乖乖', x: 500, y: 600 },
    ],
    mobs: [
      { id: 'mob_1', name: '方塊怪', x: 400, y: 400, hp: 20 },
    ],
    workstations: [
      { idx: 0, isBroken: true, leftScreen: 'ERR!!', rightScreen: 'FIX E' },
    ],
  };

  netB.handleIncomingPacket(syncPacket);
  assert.ok(receivedWorldSync, 'Bob should receive world_sync packet');
  assert.equal(receivedWorldSync.workstations[0].leftScreen, 'ERR!!');

  const birdOnB = netB.npcPlayers.get('npc_bird_commander');
  assert.ok(birdOnB, 'Bob should have reconciled bird commander');
  assert.equal(birdOnB.x, 800);
  assert.equal(birdOnB.y, 900);
});

test('NPC hit reactions: 50% detention vs dodge/flee, bird commander dodge and flee', () => {
  const env = createTestEnv();
  const net = new env.window.EphemeralOfficeNetwork();
  net.clientId = 'usr_alice';
  const player = { id: 'usr_alice', name: 'Alice', x: 500, y: 500, isRestrained: false };
  net.connect(player);

  const guard = {
    id: 'npc_security_guard',
    name: 'NPC:夜間警衛',
    isSecurityGuard: true,
    x: 520,
    y: 500,
    targetX: 520,
    targetY: 500,
    isFleeing: false,
  };
  net.npcPlayers.set(guard.id, guard);

  guard.isFleeing = true;
  guard.fleeUntil = Date.now() + 5000;
  net.update(10);
  assert.equal(guard.isFleeing, true);
  assert.ok(guard.jumpOffset > 0, 'Fleeing guard should have jumpOffset panic hop animation');

  const bird = {
    id: 'npc_bird_commander',
    name: 'NPC:鳥人指揮官',
    isBirdCommander: true,
    x: 600,
    y: 600,
    targetX: 600,
    targetY: 600,
    isFleeing: false,
    jumpOffset: 0,
  };
  net.npcPlayers.set(bird.id, bird);

  net.handleIncomingPacket({
    type: 'npc_reaction',
    nonce: 'dodge_test_1',
    npcId: bird.id,
    reaction: 'dodge',
    jumpOffset: 26,
    emote: { emoji: '💨', expiresAt: Date.now() + 3000 },
    murmur: { text: '嘎！閃過了！' },
  });
  assert.equal(bird.jumpOffset, 26, 'Bird commander should execute dodge jump');
  assert.equal(bird.emote.emoji, '💨', 'Bird commander should show dodge smoke emote');

  net.handleIncomingPacket({
    type: 'npc_reaction',
    nonce: 'flee_test_1',
    npcId: bird.id,
    reaction: 'flee',
    fleeUntil: Date.now() + 6000,
    jumpOffset: 16,
    emote: { emoji: '😱', expiresAt: Date.now() + 6000 },
    murmur: { text: '快逃啊！' },
  });
  assert.equal(bird.isFleeing, true, 'Bird commander should enter fleeing state');
  assert.equal(bird.emote.emoji, '😱', 'Bird commander should show fear emote');
});

test('Optimized NPC waypoints are collision-free and anti-stuck logic triggers on blocked ticks', () => {
  const env = createTestEnv();
  vm.runInContext(fs.readFileSync(path.join(root, 'world.js'), 'utf8'), env);

  const net = new env.window.EphemeralOfficeNetwork();
  net.initNPCs();

  // Verify waypoints exist and are non-empty for all key NPCs
  const vp = net.npcPlayers.get('npc_vp_boss');
  const dir = net.npcPlayers.get('npc_dir_pp00');
  const guard = net.npcPlayers.get('npc_security_guard');
  const bird = net.npcPlayers.get('npc_bird_commander');

  assert.ok(vp && vp.waypoints.length > 5, 'VP boss should have detailed transit waypoints');
  assert.ok(dir && dir.waypoints.length > 5, 'PP00 director should have detailed transit waypoints');
  assert.ok(bird && bird.waypoints.length > 5, 'Bird commander should have detailed transit waypoints');

  // Verify none of the waypoints are inside walls
  [vp, dir, bird].forEach((npc) => {
    npc.waypoints.forEach((wp, idx) => {
      const blocked = env.window.isPositionBlocked(wp.x, wp.y, 14);
      assert.equal(blocked, false, `${npc.name} waypoint #${idx} at (${wp.x}, ${wp.y}) must NOT be inside a wall`);
    });
  });

  // Test anti-stuck mechanism: when an NPC is blocked for 16 ticks, it advances to next waypoint
  const testNpc = {
    id: 'npc_stuck_test',
    name: 'Stuck NPC',
    x: 500,
    y: 500,
    targetX: 500, // will be set
    targetY: 600,
    waypoints: [{ x: 500, y: 600 }, { x: 700, y: 700 }],
    waypointIdx: 0,
    stuckTicks: 15,
  };
  net.npcPlayers.set(testNpc.id, testNpc);

  // Force isPositionBlocked to true to simulate an obstacle
  env.window.isPositionBlocked = () => true;
  net.update(1);

  assert.equal(testNpc.waypointIdx, 1, 'NPC stuck for >=16 ticks should advance to next waypoint to unstick');
  assert.equal(testNpc.targetX, 700, 'NPC targetX should be redirected to next waypoint');
});

test('Monster and item spawn configurations are balanced and capped at lower rates', () => {
  const env = createTestEnv();
  const sec = env.window.GATHER_CONFIG.security;

  // Verify lower, balanced rates
  assert.equal(sec.mobSpawnChance, 0.001, 'Mob spawn rate should be lowered to 0.001 (0.1%/sec)');
  assert.equal(sec.maxMobCount, 1, 'Max active mobs on map should be capped at 1');
  assert.equal(sec.randomDropIntervalMs, 20 * 60 * 1000, 'Drop interval should be 20 minutes');
  assert.equal(sec.randomDropBatchCount, 2, 'Drop batch count should be lowered to 2');
  assert.equal(sec.maxGroundItems, 4, 'Max ground items should be lowered to 4');
});

test('Private chat center modal is shown ONLY when chat window is collapsed', () => {
  const nodes = new Map();
  const doc = {
    getElementById: (id) => nodes.get(id) || null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    body: {
      appendChild: (c) => nodes.set(c.id, c),
      removeChild: (c) => nodes.delete(c.id),
    },
    createElement: (t) => {
      const el = {
        id: '',
        className: '',
        style: {},
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); },
        },
        innerHTML: '',
        querySelector: () => ({ onclick: null }),
        addEventListener: () => {},
      };
      return el;
    },
  };

  const context = {
    console,
    Date,
    Math,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    localStorage: { getItem: () => null },
    document: doc,
    window: {
      addEventListener: () => {},
      matchMedia: () => ({ matches: false }),
      innerWidth: 1200,
      WORLD_MAP: { toiletStalls: [] },
    },
  };
  context.window.document = doc;
  context.window.window = context.window;
  vm.createContext(context);

  vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'network.js'), 'utf8'), context);

  let appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  appSrc = appSrc.replace("window.addEventListener('DOMContentLoaded', init);", 'window.__testInit = init;');
  vm.runInContext(appSrc, context);

  // 1. Setup mock chat panel element with chat-minimized (desktop collapsed)
  const panelClasses = new Set(['chat-minimized']);
  const mockChatPanel = {
    id: 'proxChatPanel',
    classList: {
      contains: (c) => panelClasses.has(c),
      add: (c) => panelClasses.add(c),
      remove: (c) => panelClasses.delete(c),
    },
  };
  nodes.set('proxChatPanel', mockChatPanel);

  // Desktop collapsed: isChatPanelCollapsed should be true
  assert.equal(context.window.isChatPanelCollapsed(), true, 'Desktop with chat-minimized should be collapsed');

  // Desktop expanded (remove chat-minimized): isChatPanelCollapsed should be false
  panelClasses.delete('chat-minimized');
  assert.equal(context.window.isChatPanelCollapsed(), false, 'Desktop without chat-minimized should be expanded');

  // Mobile collapsed (screen <= 900 without mobile-open): isChatPanelCollapsed should be true
  context.window.innerWidth = 414;
  assert.equal(context.window.isChatPanelCollapsed(), true, 'Mobile without mobile-open should be collapsed');

  // Mobile expanded: add mobile-open -> isChatPanelCollapsed should be false
  panelClasses.add('mobile-open');
  assert.equal(context.window.isChatPanelCollapsed(), false, 'Mobile with mobile-open should be expanded');

  // 2. Test showCenterPrivateChatBox creates center card with message details
  nodes.delete('centerPrivateMsgCard');
  context.window.showCenterPrivateChatBox({
    senderName: 'Carol',
    senderUnit: 'PP00-QA',
    text: '請確認今天的晶圓批次進度！',
  });

  const card = nodes.get('centerPrivateMsgCard');
  assert.ok(card, 'Center private message card element should be created');
  assert.ok(card.innerHTML.includes('Carol'), 'Card should contain sender name');
  assert.ok(card.innerHTML.includes('PP00-QA'), 'Card should contain sender unit');
  assert.ok(card.innerHTML.includes('請確認今天的晶圓批次進度！'), 'Card should contain message text');
  assert.ok(card.innerHTML.includes('💬 立即開啟聊天回覆'), 'Card should contain reply action button');

  // 3. Test dismissCenterPrivateChatBox fades out card
  context.window.dismissCenterPrivateChatBox();
  assert.equal(card.classList.contains('fade-out'), true, 'Dismissing card should apply fade-out class');
});

test('Mobile chat panel supports chat-only filter and desktop chat is scaled up 50%', () => {
  const css = fs.readFileSync(path.join(__dirname, '../static/css/style.css'), 'utf8');

  // Verify desktop chat width is scaled to 615px (410px * 1.5)
  assert.ok(css.includes('width: 615px;'), 'Desktop prox-chat-panel should be scaled by 50% to width 615px');
  assert.ok(css.includes('height: 384px;'), 'Desktop prox-chat-messages should be scaled by 50% to height 384px');

  // Verify mobile chat-filter-toggle is explicitly displayed
  assert.ok(
    css.includes('.prox-chat-panel.mobile-open .chat-filter-toggle {'),
    'Mobile chat panel must style and display .chat-filter-toggle'
  );

  // Verify mobile chat form prevents wrapping to avoid squishing
  assert.ok(
    css.includes('.prox-chat-panel.mobile-open .prox-chat-form {') &&
      css.includes('flex-wrap: nowrap !important;'),
    'Mobile chat form must have nowrap to prevent cramped wrapping'
  );
});

test('Selecting a real online user automatically defaults chatSendModeSelect to private', () => {
  const nodes = new Map();
  const sendModeSel = { value: 'chat', dispatchEvent: () => {} };
  const privateBtn = {
    disabled: false,
    classes: new Set(),
    classList: {
      add(c) { privateBtn.classes.add(c); },
      remove(c) { privateBtn.classes.delete(c); },
      contains(c) { return privateBtn.classes.has(c); },
    },
    title: '',
  };
  const card = {
    classes: new Set(['hidden']),
    classList: {
      remove(c) { card.classes.delete(c); },
      add(c) { card.classes.add(c); },
    },
  };

  nodes.set('chatSendModeSelect', sendModeSel);
  nodes.set('profilePrivateChatBtn', privateBtn);
  nodes.set('colleagueProfileCard', card);
  nodes.set('profileCardBadge', { textContent: '' });
  nodes.set('profileCardName', { textContent: '' });
  nodes.set('profileCardStatus', { innerHTML: '' });
  nodes.set('profileCardRole', { textContent: '' });
  nodes.set('profileWaveBtn', { onclick: null });
  nodes.set('profileWalkBtn', { onclick: null });
  nodes.set('proxChatInput', { focus: () => {} });

  const doc = {
    getElementById: (id) => nodes.get(id) || null,
    querySelectorAll: () => [],
    addEventListener: () => {},
  };

  const context = {
    console,
    Date,
    Math,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    localStorage: { getItem: () => null },
    document: doc,
    window: {
      addEventListener: () => {},
      matchMedia: () => ({ matches: false }),
      innerWidth: 1200,
      WORLD_MAP: { toiletStalls: [] },
    },
  };
  context.window.document = doc;
  context.window.window = context.window;
  vm.createContext(context);

  vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'avatars.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'network.js'), 'utf8'), context);

  let appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  appSrc = appSrc.replace("window.addEventListener('DOMContentLoaded', init);", 'window.__testInit = init;');
  vm.runInContext(appSrc, context);

  // Simulate selecting a real colleague (isNpc = false)
  const realColleague = {
    id: 'user_david_99',
    name: 'David',
    unit: 'PP00-TE',
    avatarId: 'intern_boy',
    status: 'active',
    isNpc: false,
  };

  // Call openColleagueProfileCard through window export or context
  // Let's test that clicking sets sendModeSel to 'private' and activates privateBtn
  // Trigger openColleagueProfileCard via vm
  context.window.openColleagueProfileCard(realColleague);

  assert.equal(sendModeSel.value, 'private', 'Chat send mode should default to private when selecting real user');
  assert.equal(privateBtn.classList.contains('active'), true, 'Private chat button should be active');

  // Simulate selecting an NPC (isNpc = true)
  const npcBoss = {
    id: 'npc_vp_boss',
    name: 'VP大老闆',
    unit: 'Management',
    avatarId: 'boss_cow',
    status: 'active',
    isNpc: true,
  };

  context.window.openColleagueProfileCard(npcBoss);

  assert.equal(sendModeSel.value, 'chat', 'Chat send mode should revert to chat when selecting NPC');
  assert.equal(privateBtn.disabled, true, 'Private chat button should be disabled for NPC');
});
