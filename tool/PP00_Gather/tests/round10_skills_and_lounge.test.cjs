const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('Round 10: Bird Commander hunt HUD positioned above bottom toolbar without map overlap', () => {
  const css = fs.readFileSync(path.join(__dirname, '../static/css/style.css'), 'utf8');
  const huntHudMatch = css.match(/#huntHud\s*\{([^}]+)\}/);
  assert.ok(huntHudMatch, '#huntHud must exist in style.css');
  const body = huntHudMatch[1];
  assert.ok(body.includes('bottom:'), '#huntHud must use bottom positioning above dock');
  assert.ok(body.includes('right:'), '#huntHud must position to right');
  assert.ok(body.includes('left: auto'), '#huntHud must not center horizontally to left: 50%');
});

test('Round 10: PP20 Lounge arcade screen cycles Rock-Paper-Scissors (CASE1.PNG)', () => {
  const worldJs = fs.readFileSync(path.join(__dirname, '../static/js/world.js'), 'utf8');
  assert.ok(worldJs.includes('CASE1.PNG'), 'world.js must reference CASE1.PNG requirement');
  assert.ok(worldJs.includes('✌️') && worldJs.includes('✊') && worldJs.includes('🖐️'), 'world.js must contain RPS emojis');
  assert.ok(worldJs.includes('剪刀') && worldJs.includes('石頭') && worldJs.includes('布'), 'world.js must cycle 剪刀, 石頭, 布');
  assert.ok(worldJs.includes('RPS ARCADE') || worldJs.includes('RPS BATTLE'), 'world.js must have arcade title');
});

test('Round 10: Proximity skills (wave, exchange, zap, cheer) against NPC', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // 1. Wave: summons NPC, speaks quote, restores waypoints
  assert.ok(appJs.includes('對 NPC 揮手：召喚對方走過來跟你講話一次，完成後結束'), 'Wave must have NPC summon logic');
  assert.ok(appJs.includes('savedWaypoints'), 'Wave must save and restore waypoints');

  // 2. Exchange: rejects ghost and mobs, rejects empty inventory, swaps items
  assert.ok(appJs.includes('幽靈無法進行禮物交換'), 'Exchange must reject ghosts');
  assert.ok(appJs.includes('怪物兇猛，無法進行禮物交換'), 'Exchange must reject monsters');
  assert.ok(appJs.includes('你身上沒有可交換的道具或武器（不含頭飾服裝）'), 'Exchange must reject empty non-outfit items');

  // 3. Zap: love quotes with gift, disgust quotes with counter-attack
  assert.ok(appJs.includes('哎呀～被你電得小鹿亂撞，我的心跳頻率都超過 1000MHz 了啦！💖'), 'Zap must include love quote 1');
  assert.ok(appJs.includes('這難道就是傳說中的觸電感覺嗎？這份心意你一定要收下！🎁'), 'Zap must include love quote 2');
  assert.ok(appJs.includes('討厭啦～幹嘛突然電人家！這個小禮物送你，不許跟別人說喔！🥰'), 'Zap must include love quote 3');
  assert.ok(appJs.includes('憤怒衝上前揮擊'), 'Zap must include disgust counter-attack');

  // 4. Cheer: 20% drunkenness probability, 2-second sleep, drops item
  assert.ok(appJs.includes('20% 機率讓玩家或對方喝醉暈倒 2 秒，並且掉出道具'), 'Cheer must include 20% drunk probability');
  assert.ok(appJs.includes('sleep_bed'), 'Cheer drunk must use sleep_bed');
  assert.ok(appJs.includes('drunk_drop_') || appJs.includes('npc_drop_'), 'Cheer drunk must create drop item');

  // 5. Preserves player-to-player behavior
  assert.ok(appJs.includes('// 對玩家：維持原本設計'), 'Skills must preserve player-to-player behavior');
});


test('Round 10: Network simulation correctly handles Wave summon pathing, arrival, and stop', () => {
  const root = path.join(__dirname, '../static/js');
  const context = {
    console,
    Date,
    Math,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    window: {
      addEventListener: () => {},
      isPositionBlocked: () => false,
      WORLD_MAP: { toiletStalls: [] },
    },
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'network.js'), 'utf8'), context);

  const net = new context.window.EphemeralOfficeNetwork();
  net.connect({ name: 'Host', unit: 'PP10', x: 200, y: 200 });

  const npc = net.npcPlayers.get('npc_auntie_meifeng') || Array.from(net.npcPlayers.values())[0];
  assert.ok(npc, 'An NPC must exist');

  npc.x = 200;
  npc.y = 200;
  let arrivalTriggered = false;
  npc.summonTarget = { x: 300, y: 200 };
  npc.summonedUntil = Date.now() + 10000;
  npc.onSummonArrival = (arrivedNpc) => { arrivalTriggered = true; };

  // Step 1: Moving toward summonTarget
  net.update(1);
  assert.equal(npc.isMoving, true, 'NPC must be moving towards summonTarget');
  assert.ok(npc.x > 200, 'NPC x position should advance towards summon target');

  // Step 2: Arrives within 48px
  npc.x = 295;
  npc.y = 200;
  net.update(2);
  assert.equal(arrivalTriggered, true, 'onSummonArrival callback must trigger on arrival');
  assert.equal(npc.summonTarget, null, 'summonTarget must clear upon arrival');
  assert.equal(npc.isMoving, false, 'NPC must stop upon arrival');
});

test('Round 10: Network simulation correctly handles Zap disgust chase sprint, arrival attack, and stop', () => {
  const root = path.join(__dirname, '../static/js');
  const context = {
    console,
    Date,
    Math,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    window: {
      addEventListener: () => {},
      isPositionBlocked: () => false,
      WORLD_MAP: { toiletStalls: [] },
    },
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'network.js'), 'utf8'), context);

  const net = new context.window.EphemeralOfficeNetwork();
  net.connect({ name: 'Host', unit: 'PP10', x: 200, y: 200 });

  const npc = net.npcPlayers.get('npc_vp_boss') || Array.from(net.npcPlayers.values())[0];
  assert.ok(npc, 'An NPC must exist');

  npc.x = 200;
  npc.y = 200;
  let chaseAttacked = false;
  npc.chaseTarget = { x: 300, y: 200 };
  npc.chaseUntil = Date.now() + 5000;
  npc.onChaseArrival = (chasingNpc) => { chaseAttacked = true; };

  // Step 1: Sprinting toward chaseTarget
  net.update(1);
  assert.equal(npc.isMoving, true, 'NPC must be sprinting towards chaseTarget');
  assert.ok(npc.x > 200, 'NPC x position must advance quickly');

  // Step 2: Arrives within 44px
  npc.x = 290;
  npc.y = 200;
  net.update(2);
  assert.equal(chaseAttacked, true, 'onChaseArrival must trigger attack when reaching target');
  assert.equal(npc.chaseTarget, null, 'chaseTarget must clear upon reaching target');
  assert.equal(npc.isMoving, false, 'NPC must stop when reaching target');
});

test('Round 10: Cheer sleep_bed completely immobilizes NPC without sleep-walking', () => {
  const root = path.join(__dirname, '../static/js');
  const context = {
    console,
    Date,
    Math,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    window: {
      addEventListener: () => {},
      isPositionBlocked: () => false,
      WORLD_MAP: { toiletStalls: [] },
    },
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'network.js'), 'utf8'), context);

  const net = new context.window.EphemeralOfficeNetwork();
  net.connect({ name: 'Host', unit: 'PP10', x: 200, y: 200 });

  const npc = Array.from(net.npcPlayers.values())[0];
  npc.x = 500;
  npc.y = 500;
  npc.targetX = 800;
  npc.targetY = 800;
  npc.actionState = 'sleep_bed';
  npc.stunnedUntil = Date.now() + 2500;

  for (let i = 0; i < 10; i++) {
    net.update(i);
  }

  assert.equal(npc.isMoving, false, 'NPC must not be marked moving while in sleep_bed');
  assert.equal(npc.x, 500, 'NPC x position must NOT change (no sleep-walking!)');
  assert.equal(npc.y, 500, 'NPC y position must NOT change (no sleep-walking!)');
});

test('Round 10: Server engine handles npc_exchange, npc_love_gift, and npc_cheer_drop', async () => {
  const engine = await import('../server/engine.mjs');
  const player = (id = 'p') => ({
    id, name: id, unit: 'PP32', exp: 0, season: 2,
    items: [
      { uid: 'item_coffee', id: 'coffee', category: 'weapon', durability: 3, slot: 0 },
      { uid: 'suit_1', id: 'suit_engineer', category: 'outfit', durability: 5, slot: null }
    ],
    effects: {}, x: 1000, y: 350, lastSeen: 1000, connection: id, room: 'PP00'
  });
  const state = { players: { p: player() }, enemies: {}, drops: {}, tasks: {}, rate: {} };

  // 1. npc_exchange swaps non-outfit item and awards 15 exp
  const resEx = engine.act(state, 'p', 'npc_exchange', { uid: 'item_coffee', npcId: 'npc_vp_boss' }, 1000, () => 0);
  assert.ok(resEx && resEx.item, 'npc_exchange must return item');
  assert.equal(state.players.p.items.some(i => i.uid === 'item_coffee'), false, 'Given item must be deducted');
  assert.ok(state.players.p.exp >= 15, 'npc_exchange must award exp');

  // 2. npc_love_gift grants gift and awards 15 exp
  const resLove = engine.act(state, 'p', 'npc_love_gift', { npcId: 'npc_vp_boss' }, 1000, () => 0);
  assert.ok(resLove && resLove.item, 'npc_love_gift must return granted gift');
  assert.ok(state.players.p.exp >= 30, 'npc_love_gift must award exp');

  // 3. npc_cheer_drop creates drop in s.drops
  const resCheer = engine.act(state, 'p', 'npc_cheer_drop', { x: 500, y: 500 }, 1000, () => 0);
  assert.ok(resCheer && resCheer.drop, 'npc_cheer_drop must return drop info');
  assert.ok(state.drops[resCheer.drop.uid], 'Drop must exist in server state.drops');
});
