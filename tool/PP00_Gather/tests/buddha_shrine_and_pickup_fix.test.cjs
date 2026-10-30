const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

test('Buddha shrine: drawBuddhaStatue incorporates code.txt palette and "有神快拜 保佑PASS" plaque', () => {
  const worldJs = fs.readFileSync(path.join(__dirname, '../static/js/world.js'), 'utf8');
  assert.ok(worldJs.includes('BUDDHA_PALETTE'), 'Must include Buddha palette from code.txt');
  assert.ok(worldJs.includes('✨ 有神快拜 保佑PASS ✨'), 'Must include "有神快拜 保佑PASS" on statue plaque');
  assert.ok(worldJs.includes('🏮 有神快拜 · 保佑PASS 🏮'), 'Must include "有神快拜 · 保佑PASS" on altar plaque');
  assert.ok(worldJs.includes('Continuous Ambient Aureole'), 'Must include aureole rotating rays');
  assert.ok(worldJs.includes('Lotus Throne'), 'Must include lotus throne');
});

test('Item stack pickup: same items can be picked up and stacked without capacity blockage', () => {
  const c = { window: {}, Date, Math };
  vm.createContext(c);
  for (const f of ['config', 'avatars', 'wardrobe']) {
    const file = path.join(__dirname, '../static/js', f + '.js');
    if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), c);
  }
  const w = c.window.OfficeWardrobe;
  const p = {
    inventory: [],
    equippedSlots: [null, null, null],
    overflow: [],
    wornOutfitUid: null
  };

  // 1. 裝備欄放滿 3 件裝備
  p.equippedSlots = [
    { uid: 'w1', id: 'bench', category: 'weapon', durability: 3, maxDurability: 3 },
    { uid: 'w2', id: 'wrench', category: 'weapon', durability: 3, maxDurability: 3 },
    { uid: 'w3', id: 'keyboard', category: 'weapon', durability: 3, maxDurability: 3 }
  ];

  // 2. 背包放 10 件不同物品，其中第一件是折疊板凳 (bench)，但耐久度只剩 1
  for (let i = 0; i < 9; i++) {
    p.inventory.push({ uid: 'inv_' + i, id: 'item_' + i, category: 'item', count: 1, durability: 3, maxDurability: 3 });
  }
  p.inventory.push({ uid: 'inv_bench', id: 'bench', category: 'weapon', count: 1, durability: 1, maxDurability: 3 });
  assert.equal(p.inventory.length, 10);

  // 3. 地上掉落物（滿耐久或無 durability 屬性的 bench）
  const groundBench = { id: 'bench', category: 'weapon', maxDurability: 3 };

  // 4. 驗證 canAdd 與 add：背包滿 10 件但有同類物品時，必須允許拾取並成功堆疊，耐久度取較佳者
  assert.ok(w.canAdd(p, groundBench, true), 'canAdd should allow pickup when matching stack exists');
  assert.ok(w.add(p, groundBench, true), 'add should succeed');
  const stackedBench = p.inventory.find(i => i.id === 'bench');
  assert.ok(stackedBench, 'bench must exist');
  assert.equal(stackedBench.count, 2, 'count must be incremented to 2');
  assert.equal(stackedBench.durability, 3, 'durability must be upgraded to 3');
});

test('Bird Commander meeting pull: locked exclusively to Meeting A (meet_a)', () => {
  const netJs = fs.readFileSync(path.join(__dirname, '../static/js/network.js'), 'utf8');
  assert.ok(netJs.includes("const roomId = 'meet_a';"), 'Must pull strictly to meet_a');
  assert.ok(!netJs.includes("Math.random() < 0.5 ? 'meet_a' : 'meet_b'"), 'Must not pull to meet_b');
});

test('Weapon attack animation: changed from spinning wheel to forward strike thrust', () => {
  const avatarsJs = fs.readFileSync(path.join(__dirname, '../static/js/avatars.js'), 'utf8');
  assert.ok(avatarsJs.includes('thrustCurve'), 'Must include forward thrust strike animation');
  assert.ok(avatarsJs.includes('strikeScale'), 'Must include forward strike impact scaling');
});
