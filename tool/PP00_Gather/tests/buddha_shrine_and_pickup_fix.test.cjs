const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

test('Buddha shrine: drawBuddhaStatue incorporates photo reference with aspect ratio, halo, and carpet text', () => {
  const worldJs = fs.readFileSync(path.join(__dirname, '../static/js/world.js'), 'utf8');
  assert.ok(worldJs.includes('buddha_shrine.jpg'), 'Must reference uploaded buddha_shrine.jpg');
  assert.ok(worldJs.includes('✨ 有人快拜 保佑Pass ✨'), 'Must include "有人快拜 保佑Pass" on prayer carpet');
  assert.ok(worldJs.includes('bigHalo') || worldJs.includes('Dynamic Double Golden Halo Aureole'), 'Must include glowing double halo behind Buddha');
  assert.ok(worldJs.includes('statueW = 140') && worldJs.includes('statueH = 105'), 'Must render Buddha maintaining 1024:765 natural aspect ratio without compressing head');
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

  // 2. 背包放 10 件不同物品，其中一件是折疊板凳 (bench)，但耐久度只剩 1
  for (let i = 0; i < 9; i++) {
    p.inventory.push({ uid: 'inv_' + i, id: 'item_' + i, category: 'item', count: 1, durability: 3, maxDurability: 3 });
  }
  p.inventory.push({ uid: 'inv_bench', id: 'bench', category: 'weapon', count: 1, durability: 1, maxDurability: 3 });
  assert.equal(p.inventory.length, 10);

  // 3. 地上掉落物（無 durability 屬性的 bench）
  const groundBench = { id: 'bench', category: 'weapon', maxDurability: 3 };

  // 4. 驗證 canAdd 與 add：背包滿 10 件但有同類物品時，必須允許拾取並成功堆疊，耐久度取較佳者
  assert.ok(w.canAdd(p, groundBench, true), 'canAdd should allow pickup when matching stack exists');
  assert.ok(w.add(p, groundBench, true), 'add should succeed');
  const stackedBench = p.inventory.find(i => i.id === 'bench');
  assert.ok(stackedBench, 'bench must exist');
  assert.equal(stackedBench.count, 2, 'count must be incremented to 2');
  assert.equal(stackedBench.durability, 3, 'durability must be upgraded to 3');
});

test('Server pickup checks: refined distance tolerance and obstacle line-of-sight', () => {
  const engineJs = fs.readFileSync(path.join(__dirname, '../server/engine.mjs'), 'utf8');
  assert.ok(engineJs.includes('clearPickup'), 'Must include refined pickup obstacle clearance');
  assert.ok(engineJs.includes('segmentPickup'), 'Must include pickup line-of-sight check');
  assert.ok(engineJs.includes('fail(\'距離過遠\')') || engineJs.includes('fail(\'有障礙物阻擋\')'), 'Must provide distinct informative failure messages');
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
