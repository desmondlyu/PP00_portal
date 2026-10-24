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

  vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'network.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'supabaseSync.js'), 'utf8'), context);

  return context;
}

test('Ground item synchronization fallbacks prevent undefined labels or icons', () => {
  const env = createTestEnv();
  const net = new env.window.EphemeralOfficeNetwork();
  net.connect({ name: 'Alice', unit: 'PP10', x: 200, y: 200 });
  net.clientId = 'usr_zzz_client'; // Ensure client is not Room Master

  // Register remote Room Master
  net.upsertRemotePlayer({
    id: 'usr_000_master',
    name: 'Master',
    unit: 'PP00',
    avatarId: 'boss_cow',
    x: 100,
    y: 100,
  });

  const mockEcosystem = {
    groundItems: [],
  };
  env.ecosystem = mockEcosystem;
  env.window.ecosystem = mockEcosystem;

  net.callbacks = {
    onWorldSync: (pkt) => {
      if (Array.isArray(pkt.groundItems) && env.ecosystem) {
        env.ecosystem.groundItems = pkt.groundItems.map((gi) => {
          const confItem = (env.window.GATHER_CONFIG?.items || []).find((it) => it.id === gi.id)
            || (env.window.GATHER_CONFIG?.weapons || []).find((w) => w.id === gi.id) || {};
          return {
            uid: gi.uid || ('drop_' + gi.id),
            id: gi.id,
            name: gi.name || confItem.name || '道具',
            emoji: gi.emoji || gi.icon || confItem.emoji || '🎁',
            icon: gi.icon || gi.emoji || confItem.emoji || '🎁',
            category: gi.category || confItem.category || 'item',
            power: gi.power ?? confItem.power,
            x: gi.x,
            y: gi.y,
            dropY: gi.dropY || 0,
            type: gi.type,
            exp: gi.exp,
            score: gi.score,
          };
        });
      }
    },
  };

  const packet = {
    type: 'world_sync',
    nonce: 'nonce_sync_items_1',
    senderId: 'usr_000_master',
    groundItems: [
      { id: 'bench', x: 500, y: 500 }, // lacks name, emoji, icon
      { id: 'coffee', x: 600, y: 600, icon: '☕' }, // has icon
      { id: 'custom_unknown', x: 700, y: 700 }, // unknown id
    ],
  };

  net.handleIncomingPacket(packet);

  assert.equal(mockEcosystem.groundItems.length, 3);
  assert.equal(mockEcosystem.groundItems[0].name, '折疊板凳');
  assert.equal(mockEcosystem.groundItems[0].emoji, '🪑');
  assert.notEqual(mockEcosystem.groundItems[0].emoji, 'undefined');

  assert.equal(mockEcosystem.groundItems[1].name, '特濃冰美式');
  assert.equal(mockEcosystem.groundItems[1].emoji, '☕');

  assert.equal(mockEcosystem.groundItems[2].name, '道具');
  assert.equal(mockEcosystem.groundItems[2].emoji, '🎁');
  assert.notEqual(mockEcosystem.groundItems[2].emoji, 'undefined');
});

test('Bird commander and NPC positions/waypoints synchronize accurately with Room Master lease', () => {
  const env = createTestEnv();
  const net = new env.window.EphemeralOfficeNetwork();
  net.connect({ name: 'ClientB', unit: 'PP10', x: 200, y: 200 });
  net.clientId = 'usr_zzz_client'; // Ensure client is not Room Master

  // Register remote Room Master
  net.upsertRemotePlayer({
    id: 'usr_000_master',
    name: 'Master',
    unit: 'PP00',
    avatarId: 'boss_cow',
    x: 100,
    y: 100,
  });

  const bird = net.npcPlayers.get('npc_bird_commander');
  assert.ok(bird);

  const now = Date.now();
  const remotePkt = {
    type: 'world_sync',
    nonce: 'nonce_sync_npc_1',
    senderId: 'usr_000_master',
    npcs: [
      {
        id: 'npc_bird_commander',
        x: 1200,
        y: 600,
        targetX: 1240,
        targetY: 600,
        dir: 'right',
        actionState: 'sit_code',
        isMoving: true,
        isBerserk: false,
        isFleeing: false,
        followTargetId: 'usr_000_master',
        followPlayerUntil: now + 12000,
        waypointIdx: 4,
      },
    ],
  };

  net.handleIncomingPacket(remotePkt);

  assert.equal(bird.x, 1200);
  assert.equal(bird.y, 600);
  assert.equal(bird.targetX, 1240);
  assert.equal(bird.actionState, 'sit_code');
  assert.equal(bird.followTargetId, 'usr_000_master');
  assert.equal(bird.followPlayerUntil, now + 12000);
  assert.equal(bird.waypointIdx, 4);

  // During active master lease, ClientB preserves Master followTargetId
  env.window.GATHER_CONFIG.security.birdFollowChance = 1.0;
  net.update(60);
  assert.equal(bird.followTargetId, 'usr_000_master', 'Client should preserve Master followTargetId during lease');
});

test('Mobile viewport and chat form styles prevent auto-zoom and horizontal layout disruption', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../static/css/style.css'), 'utf8');

  // Verify viewport meta has maximum-scale=1.0 and user-scalable=no
  assert.match(html, /<meta name="viewport"[^>]*maximum-scale=1\.0[^>]*user-scalable=no/, 'Viewport must restrict unwanted scaling');

  // Verify body/html has overflow-x: hidden
  assert.match(css, /overflow-x:\s*hidden\s*!important;/, 'CSS body/html must prevent horizontal overflow');

  // Verify mobile chat form input enforces 16px font-size to prevent iOS auto-zoom
  assert.match(css, /\.prox-chat-panel\.mobile-open\s+\.prox-chat-form\s+input\s*\{[^}]*font-size:\s*16px\s*!important/s, 'Mobile chat input must be 16px to prevent iOS auto-zoom');

  // Verify landscape orientation styling for mobile
  assert.match(css, /orientation:\s*landscape/, 'CSS must include landscape orientation responsive styling');
});
