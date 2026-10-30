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

test('Floating chat suppresses browser desktop notifications and duplicate windows', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');
  assert.ok(appJs.includes('if (activePipWindow && !activePipWindow.closed) return;'), 'triggerDesktopNotification must return early if floating chat window is active');
});

test('Interactive repair: remove legacy progress text and maintain durable repaired state', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');
  const engineMjs = fs.readFileSync(path.join(__dirname, '../server/engine.mjs'), 'utf8');

  // 1. 舊版 "互動中 XX%" 浮動字樣已被移除/過濾，僅由專屬維修 HUD 渲染
  assert.ok(appJs.includes("if (c && c.kind !== 'device' && c.kind !== 'rma' && !activeRepairSession)"), 'Legacy "互動中" text must not be drawn for repair');

  // 2. 修理完成後 lastRepairedAt 防覆蓋保固機制與即時解除本地與快照損壞狀態
  assert.ok(appJs.includes('tgt.lastRepairedAt = gameNow();'), 'completeRepairSession must set lastRepairedAt');
  assert.ok(appJs.includes('target.lastRepairedAt') && appJs.includes('15000'), 'Snapshot handler must protect repaired equipment from stale server frames');
  assert.ok(appJs.includes('eq.lastRepairedAt') && appJs.includes('15000'), 'onWorldSync must protect repaired equipment from stale peer frames');

  // 3. 伺服器 engine.mjs 支援 device_repair 動作與房間廣播名單自動解除已修復設備
  assert.ok(engineMjs.includes("kind==='device_repair'"), 'server/engine.mjs must support device_repair action');
  assert.ok(engineMjs.includes('entry.broken=false;entry.handledAt=now;'), 'server/engine.mjs must un-break equipment omitted by master world heartbeat');
});

test('Responsive expansion & scaling: 1440P baseline vs 1080P/mobile proportional sizes and anti-clipping rules', () => {
  const css = fs.readFileSync(path.join(__dirname, '../static/css/style.css'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // 1. 1440P 基準保證與彈性容器
  assert.ok(css.includes('width: var(--chat-panel-w, 615px);'), 'Base chat panel width must follow --chat-panel-w 615px');
  assert.ok(css.includes('height: var(--chat-msg-h, 384px);'), 'Base chat messages must support --chat-msg-h 384px');
  assert.ok(css.includes('.prox-chat-body-wrap {') && css.includes('flex: 1 1 auto;'), 'Chat body wrap must flex adaptively');

  // 2. 1080P 等比微縮 (75%) 與防截斷
  assert.ok(css.includes('--chat-panel-w: clamp(340px, 24.5vw, 490px);'), '1080P chat panel width must adapt');
  assert.ok(css.includes('max-height: calc(100dvh - 80px);'), '1080P chat panel must have max-height constraint against screen overflow');
  assert.ok(css.includes('width: min(435px, 92vw);'), '1080P inventory frame must scale down to 75% of 1440P (435px)');
  assert.ok(css.includes('width: 33px;') && css.includes('height: 33px;'), '1080P inventory slots must scale down to 33px');
  assert.ok(css.includes('#toggleChatCollapseBtn.chat-collapse-btn') && css.includes('padding: 3px 8px !important;'), '1080P chat header collapse btn must be compact to prevent clipping');

  // 3. 筆電模式等比微縮 (60%~65%)
  assert.ok(css.includes('width: min(380px, 92vw);'), 'Laptop inventory frame must scale down to ~380px');
  assert.ok(css.includes('width: 29px;') && css.includes('height: 29px;'), 'Laptop inventory slots must scale down to 29px');
  assert.ok(css.includes('max-height: calc(100dvh - 65px);'), 'Laptop chat panel must fit low height screens');

  // 4. 手機版展開視窗與觸控操作防溢出
  assert.ok(css.includes('width: min(420px, 95vw);'), 'Mobile inventory frame must fit mobile screen gracefully');
  assert.ok(css.includes('max-height: 55dvh;') && css.includes('overflow-y: auto;'), 'Mobile touchSkillsGroup must have max-height to avoid blocking HUD');

  // 5. 雷達小地圖等比比例計算
  assert.ok(appJs.includes('vw >= 2100 && vh >= 1150') && appJs.includes('vw >= 1600 && vh >= 900'), 'getMinimapRect must distinguish 1440P, 1080P, and smaller viewports');
  assert.ok(appJs.includes('? 146'), '1080P minimap width must scale down to 146px (75% of 195px)');
});
