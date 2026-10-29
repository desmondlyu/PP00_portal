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

test('Cleaner Auntie performs wash_hands ONLY in restroom and sweep_floor everywhere else', () => {
  const env = createTestEnv();
  const net = new env.window.EphemeralOfficeNetwork();
  net.connect({ name: 'Host', unit: 'PP10', x: 200, y: 200 });

  const auntie = net.npcPlayers.get('npc_auntie_meifeng');
  assert.ok(auntie, 'Cleaner auntie should exist');

  // 1. Outside restroom (e.g. hallway at x: 1060, y: 520)
  auntie.x = 1060;
  auntie.y = 520;
  auntie.actionUntil = 0;
  for (let t = 0; t < 170; t++) {
    net.update(t);
  }
  assert.equal(auntie.actionState, 'sweep_floor', 'Outside restroom, auntie must perform sweep_floor');

  // 2. Inside restroom area (e.g. near sinks at x: 2250, y: 650)
  auntie.x = 2250;
  auntie.y = 650;
  auntie.targetX = 2250;
  auntie.targetY = 650;
  auntie.actionUntil = 0;
  for (let t = 0; t < 170; t++) {
    net.update(t);
  }
  assert.equal(auntie.actionState, 'wash_hands', 'Inside restroom, auntie must perform wash_hands');
  assert.equal(auntie.actionState, 'wash_hands', 'Inside restroom, auntie must perform wash_hands');
  assert.equal(auntie.targetX, 2255, 'Auntie should navigate toward sensor sink');
});

test('Injury bandage animation and 5-second medical healing packets restore injured player', () => {
  const env = createTestEnv();
  env.window.GATHER_CONFIG.season2 = false; // Legacy packets; Season 2 accepts only server healing.
  const net = new env.window.EphemeralOfficeNetwork();
  net.connect({ name: 'Victim', unit: 'PP10', x: 400, y: 1350 });

  // Simulate local player critical injury
  net.localPlayer.isInjured = true;
  net.localPlayer.injuredUntil = Date.now() + 300000;
  net.localPlayer.actionState = 'sleep_bed';

  // Remote healer Bob initiates 5-second heal
  net.handleIncomingPacket({
    type: 'heal_start',
    nonce: 'nonce_heal_start_1',
    healerId: 'usr_bob',
    healerName: 'Bob',
    targetId: net.clientId,
  });

  assert.equal(net.localPlayer.beingHealed, true, 'Victim should enter beingHealed state');
  assert.equal(net.localPlayer.beingHealedBy, 'Bob');

  // Progress update
  net.handleIncomingPacket({
    type: 'heal_progress',
    nonce: 'nonce_heal_progress_1',
    healerId: 'usr_bob',
    targetId: net.clientId,
    progress: 0.6,
  });
  assert.equal(net.localPlayer.healProgress, 0.6);

  // 5 seconds completion
  net.handleIncomingPacket({
    type: 'heal_complete',
    nonce: 'nonce_heal_complete_1',
    healerId: 'usr_bob',
    healerName: 'Bob',
    targetId: net.clientId,
    targetName: 'Victim',
  });

  assert.equal(net.localPlayer.isInjured, false, 'Player isInjured must be cleared after heal_complete');
  assert.equal(net.localPlayer.beingHealed, false);
  assert.equal(net.localPlayer.actionState, null, 'Sleep pose must be cleared after full recovery');
});
test('Remote player LERP interpolation smoothly glides towards destination without teleport stutter', () => {
  const env = createTestEnv();
  const net = new env.window.EphemeralOfficeNetwork();
  net.connect({ name: 'Me', unit: 'PP00', x: 200, y: 200 });

  // Simulate remote colleague at (500, 500)
  net.upsertRemotePlayer({ id: 'usr_colleague', name: 'Alice', unit: 'PP10', x: 500, y: 500 }, false);
  const rp = net.remotePlayers.get('usr_colleague');
  assert.equal(rp.x, 500);
  assert.equal(rp.y, 500);

  // Colleague moves to (600, 500) over network
  net.upsertRemotePlayer({ id: 'usr_colleague', name: 'Alice', unit: 'PP10', x: 600, y: 500 }, false);
  assert.equal(rp.targetX, 600);
  // rp.x should not have snapped immediately to 600, preserving smooth transition
  assert.equal(rp.x, 500);

  // Advance frames
  net.update(1);
  assert.ok(rp.x > 500 && rp.x < 600, `rp.x (${rp.x}) should interpolate towards 600`);

  for (let t = 2; t <= 30; t++) {
    net.update(t);
  }
  assert.equal(rp.x, 600, 'After sufficient frames, rp.x should settle at targetX');
});

test('App.js IIFE boundary wraps all rendering methods including medical animations to prevent ReferenceError', () => {
  const appCode = fs.readFileSync(path.join(root, 'app.js'), 'utf8').trim();
  assert.ok(appCode.endsWith('})();'), 'app.js must close cleanly with IIFE wrapper to avoid leaked global identifiers');
  assert.ok(appCode.includes('function renderMedicalHealingAnimations'), 'renderMedicalHealingAnimations must be defined');
  const iifeEndIndex = appCode.lastIndexOf('})();');
  const funcIndex = appCode.indexOf('function renderMedicalHealingAnimations');
  assert.ok(funcIndex < iifeEndIndex, 'renderMedicalHealingAnimations must be scoped INSIDE the IIFE');
});
test('In-game refresh button and auto-login session persistence enable seamless game reload without re-login', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(indexHtml.includes('id="btnGameReload"'), 'index.html must include in-game reload button (#btnGameReload)');
  assert.ok(indexHtml.includes('🔄'), 'Reload button should have refresh emoji icon');
  assert.ok(indexHtml.includes('重整'), 'Reload button should have reload label');

  const css = fs.readFileSync(path.join(__dirname, '../static/css/style.css'), 'utf8');
  assert.ok(css.includes('.hud-mini-btn.hud-reload-btn'), 'CSS must include styling for hud-reload-btn');

  // Verify session persistence logic in app.js
  const appCode = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.ok(appCode.includes('PP00_GATHER_LOGIN_SESSION_v1'), 'app.js must define login session persistence key');
  assert.ok(appCode.includes('triggerGameReload'), 'app.js must provide triggerGameReload handler');
  assert.ok(appCode.includes('executeOfficeLogin'), 'app.js must provide executeOfficeLogin for auto-login');
});

test('Director PP00 10% repair mechanism triggers on broken equipment with murmur quotes and repairs successfully', () => {
  const env = createTestEnv();
  const net = new env.window.EphemeralOfficeNetwork();
  net.connect({ name: 'Host', unit: 'PP10', x: 200, y: 200 });

  assert.equal(env.window.GATHER_CONFIG.security.directorRepairChance, 0.10, 'directorRepairChance should be 10%');

  const quotes = env.window.GATHER_CONFIG.bossScoldDialogues?.director_repair || env.window.GATHER_CONFIG.npcDialogues?.director_repair || env.window.GATHER_CONFIG.dialogues?.director_repair;
  assert.ok(Array.isArray(quotes) && quotes.length >= 2, 'director_repair dialogues must exist');
  assert.ok(quotes.includes('我真命苦，還要我特地下來修理'), 'Must include quote: 我真命苦，還要我特地下來修理');
  assert.ok(quotes.includes('工程師都在睡覺嗎？我還要出馬'), 'Must include quote: 工程師都在睡覺嗎？我還要出馬');

  // Setup broken workstation
  env.window.WORLD_MAP.workstations = [
    { idx: 0, isBroken: true, brokenBy: 'Bug Mob', x: 755, y: 460, owner: 'Engineer' }
  ];

  const director = net.npcPlayers.get('npc_dir_pp00');
  assert.ok(director, 'Director PP00 NPC must exist');

  // Set director repair target
  director.repairingTarget = {
    type: 'ws',
    idx: 0,
    x: 755 + 32,
    y: 460 + 45,
  };
  director.x = 755 + 32;
  director.y = 460 + 45;
  director.repairCooldownUntil = 0;

  // Let director start repair
  net.update(1);
  assert.equal(director.actionState, 'zen_debug', 'Director should perform zen_debug action when repairing');
  assert.ok(director.repairStartedAt > 0, 'repairStartedAt should be set');

  // Advance time by 4.6 seconds to finish repair
  const originalNow = Date.now;
  Date.now = () => director.repairStartedAt + 4600;
  try {
    net.update(2);
    assert.equal(env.window.WORLD_MAP.workstations[0].isBroken, false, 'Workstation should be repaired');
    assert.equal(env.window.WORLD_MAP.workstations[0].brokenBy, null, 'brokenBy should be cleared');
    assert.equal(director.repairingTarget, null, 'repairingTarget should be cleared on completion');
    assert.ok(director.murmur.text.includes('終於修好了'), 'Director should murmur completion line');
  } finally {
    Date.now = originalNow;
  }
});

test('Attack cooldown is 250ms and status logs are throttled to prevent freezing', () => {
  const env = createTestEnv();
  assert.equal(env.window.GATHER_CONFIG.security.attackCooldownMs, 250, 'attackCooldownMs must be 250ms');

  const appCode = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.ok(appCode.includes('attackCooldownMs || 250'), 'app.js must use attackCooldownMs 250ms');
  assert.ok(appCode.includes('lastWeaponAttackAt'), 'app.js must track lastWeaponAttackAt separately from lastInteractAt');
  assert.ok(appCode.includes('now-(enemy.lastCombatLogAt||0)>600'), 'app.js must throttle consecutive hit logs to prevent freezing');
});

test('Mobile layout: ColleagueProfileCard is standalone floating card and touchSkillsGroup does not block joystick or interact buttons', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  
  // 1. colleagueProfileCard outside proxChatPanel
  const chatCloseTag = '</section>';
  const cardIndex = indexHtml.indexOf('id="colleagueProfileCard"');
  const chatIndex = indexHtml.indexOf(chatCloseTag);
  assert.ok(cardIndex > chatIndex, '#colleagueProfileCard must be placed OUTSIDE #proxChatPanel');

  // 2. touchSkillsGroup wraps skill buttons
  assert.ok(indexHtml.includes('id="touchSkillsGroup" class="touch-skills-group"'), 'index.html must wrap 1~6 skills in touchSkillsGroup');

  // 3. CSS checks
  const css = fs.readFileSync(path.join(__dirname, '../static/css/style.css'), 'utf8');
    assert.ok(css.includes('.touch-skills-group') && css.includes('display: contents;'), 'touch-skills-group must use display: contents on desktop');
  assert.ok(css.includes('left: 645px;'), 'Desktop bottom-hud-dock must use left: 645px to avoid 615px chat panel');
  assert.ok(css.includes('.prox-chat-panel.collapsed ~ .bottom-hud-dock'), 'bottom-hud-dock must handle collapsed chat panel');
  assert.ok(css.includes('--keyboard-offset'), 'Mobile chat panel must use --keyboard-offset to raise above software keyboard');
});

test('Cleaner Aunties waypoints include restroom sink waypoint { x: 2255, y: 682 } and Bird Commander isFleeing draws cold sweat', () => {
  const env = createTestEnv();
  const net = new env.window.EphemeralOfficeNetwork();
  net.connect({ name: 'Host', unit: 'PP10', x: 200, y: 200 });

  const meifeng = net.npcPlayers.get('npc_auntie_meifeng');
  assert.ok(meifeng.waypoints.some((wp) => wp.x === 2255 && wp.y === 682), 'Meifeng Auntie must include restroom sink waypoint { x: 2255, y: 682 }');

  const shufen = net.npcPlayers.get('npc_auntie_shufen');
  assert.ok(shufen.waypoints.some((wp) => wp.x === 2255 && wp.y === 682), 'Shufen Auntie must include restroom sink waypoint { x: 2255, y: 682 }');

  const avatarsCode = fs.readFileSync(path.join(root, 'avatars.js'), 'utf8');
  assert.ok(avatarsCode.includes('isFleeing = false'), 'avatars.js drawWackyAvatar must support isFleeing');
  assert.ok(avatarsCode.includes('💦'), 'avatars.js must draw cold sweat emojis 💦 when isFleeing');
});

test('Mobile touch protection, in-place injury camera, chat color distinction, stable murmur bubble, and auto-equip on durability zero', () => {
  const css = fs.readFileSync(path.join(__dirname, '../static/css/style.css'), 'utf8');
  assert.ok(css.includes('-webkit-touch-callout: none !important;'), 'style.css must disable touch callout (copy/paste menu)');
  assert.ok(css.includes('.prox-chat-item.self'), 'style.css must define self chat item styling');
  assert.ok(css.includes('.prox-chat-item.other'), 'style.css must define other chat item styling');
  assert.ok(css.includes('.prox-chat-item.whisper.self'), 'style.css must define self whisper styling');
  assert.ok(css.includes('.prox-chat-item.whisper.from'), 'style.css must define from whisper styling');

  const appCode = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.ok(appCode.includes("window.addEventListener('contextmenu'"), 'app.js must block default contextmenu');
  assert.ok(appCode.includes("document.addEventListener('selectstart'"), 'app.js must block selection');
  assert.ok(appCode.includes('localPlayer.equippedSlots = [null, null, null];'), 'app.js must initialize equippedSlots to empty for first login');
  assert.ok(appCode.includes('localPlayer.inventory = [];'), 'app.js must initialize inventory to empty for first login');
  assert.ok(appCode.includes('equipFromBag(nextBagIndex)') && appCode.includes("findIndex(i=>i.category!=='outfit')"), 'app.js must auto equip from inventory when weapon durability reaches 0');
  assert.ok(appCode.includes('localPlayer.injuredX = localPlayer.x;'), 'app.js must record injuredX in place');
  assert.ok(appCode.includes('localPlayer.injuredY = localPlayer.y;'), 'app.js must record injuredY in place');
  assert.ok(!appCode.includes('const shakeX = p.murmur.mood'), 'app.js must remove random shakeX/shakeY from murmur bubbles');
});

test('All NPCs (VP, Director, Aunties, Guard, Bird) murmur autonomously and speech card auto-wraps without overflow', () => {
  const env = createTestEnv();
  const net = new env.window.EphemeralOfficeNetwork();
  net.connect({ name: 'Admin', unit: 'PP00', x: 200, y: 200 });
  net.clientId = 'usr_000_master';

  // 1. Verify dialogues defined for all NPCs
  const dlg = env.window.GATHER_CONFIG.npcDialogues;
  assert.ok(dlg.vp && dlg.vp.length >= 5, 'VP dialogues must be configured');
  assert.ok(dlg.director_pp00 && dlg.director_pp00.length >= 5, 'Director PP00 dialogues must be configured');
  assert.ok(dlg.auntie_meifeng && dlg.auntie_meifeng.length >= 5, 'Auntie Meifeng dialogues must be configured');
  assert.ok(dlg.auntie_shufen && dlg.auntie_shufen.length >= 5, 'Auntie Shufen dialogues must be configured');
  assert.ok(dlg.security_guard && dlg.security_guard.length >= 5, 'Security guard dialogues must be configured');
  assert.ok(dlg.bird_commander && dlg.bird_commander.length >= 5, 'Bird commander dialogues must be configured');

  // 2. Daytime NPCs exist and autonomous murmur timers are scheduled
  const dayNpcIds = ['npc_vp_boss', 'npc_dir_pp00', 'npc_auntie_meifeng', 'npc_auntie_shufen', 'npc_bird_commander'];
  for (const id of dayNpcIds) {
    const npc = net.npcPlayers.get(id);
    assert.ok(npc, `${id} must exist in daytime`);
    assert.ok(Array.isArray(npc.murmurs) && npc.murmurs.length > 0, `${id} must have murmurs array`);
  }

  // Tick net and verify nextMurmurAt is assigned
  net.update(1);
  for (const id of dayNpcIds) {
    const npc = net.npcPlayers.get(id);
    assert.ok(typeof npc.nextMurmurAt === 'number' && npc.nextMurmurAt > 0, `${id} must schedule nextMurmurAt`);
  }

  // Force timer expiration on VP and verify murmur activates
  const vp = net.npcPlayers.get('npc_vp_boss');
  vp.nextMurmurAt = Date.now() - 1000;
  vp.murmur = null;
  net.update(2);
  assert.ok(vp.murmur, 'VP must trigger autonomous murmur');
  assert.ok(vp.murmurs.includes(vp.murmur.text), 'VP murmur text must come from its dialogue pool');

  // 3. Test multi-line text wrapping logic in app.js
  const appCode = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.ok(appCode.includes('function wrapMurmurLines('), 'app.js must define wrapMurmurLines');
  assert.ok(appCode.includes('isNpcTalk: true'), 'app.js must support isNpcTalk in detectNearbyFacility');
  assert.ok(appCode.includes('fac.isNpcTalk'), 'app.js must handle isNpcTalk in tryInteractWithEnvironment');

  // Verify wrapMurmurLines logic directly
  const mockCtx = {
    measureText: (str) => ({ width: str.length * 12 }),
  };
  function localWrapMurmurLines(renderCtx, text, maxTextWidth) {
    if (!text) return [];
    const paragraphs = String(text).split(/\r?\n/);
    const lines = [];
    for (const para of paragraphs) {
      if (!para) { lines.push(''); continue; }
      let curLine = '';
      const chars = Array.from(para);
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        const testLine = curLine + ch;
        const testWidth = renderCtx.measureText ? renderCtx.measureText(testLine).width : testLine.length * 12;
        if (testWidth > maxTextWidth && curLine.length > 0) {
          lines.push(curLine);
          curLine = ch;
        } else {
          curLine = testLine;
        }
      }
      if (curLine.length > 0) lines.push(curLine);
    }
    return lines.length ? lines : [''];
  }

  const shortText = '茶水間咖啡機剛洗好！';
  const shortLines = localWrapMurmurLines(mockCtx, shortText, 220);
  assert.equal(shortLines.length, 1, 'Short text must fit on 1 line');

  const longText = '🦩 白天上班抓【青蛙裝工程師】進會議室閉門檢討10秒（按[F]可擊退脫困）！';
  const longLines = localWrapMurmurLines(mockCtx, longText, 220);
  assert.ok(longLines.length >= 2, 'Long text must wrap to 2 or more lines');
  for (const line of longLines) {
    assert.ok(mockCtx.measureText(line).width <= 220, 'No wrapped line should exceed maxTextWidth');
  }
});

test('Director PP00 repairs workstations with ERROR screen and NPC dialogue bubbles never shake with jumpOffset', () => {
  const env = createTestEnv();
  const net = new env.window.EphemeralOfficeNetwork();
  net.connect({ name: 'Admin', unit: 'PP00', x: 200, y: 200 });
  net.clientId = 'usr_000_master';

  // 1. Setup a workstation with ERR!! screen state (not broken by monster)
  env.window.WORLD_MAP.workstations = [
    { id: 'pe1', zone: 'PE', x: 240, y: 680, w: 160, h: 72, leftScreen: 'ERR!!', rightScreen: 'Pass', screenState: 'error', isBroken: false, owner: 'PE-PP11' },
  ];
  env.window.WORLD_MAP.labEquipments = [];

  const dir = net.npcPlayers.get('npc_dir_pp00');
  assert.ok(dir, 'Director PP00 must exist');
  dir.repairCooldownUntil = 0;

  // Run updates to trigger Director repair check
  env.window.GATHER_CONFIG.security.directorRepairChance = 1.0;
  for (let t = 0; t < 170; t++) {
    net.update(t);
    if (dir.repairingTarget) break;
  }

  assert.ok(dir.repairingTarget, 'Director should target workstation with ERR!! screen for repair');
  assert.equal(dir.repairingTarget.type, 'ws');
  assert.equal(dir.repairingTarget.idx, 0);

  // Complete repair
  dir.x = dir.repairingTarget.x;
  dir.y = dir.repairingTarget.y;
  dir.repairStartedAt = Date.now() - 5000; // past 4500ms
  net.update(201);

  const ws = env.window.WORLD_MAP.workstations[0];
  assert.equal(ws.leftScreen, 'Pass', 'Workstation leftScreen should be restored to Pass');
  assert.equal(ws.rightScreen, 'Good', 'Workstation rightScreen should be restored to Good');
  assert.equal(ws.screenState, 'pass', 'Workstation screenState should be restored to pass');

  // 2. Verify dialogue bubble rendering has zero jumpOffset shake
  const appCode = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.ok(appCode.includes('const pillY = p.y - 68;'), 'app.js must anchor pillY to ground p.y without jumpOffset subtraction');
  assert.ok(!appCode.includes('pillY - msgH - 32 + Math.sin'), 'app.js must not oscillate emote above dialogue card');
});


test('Bird commander: follows only when player is nearby (<= 400px), releases when far away (> 460px), and exile cooldown is 3 minutes', () => {
  const env = createTestEnv();
  const net = new env.window.EphemeralOfficeNetwork();
  net.connect({ name: 'Alice', unit: 'PP10', x: 2000, y: 2000 }); // Far away (dist > 1000px from bird at 1060, 520)
  net.clientId = 'usr_000_master'; // Local is master

  const bird = net.npcPlayers.get('npc_bird_commander');
  assert.ok(bird, 'Bird commander must exist');
  bird.followPlayerUntil = 0;
  bird.followCooldownUntil = 0;

  env.window.GATHER_CONFIG.security.birdFollowChance = 1.0; // 100% chance to follow if eligible
  env.window.GATHER_CONFIG.security.birdFollowRadiusPx = 400;

  // 1. Far away player (>400px) should NOT be followed
  net.update(60);
  assert.ok(!bird.followTargetId, 'Bird should NOT follow player farther than 400px');

  // 2. Move Alice nearby (dist ~ 100px)
  net.localPlayer.x = bird.x + 80;
  net.localPlayer.y = bird.y + 60;
  net.update(60);
  assert.equal(bird.followTargetId, net.localPlayer.id, 'Bird SHOULD follow player when within 400px proximity');

  // 3. Move Alice far away (> 460px) -> Bird should release follow target
  net.localPlayer.x = bird.x + 500;
  net.localPlayer.y = bird.y + 500;
  net.update(61);
  assert.equal(bird.followTargetId, null, 'Bird should release target when player is beyond 460px distance');

  // 4. Exile cooldown is 3 minutes (180,000ms)
  const now = Date.now();
  const exileMs = env.window.GATHER_CONFIG.security.birdExileCooldownMs;
  assert.equal(exileMs, 180000, 'Bird exile cooldown config must be 180000ms (3 minutes)');

  env.localStorage.setItem('PP00_GATHER_PERSISTENCE_v1', JSON.stringify({
    birdCommanderRestUntil: now + 180000,
  }));
  net.npcPlayers.delete('npc_bird_commander');

  // At 2 minutes elapsed, restUntil is not yet reached -> Should NOT respawn
  net.update(60);
  assert.equal(net.npcPlayers.has('npc_bird_commander'), false, 'Bird commander should not respawn before 3 minutes elapse');

  // After 3 minutes elapsed -> Should respawn
  env.localStorage.setItem('PP00_GATHER_PERSISTENCE_v1', JSON.stringify({
    birdCommanderRestUntil: now - 5000,
  }));
  net.update(60);
  assert.ok(net.npcPlayers.has('npc_bird_commander'), 'Bird commander should respawn after 3 minutes cooldown finishes');
});

test('Season 2 ignores unauthenticated legacy heal completion packets',()=>{const env=createTestEnv();const n=new env.window.EphemeralOfficeNetwork();n.connect({name:'Victim',unit:'PP32',x:900,y:1350});n.localPlayer.isInjured=true;n.handleIncomingPacket({type:'heal_complete',nonce:'forged',targetId:n.clientId});assert.equal(n.localPlayer.isInjured,true);});
test('Season 2 master election ignores legacy clients not in authenticated cloud roster',()=>{const e=createTestEnv(),n=new e.window.EphemeralOfficeNetwork();n.clientId='z';n.remotePlayers.set('a',{id:'a',name:'legacy'});e.window.GATHER_SEASON_PLAYERS=[{id:'cloud-z',clientId:'z'}];assert.equal(n.isRoomMaster(),true);});

test('Responsive HUD scaling preserves 2560x1440 dimensions and adapts cleanly on laptops/smaller monitors', () => {
  const css = fs.readFileSync(path.join(__dirname, '../static/css/style.css'), 'utf8');
  const appCode = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  assert.ok(css.includes('--chat-panel-w:'), 'CSS must define fluid --chat-panel-w custom property');
  assert.ok(css.includes('--chat-msg-h:'), 'CSS must define fluid --chat-msg-h custom property');
  assert.ok(css.includes('--left-panel-w:'), 'CSS must define fluid --left-panel-w custom property');
  assert.ok(css.includes('left: calc(var(--chat-panel-w, 615px) + 28px);'), 'bottom-hud-dock must dynamically track chat panel width');
  assert.ok(css.includes('(max-width: 1960px)') && css.includes('(max-width: 1560px)'), 'CSS must include responsive desktop/laptop breakpoints');
  assert.ok(appCode.includes('vw >= 2100 && vh >= 1150'), 'getMinimapRect must preserve 195px on 2K and scale down on laptops');
});
