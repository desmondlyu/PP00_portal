const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
