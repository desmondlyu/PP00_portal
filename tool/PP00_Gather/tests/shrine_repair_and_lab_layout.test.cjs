const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

test('Buddha shrine: head not clipped by north wall, text below statue on altar and carpet, halo unimpeded', () => {
  const worldJs = fs.readFileSync(path.join(__dirname, '../static/js/world.js'), 'utf8');

  // 1. 佛像頭部與神案座標南移至開闊區 (statueY: 1345, statueY - 88 = 1257 > 北牆 1230..1252)
  assert.ok(worldJs.includes('statueY: 1345'), 'buddhaAltar statueY should be 1345 to prevent wall overlap');
  assert.ok(worldJs.includes('drawBuddhaStatue(ctx, 1090, 1345, tick);'), 'drawBuddhaStatue called at cy: 1345');

  // 2. 供桌正面與地毯題字「✨ 有神快拜 保佑PASS ✨」位於佛像下方
  assert.ok(worldJs.includes('✨ 有神快拜 保佑PASS ✨'), 'Must include "✨ 有神快拜 保佑PASS ✨"');
  // 佛像背後牌匾已移除 (不再有背後大橫匾)
  assert.ok(!worldJs.includes('🏮 有神快拜 · 保佑PASS 🏮'), 'Placard behind Buddha head must be removed');

  // 3. 佛像與神案在隔間牆 (walls.forEach) 之後繪製，確保佛頭與金佛光環絕不被牆面覆蓋
  const wallsIdx = worldJs.indexOf('window.WORLD_MAP.walls.forEach');
  const shrineDrawIdx = worldJs.indexOf('drawBuddhaStatue(ctx, 1090, 1345, tick);');
  assert.ok(wallsIdx > 0 && shrineDrawIdx > wallsIdx, 'Shrine and Buddha must be rendered AFTER walls');
});

test('Lab equipments: 3 machines removed, exactly 6 machines evenly distributed in 3 columns x 2 rows', () => {
  const worldJs = fs.readFileSync(path.join(__dirname, '../static/js/world.js'), 'utf8');

  // 1. 移除指定 3 台機台
  assert.ok(!worldJs.includes('Advantest T5830ES #2'), 'Must remove Advantest T5830ES #2');
  assert.ok(!worldJs.includes('Advantest T5833 #4'), 'Must remove Advantest T5833 #4');
  assert.ok(!worldJs.includes('高溫/低溫烘箱 (-45°C~90°C)'), 'Must remove 高溫/低溫烘箱 (-45°C~90°C)');

  // 2. 剩餘 6 台均勻分佈
  assert.ok(worldJs.includes('tester_1'), 'Must have tester_1');
  assert.ok(worldJs.includes('tester_3'), 'Must have tester_3');
  assert.ok(worldJs.includes('loader_1'), 'Must have loader_1');
  assert.ok(worldJs.includes('loader_2'), 'Must have loader_2');
  assert.ok(worldJs.includes('oven_1'), 'Must have oven_1');
  assert.ok(worldJs.includes('oven_3'), 'Must have oven_3');

  const c = { window: {}, Math, Date };
  vm.createContext(c);
  vm.runInContext(worldJs, c);
  const eqs = c.window.WORLD_MAP.labEquipments;
  assert.equal(eqs.length, 6, 'labEquipments must have exactly 6 machines');
});

test('Repair system: repair_wrench animation, 3-second progress HUD, confetti, floating text, and item drop', () => {
  const avatarsJs = fs.readFileSync(path.join(__dirname, '../static/js/avatars.js'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // 1. avatars.js 包含 repair_wrench 動作，手持活動扳手敲擊與火花，不繪製坐下的椅子
  assert.ok(avatarsJs.includes("case 'repair_wrench':"), 'avatars.js must implement repair_wrench case');
  assert.ok(avatarsJs.includes('鋼製活動扳手'), 'repair_wrench must draw steel wrench');
  assert.ok(!avatarsJs.includes("actionState === 'repair_wrench') {\n    ctx.save();\n    ctx.fillStyle = '#1e293b';"), 'repair_wrench must not draw chair');

  // 2. app.js 維修偵測與互動動作設置為 repair_wrench
  assert.ok(appJs.includes("actionId: 'repair_wrench'"), 'detectNearbyFacility must set actionId to repair_wrench');
  assert.ok(appJs.includes('startActiveRepairSession'), 'app.js must provide startActiveRepairSession');
  assert.ok(appJs.includes('completeRepairSession'), 'app.js must provide completeRepairSession');
  assert.ok(appJs.includes('renderEquipmentRepairAnimations'), 'app.js must render 3s repair HUD');

  // 3. 維修完成放彩帶特效 (spawnConfetti) 與無字框金色發光浮動文字
  assert.ok(appJs.includes('spawnConfetti(sess.targetX, sess.targetY);'), 'Must trigger spawnConfetti on repair complete');
  assert.ok(appJs.includes("type: 'floating_text'") && appJs.includes('🎉 完成維修'), 'Must spawn floating text "🎉 完成維修"');
  assert.ok(appJs.includes("v.type === 'floating_text'"), 'renderVfxList must handle floating_text');

  // 4. 維修完成掉落物資獎勵 (扳手、綠乖乖、咖啡、珍奶、披薩)
  assert.ok(appJs.includes('rewardPool') && appJs.includes('kuaikuai') && appJs.includes('wrench'), 'Must drop utility supplies upon repair completion');
});

test('Online roster: defeated mobs and down entities are filtered out from sidebar list', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');
  assert.ok(appJs.includes('network.getAllOtherPlayers().filter(p => !p.combatDown && (p.hp == null || p.hp > 0))'), 'Sidebar roster must filter out combatDown/dead entities');
});

test('Attacking remote players: immediate knockback physics, parabolic arc, and spin rotation animation', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');
  const netJs = fs.readFileSync(path.join(__dirname, '../static/js/network.js'), 'utf8');

  // 1. 在攻擊觸發時 (season 與 non-season)，均即時為受擊其他玩家賦予 knockback、jumpOffset 與 targetX/Y
  assert.ok(appJs.includes('colleague.knockback = {'), 'Attacking colleague must assign colleague.knockback');
  assert.ok(appJs.includes('colleague.jumpOffset = 36;'), 'Attacking colleague must assign jumpOffset for parabolic flight');
  assert.ok(appJs.includes('colleague.targetX = nx;'), 'Attacking colleague must update targetX to prevent LERP snapback');

  // 2. network.js 包含遠端玩家被擊退的物理位移與衰減模擬
  assert.ok(netJs.includes('if (rp.knockback && rp.knockback.ticksLeft > 0)'), 'network.js must simulate rp.knockback physics');
  assert.ok(netJs.includes('rp.knockback.vx *= 0.86'), 'network.js must damp knockback velocity');
  assert.ok(netJs.includes('rp.knockback.ticksLeft--'), 'network.js must decrement knockback ticks');
});
