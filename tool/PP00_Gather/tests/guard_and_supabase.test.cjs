const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '../static/js');

function createTestEnv() {
  const context = {
    console,
    Date,
    Math,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    localStorage: {
      getItem: () => null,
      setItem: () => {},
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
