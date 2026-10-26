const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Round 12: Server emergency_revive consumes coffee/pizza/boba to reduce 2 mins each until healed', async () => {
  const engine = await import('../server/engine.mjs');
  const player = (id = 'p') => ({
    id, name: id, unit: 'PP32', exp: 200, season: 2,
    items: [
      { id: 'pizza', uid: 'item_pizza_1', category: 'item', maxDurability: 1 },
      { id: 'coffee', uid: 'item_coffee_1', category: 'item', maxDurability: 1 },
      { id: 'boba', uid: 'item_boba_1', category: 'item', maxDurability: 1 },
      { id: 'wrench', uid: 'item_wrench_1', category: 'weapon', maxDurability: 3 }
    ],
    effects: { injuredUntil: 1000 + 300000 }, // 5 minutes remaining (300,000ms)
    x: 1000, y: 350, lastSeen: 1000, connection: id, room: 'PP00'
  });
  const game = () => ({ players: { p: player() }, enemies: {}, drops: {}, tasks: {}, rate: {} });

  const s = game(), p = s.players.p;
  assert.ok(p.effects.injuredUntil > 1000);

  // 1. Calling emergency_revive consumes food items (3 items * 2 mins = 6 mins > 5 mins)
  const res = engine.act(s, 'p', 'emergency_revive', { mode: 'auto' }, 1000);
  assert.equal(res.success, true);
  assert.equal(res.method, 'items');
  assert.equal(p.effects.injuredUntil, 0, 'Injured time must be completely cleared');
  assert.equal(p.exp, 200, 'EXP must NOT be deducted when supplies are used');
  assert.equal(p.items.length, 1, 'Only non-food items should remain');
  assert.equal(p.items[0].id, 'wrench');
});

test('Round 12: Server emergency_revive partial item reduction until items run out', async () => {
  const engine = await import('../server/engine.mjs');
  const player = (id = 'p') => ({
    id, name: id, unit: 'PP32', exp: 100, season: 2,
    items: [
      { id: 'coffee', uid: 'item_coffee_1', category: 'item', maxDurability: 1 }
    ],
    effects: { injuredUntil: 1000 + 300000 }, // 5 minutes (300,000ms)
    x: 1000, y: 350, lastSeen: 1000, connection: id, room: 'PP00'
  });
  const game = () => ({ players: { p: player() }, enemies: {}, drops: {}, tasks: {}, rate: {} });

  const s = game(), p = s.players.p;

  // 1 item consumes 2 mins (120,000ms), 3 mins (180,000ms) remain
  const res = engine.act(s, 'p', 'emergency_revive', { mode: 'item' }, 1000);
  assert.equal(res.success, true);
  assert.equal(res.method, 'items_partial');
  assert.equal(p.items.length, 0, 'Coffee was consumed');
  assert.equal(p.effects.injuredUntil, 1000 + 180000, 'Remaining time is reduced by 2 minutes');
  assert.equal(p.exp, 100, 'EXP is unchanged on item consumption');
});

test('Round 12: Server emergency_revive with -50 EXP when no items or exp mode', async () => {
  const engine = await import('../server/engine.mjs');
  const player = (id = 'p') => ({
    id, name: id, unit: 'PP32', exp: 100, season: 2,
    items: [],
    effects: { injuredUntil: 1000 + 180000 },
    x: 1000, y: 350, lastSeen: 1000, connection: id, room: 'PP00'
  });
  const game = () => ({ players: { p: player() }, enemies: {}, drops: {}, tasks: {}, rate: {} });

  const s = game(), p = s.players.p;

  // With no food items, emergency_revive deducts 50 EXP and immediately awakens player
  const res = engine.act(s, 'p', 'emergency_revive', { mode: 'auto' }, 1000);
  assert.equal(res.success, true);
  assert.equal(res.method, 'exp');
  assert.equal(p.effects.injuredUntil, 0, 'Injured time cleared');
  assert.equal(p.exp, 50, '100 EXP - 50 EXP = 50 EXP');
});

test('Round 12: Client app.js includes 2-minute item reduction and 50 EXP deduction options', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  assert.ok(appJs.includes('-50 EXP'), 'app.js must mention -50 EXP in UI and logs');
  assert.ok(appJs.includes('-2分') || appJs.includes('2 分鐘'), 'app.js must mention 2-minute reduction per item');
  assert.ok(appJs.includes('btnEmergencyUseItems') || appJs.includes('btnEmergencyRevive'), 'app.js must include revive buttons');
  assert.ok(appJs.includes("'coffee', 'pizza', 'boba'") || appJs.includes("['coffee', 'pizza', 'boba']"), 'app.js must check coffee, pizza, boba');
});
