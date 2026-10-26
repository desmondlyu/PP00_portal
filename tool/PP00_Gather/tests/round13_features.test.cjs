const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Round 13: Guard detention in pantry with beating animation and light injury', async () => {
  const engine = await import('../server/engine.mjs');
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // Verify server logic
  const player = (id = 'p') => ({
    id, name: id, unit: 'PP32', exp: 100, season: 2, items: [{ uid: 'w1', id: 'keyboard', category: 'weapon', slot: 0, durability: 3 }],
    effects: {}, x: 1000, y: 350, lastSeen: 1000, connection: id, room: 'PP00', activeSlot: 0
  });
  const game = () => ({
    players: { p: player() },
    enemies: { npc_security_guard: { id: 'npc_security_guard', role: 'guard', hp: 5, maxHp: 5, x: 1030, y: 350, room: 'PP00' } },
    drops: {}, tasks: {}, rate: {}
  });

  const s = game(), p = s.players.p;
  // Attack guard: roll 1 = 0.5 (dodge check: dodge=0.25 -> 0.5 not dodge), roll 2 = 0.1 (< 0.80 guard beating)
  const rolls = [0.5, 0.1];
  let rollIdx = 0;
  engine.combat(s, p, {}, 1000, () => rolls[rollIdx++] ?? 0.1);
  assert.equal(p.x, 2360);
  assert.equal(p.y, 350);
  assert.ok(p.effects.lockedUntil > 1000, 'Player locked in pantry');
  assert.ok(p.effects.lightUntil >= 1000 + 60000, 'Guard beating causes light injury for 60s');
  assert.equal(p.beating.role, 'guard');

  // Verify client logic in app.js
  assert.ok(appJs.includes("role === 'guard'"), 'app.js supports role guard beating');
  assert.ok(appJs.includes("targetRoom = 'pantry'"), 'guard beating room is pantry');
  assert.ok(appJs.includes('roomX = 2360') && appJs.includes('roomY = 350'), 'guard beating pantry coords');
  assert.ok(appJs.includes('isGuard && Math.random() < 0.80'), '80% chance to trigger guard beating on attack');
});

test('Round 13: Ghost higher scare rate (80%/95%) and attack chance (40%/70%)', () => {
  const networkJs = fs.readFileSync(path.join(__dirname, '../static/js/network.js'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  assert.ok(networkJs.includes('scareChance = isRed ? 0.95 : 0.80'), 'Scare chance increased to 80% (red 95%)');
  assert.ok(networkJs.includes('attackChance = isRed ? 0.70 : 0.40'), 'Ghost attack chance added: 40% (red 70%)');
  assert.ok(networkJs.includes('isAttack'), 'network.js passes isAttack flag');

  // Verify app.js handles ghost attack
  assert.ok(appJs.includes('onGhostScare: (until, isAttack)'), 'app.js onGhostScare accepts isAttack');
  assert.ok(appJs.includes('combat_hurt'), 'Ghost attack hurts combat target');
  assert.ok(appJs.includes('lightInjuredUntil = nowInj + 60000'), 'Ghost attack can cause light injury');
});

test('Round 13: Bird Commander lying down while walking bug fixed', () => {
  const networkJs = fs.readFileSync(path.join(__dirname, '../static/js/network.js'), 'utf8');

  // 1. Moving clears sleep_bed
  assert.ok(networkJs.includes("npc.actionState = null;"), 'Moving clears action state');

  // 2. Random patrol walk actions do NOT include sleep_bed
  const actionsIdx = networkJs.indexOf('const birdActions = [');
  const birdActionsBlock = networkJs.substring(actionsIdx, actionsIdx + 200);
  assert.ok(!birdActionsBlock.includes("'sleep_bed'"), 'Bird commander patrol waypoint actions do not include sleep_bed');

  // 3. Sleeping in VP prevents walking
  assert.ok(networkJs.includes('if (npc.isSleepingInVp)'), 'Sleeping in VP check exists');
});

test('Round 13: Green Kuai Kuai shrine speed buff (+35% for 10s)', async () => {
  require('../static/js/progression.js');
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');
  const engine = await import('../server/engine.mjs');

  const baseSpeed = 4;
  const now = 100000;

  // Active shrine buff
  const buffedSpeed = globalThis.OfficeProgression.speed(baseSpeed, 1, { shrineSpeedUntil: now + 5000 }, now);
  const normalSpeed = globalThis.OfficeProgression.speed(baseSpeed, 1, {}, now);
  assert.ok(buffedSpeed > normalSpeed, 'Buffed speed is faster than normal speed');
  assert.equal(Math.round(buffedSpeed * 100) / 100, Math.round(baseSpeed * 1.35 * 100) / 100, '+35% speed boost');

  // Server sets 10s buff
  const player = { effects: {}, x: 1718, y: 350, items: [], room: 'PP00' };
  const s = { players: { p: player }, enemies: {}, drops: {}, tasks: {}, rate: {} };
  engine.act(s, 'p', 'shrine_start', {}, now);
  engine.act(s, 'p', 'facility_finish', {}, now + 3000);
  assert.equal(player.effects.shrineSpeedUntil, now + 3000 + 10000, 'Server awards 10s shrine speed buff');

  // Non-season client incorporates shrine speed buff
  assert.ok(appJs.includes('shrineSpeedBoost'), 'app.js includes shrineSpeedBoost');
  assert.ok(appJs.includes('localPlayer.shrineSpeedUntil'), 'app.js tracks localPlayer.shrineSpeedUntil');
});

test('Round 13: Manual unequip vs auto-equip contradiction resolved', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // 1. unequipSlotToBag records manualEmptySlots
  assert.ok(appJs.includes('season.manualEmptySlots = season.manualEmptySlots || new Set();'), 'unequip records manual empty slot');
  assert.ok(appJs.includes('season.manualEmptySlots.add(equipIdx)'), 'unequip adds slot index to manualEmptySlots');

  // 2. applySeasonSnapshot skips manualEmptySlots
  assert.ok(appJs.includes('!season.manualEmptySlots?.has(idx)'), 'auto-equip respects manual empty slots');

  // 3. equipFromBag clears manualEmptySlots
  assert.ok(appJs.includes('if(season.manualEmptySlots) season.manualEmptySlots.clear();'), 'manual equip clears manual empty slots');

  // 4. Durability zero break removes slot from manualEmptySlots for auto refill
  assert.ok(appJs.includes('if (season.manualEmptySlots) season.manualEmptySlots.delete(activeSlotIdx);'), 'durability zero break allows auto equip');
});

test('Round 13: Top-right message feed position, 10 lines max, 3s timeout, 3s duplicate cooldown', () => {
  const css = fs.readFileSync(path.join(__dirname, '../static/css/style.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // CSS positioned below radar minimap (y: 58-190)
  assert.ok(css.includes('top: calc(200px + env(safe-area-inset-top));'), 'CSS feed top is 200px to not cover radar minimap');

  // 10 lines max
  assert.ok(appJs.includes('while (feed.children.length > 10) feed.firstElementChild.remove();'), 'Max 10 lines in combat feed');

  // 3s timeout
  assert.ok(appJs.includes('3000'), '3s line timeout exists');

  // 3s identical message cooldown
  assert.ok(appJs.includes('combatToastCooldowns = new Map()'), 'Toast cooldowns map');
  assert.ok(appJs.includes('now - lastTime < 3000'), '3s duplicate cooldown check');
});

test('Round 13: Hunt battle frequency shortened to every 30 minutes', () => {
  const configJs = fs.readFileSync(path.join(__dirname, '../static/js/config.js'), 'utf8');
  const engineMjs = fs.readFileSync(path.join(__dirname, '../server/engine.mjs'), 'utf8');
  const huntJs = fs.readFileSync(path.join(__dirname, '../static/js/hunt.js'), 'utf8');

  assert.ok(configJs.includes('huntPeriod: 30 * 60 * 1000'), 'config.js sets 30-min hunt period');
  assert.ok(engineMjs.includes('Math.floor(now/1800000)'), 'engine.mjs uses 1800000ms (30 min) hunt round interval');
  assert.ok(huntJs.includes('window.GATHER_CONFIG?.huntPeriod'), 'hunt.js respects configured hunt period');
});

test('Round 13: Minimap can be closed even while player is severely injured', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // Locate canvas pointerdown
  const pdIdx = appJs.indexOf("canvas.addEventListener('pointerdown'");
  const pdBlock = appJs.substring(pdIdx, pdIdx + 2000);

  // Close minimap logic must appear BEFORE the injured check
  const closeMinimapIdx = pdBlock.indexOf('camera.minimapHidden = true;');
  const injuredCheckIdx = pdBlock.indexOf('if (localPlayer.isInjured && gameNow() < (localPlayer.injuredUntil || 0))');

  assert.ok(closeMinimapIdx !== -1, 'Close minimap logic exists in pointerdown');
  assert.ok(injuredCheckIdx !== -1, 'Injured check exists in pointerdown');
  assert.ok(closeMinimapIdx < injuredCheckIdx, 'Closing minimap must be processed before the injured early return');
});
