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

  // 3. 伺服器 engine.mjs 支援 device_repair 與 device_break 動作，後端單一權威管理
  assert.ok(engineMjs.includes("kind==='device_repair'"), 'server/engine.mjs must support device_repair action');
  assert.ok(engineMjs.includes("kind==='device_break'"), 'server/engine.mjs must support device_break action');
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

  // 6. iPhone 13 Pro Max (直立 428px vs 橫向 926px) 專屬防截斷與常駐等級資訊適配
  assert.ok(appJs.includes('function isMobileOrTouchScreen()'), 'app.js must define unified touch screen detector');
  assert.ok(appJs.includes('window.innerWidth <= 1024 || window.innerHeight <= 520'), 'app.js must support large mobile landscape viewports up to 1024px');
  assert.ok(css.includes('.touch-attack-btn {\n    display: none !important;\n  }') || css.includes('.touch-attack-btn { display: none !important; }'), 'Mobile must hide duplicate touchAttackBtn to prevent overlapping combat cluster');
  assert.ok(css.replace(/\r\n/g, '\n').includes('.prox-chat-panel:not(.mobile-open) {\n    display: none !important;\n  }'), 'Landscape collapsed chat must not overlap touchMovePad');
  assert.ok(css.includes('z-index: 47 !important;') && css.includes('.touch-controls { display: block; position: fixed; inset: 0; pointer-events: none; z-index: 55; }'), 'touchInteractBtn & touch-controls must sit cleanly above combat buttons');
  assert.ok(css.includes('min-height: 0 !important;'), 'Landscape chat messages must have 0 min-height to prevent form clipping');
});

test('Remote knockback spin prevention, default collapsed chat & minimap, and authoritative repair & NPC movement', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const netJs = fs.readFileSync(path.join(__dirname, '../static/js/network.js'), 'utf8');
  const engineMjs = fs.readFileSync(path.join(__dirname, '../server/engine.mjs'), 'utf8');

  // 1. 遠端受攻擊擊退中斷互動動作，且有每幀 knockback ticksLeft 衰減機制防止原地一直旋轉
  assert.ok(appJs.includes('colleague.actionState = null;'), 'Attacking colleague must cancel interaction action state (e.g. kneel_pray)');
  assert.ok(appJs.includes('for (const colleague of network.remotePlayers.values())') && appJs.includes('kb.ticksLeft--'), 'Remote players must decay knockback ticksLeft in game loop');

  // 2. 聊天室預設縮合，小地圖預設關閉
  assert.ok(indexHtml.includes('id="proxChatPanel" class="prox-chat-panel chat-minimized"'), 'Chat panel must default to collapsed chat-minimized');
  assert.ok(indexHtml.includes('id="toggleChatCollapseBtn" class="chat-collapse-btn is-collapsed"'), 'Collapse button must default to is-collapsed');
  assert.ok(appJs.includes('minimapHidden: true,'), 'Camera minimap must be default hidden');

  // 3. 設備修復雙向同步與伺服器端權威機制
  assert.ok(netJs.includes("case 'device_repair':"), 'network.js must handle incoming device_repair packet to sync room master and peers');
  assert.ok(engineMjs.includes("kind==='device_break'"), 'server/engine.mjs must support authoritative device_break');

  // 4. NPC 巡邏支援房長同步超時自動備援巡邏，防止重整後 NPC 原地卡死
  assert.ok(netJs.includes('now - (this.lastMasterSyncTime || 0) >= 2500'), 'NPC movement must have fallback autonomous patrol when master sync times out');
});

test('Storage bag independence, simplified clean nameplate, and below-character interaction prompt card', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');
  const engineMjs = fs.readFileSync(path.join(__dirname, '../server/engine.mjs'), 'utf8');

  // 1. 儲物欄獨立 10 格 (不被已裝備 3 格佔用)
  assert.ok(engineMjs.includes('bag(p).length<10'), 'server/engine.mjs capacity must check bag items length < 10, not total items');

  // 2. 名牌簡化：只顯示名字，不顯示頭銜/裝備emoji/卡片框
  assert.ok(appJs.includes("const displayLabel = p.name || '';"), 'drawPlayerNameplateAndBubbles must only show name');
  assert.ok(appJs.includes("const itemEmoji = '';"), 'drawPlayerNameplateAndBubbles must not draw held item emoji above head');

  // 3. 靠近物品互動卡片顯示於人物下方 (y + 36)
  assert.ok(appJs.includes('const hy = localPlayer.y + 36'), 'Nearby interaction prompt card must be placed below player');
});

test('Authoritative device repair in cloud mode: P2P room master cannot override broken state', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // 1. 雲端模式下，P2P 房長的 state_sync 封包不可覆寫 workstations 與 labEquipments 的損壞狀態
  assert.ok(appJs.includes('if (!season.enabled && Array.isArray(pkt.workstations)'), 'P2P master state_sync must not overwrite workstations in cloud mode');
  assert.ok(appJs.includes('if (!season.enabled && Array.isArray(pkt.labEquipments)'), 'P2P master state_sync must not overwrite labEquipments in cloud mode');

  // 2. completeRepairSession 僅發送權威 device_finish，不再重複發送提前清除 channel 的 device_repair
  assert.ok(!appJs.includes("season.client.send('device_repair'"), 'completeRepairSession must not prematurely clear channel via device_repair');
  assert.ok(appJs.includes("season.client.send('device_finish'"), 'completeRepairSession must send authoritative device_finish');
});

test('Behavioral: Master heartbeat cannot overwrite backend device broken state', async () => {
  const E = await import('../server/engine.mjs');
  const player = (id = 'p') => ({ id, name: id, unit: 'PP32', exp: 0, season: 2, items: [], effects: {}, x: 1000, y: 350, lastSeen: 1000, connection: id, room: 'PP00' });
  const s = { players: { p: player() }, enemies: {}, drops: {}, tasks: {}, rate: {}, lastSpawn: { PP00: 1000000000000 } };
  const p = s.players.p;

  // 1. 設備 lab_0 已故障；房長發送空 broken 清單心跳時，後端故障設備絕不被設為已修復
  s.broken = { 'lab_0': { broken: true, room: 'PP00', brokenAt: 1000 } };
  E.world(s, p, { broken: [] }, 2000);
  assert.equal(s.broken['lab_0'].broken, true, 'Heartbeat with omitted equipment must NOT un-break it');

  // 2. 設備 lab_1 已修復；舊房長在任何時間（無論是 10 分鐘或 100 分鐘後）發送殘留 broken 清單時，後端絕不可重新標記為故障
  s.broken['lab_1'] = { broken: false, room: 'PP00', handledAt: 1000 };
  p.lastSeen = 1000000;
  E.world(s, p, { broken: ['lab_1'] }, 1000000);
  assert.equal(s.broken['lab_1'].broken, false, 'Heartbeat must NEVER resurrect repaired equipment even after 10+ minutes');
});

test('Behavioral: device_break validation against spoofing, replay and world heartbeat override', async () => {
  const E = await import('../server/engine.mjs');
  const player = (id = 'p') => ({ id, name: id, unit: 'PP32', exp: 0, season: 2, items: [], effects: {}, x: 1000, y: 350, lastSeen: 1000, connection: id, room: 'PP00' });
  const s = { players: { p: player() }, enemies: {}, drops: {}, tasks: {}, rate: {}, lastSpawn: { PP00: 1000000000000 }, broken: {} };
  const p = s.players.p;
  const labTask = E.assets.tasks.find(t => t.id === 'lab_0');

  // 1. 偽造不存在的怪物 ID 提交破壞 -> 拋出錯誤拒絕
  assert.throws(() => E.act(s, 'p', 'device_break', { target: 'lab_0', mobId: 'invented', eventId: 'ev_inv' }, 1000), /怪物不存在/);

  // 2. 怪物已被擊倒 (hp <= 0) 提交破壞 -> 拒絕
  s.enemies['mob_dead'] = { id: 'mob_dead', mob: true, hp: 0, maxHp: 2, room: 'PP00', x: labTask.x, y: labTask.y, attacking: true };
  assert.throws(() => E.act(s, 'p', 'device_break', { target: 'lab_0', mobId: 'mob_dead', eventId: 'ev_dead' }, 1000), /怪物不存在/);

  // 3. 活著的怪物但距離設備太遠 (> 120px) 提交破壞 -> 拒絕
  s.enemies['mob_far'] = { id: 'mob_far', mob: true, hp: 2, maxHp: 2, room: 'PP00', x: labTask.x + 300, y: labTask.y + 300, attacking: true };
  assert.throws(() => E.act(s, 'p', 'device_break', { target: 'lab_0', mobId: 'mob_far', eventId: 'ev_far' }, 1000), /距離設備過遠/);

  // 4. 未經後端授權或客戶端隨意偽造的 eventId/grantId -> 拒絕
  s.enemies['mob_near'] = { id: 'mob_near', name: 'RMA Red Mob', mob: true, hp: 2, maxHp: 2, room: 'PP00', x: labTask.x + 20, y: labTask.y + 20, attacking: true };
  assert.throws(() => E.act(s, 'p', 'device_break', { target: 'lab_0', mobId: 'mob_near', eventId: 'client_forged_0' }, 1000), /無效或已過期的破壞授權/);

  // 5. 房長透過 world() 心跳同步場景，後端判定怪物靠近設備且發起攻擊，由後端原子核發破壞授權
  delete s.enemies['mob_dead'];
  delete s.enemies['mob_far'];
  E.world(s, p, { enemies: [{ id: 'mob_near', name: 'RMA Red Mob', x: labTask.x + 20, y: labTask.y + 20, attacking: true }] }, 1000);
  const authorizedGrantId = s.enemies['mob_near'].sabotageGrant;
  assert.ok(authorizedGrantId, 'Backend must issue an authorized sabotage grant');
  assert.ok(s.sabotageGrants[authorizedGrantId], 'Grant must exist in s.sabotageGrants');

  // 6. 使用後端核發的授權提交合法破壞 -> 成功登記故障，且該授權被原子消耗刪除
  E.act(s, 'p', 'device_break', { target: 'lab_0', mobId: 'mob_near', grantId: authorizedGrantId }, 1000);
  assert.equal(s.broken['lab_0']?.broken, true);
  assert.equal(s.broken['lab_0']?.brokenBy, 'RMA Red Mob');
  assert.equal(s.sabotageGrants[authorizedGrantId], undefined, 'Grant must be atomically deleted upon use');
  assert.equal(s.enemies['mob_near'].attacking, false, 'Mob attacking flag is cleared after sabotage');

  // 7. 重播相同已消耗的授權 -> 拋出錯誤拒絕
  assert.throws(() => E.act(s, 'p', 'device_break', { target: 'lab_0', mobId: 'mob_near', grantId: authorizedGrantId }, 1001), /無效或已過期的破壞授權/);

  // 8. 玩家合法修復該設備 (device_start -> device_finish)
  p.x = labTask.x; p.y = labTask.y; // 位於維修範圍內
  E.act(s, 'p', 'device_start', { target: 'lab_0' }, 1000);
  E.act(s, 'p', 'device_finish', {}, 4000);
  assert.equal(s.broken['lab_0'].broken, false, 'Equipment is repaired');
  assert.equal(s.broken['lab_0'].handledAt, 4000, 'HandledAt is recorded');

  // 9. 【Codex 回歸測試】：插入一次房長 world 更新 (送出 attacking: true)，嘗試搭配新 eventId 再次破壞
  p.lastSeen = 5000;
  E.world(s, p, { enemies: [{ id: 'mob_near', name: 'RMA Red Mob', x: labTask.x + 20, y: labTask.y + 20, attacking: true }] }, 5000);
  // 後端因怪物破壞冷卻與設備保固，絕不核發新的破壞授權
  assert.equal(s.enemies['mob_near'].sabotageGrant, undefined, 'Backend must NOT issue grant to mob under cooldown or repaired equipment');
  // 客戶端嘗試以 client_1 再次發送 device_break -> 嚴格被拒絕！
  assert.throws(() => E.act(s, 'p', 'device_break', { target: 'lab_0', mobId: 'mob_near', eventId: 'client_1' }, 5000), /無效或已過期的破壞授權/);
  assert.equal(s.broken['lab_0'].broken, false, 'Equipment must remain repaired');
});

test('Behavioral: Timing flow - monster arrives without grant -> heartbeat grants -> break succeeds, and rejection maintains consistency', async () => {
  const root = path.join(__dirname, '../static/js');
  const nodes = new Map();
  const doc = {
    getElementById: (id) => nodes.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => {
      const el = {
        tagName: tag, style: {},
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        appendChild: (c) => { el.children.push(c); return c; },
        children: [], firstElementChild: { remove: () => {} },
        remove: () => {}, addEventListener: () => {},
        setAttribute: () => {}, removeAttribute: () => {},
        innerHTML: '',
      };
      if (tag === 'template') {
        el.content = { get textContent() { return el.innerHTML.replace(/<[^>]*>/g, ''); } };
      }
      return el;
    },
    body: { appendChild: () => {}, classList: { add: () => {}, remove: () => {} } },
    documentElement: { style: {} }, head: { appendChild: () => {} },
  };
  const context = {
    console, Date, Math,
    setTimeout: (fn) => setTimeout(fn, 0), clearTimeout: () => {}, requestAnimationFrame: () => {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    window: {
      addEventListener: () => {}, innerWidth: 1200, innerHeight: 800,
      WORLD_MAP: { workstations: [], labEquipments: [{ name: 'Lab Equip 1', isBroken: false, status: 'PASS READY' }], toiletStalls: [] },
      GATHER_CONFIG: { season2: true }
    }
  };
  context.window.document = doc; context.document = doc; context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'network.js'), 'utf8'), context);
  let appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  appSrc = appSrc.replace("window.addEventListener('DOMContentLoaded', init);", 'window.__testInit = init;');
  vm.runInContext(appSrc, context);

  const T = context.window.__PP00_TEST__;
  assert.ok(typeof T.requestDeviceSabotage === 'function', 'requestDeviceSabotage must be exposed');
  const season = T.getSeason();
  season.enabled = true;

  const eq = context.window.WORLD_MAP.labEquipments[0];
  const mob = { uid: 'mob_test_timing', id: 'mob_test_timing', name: 'Timing Mob' };

  // 1. 怪物抵達設備時快照中尚無 grant (grantId is undefined)
  let worldHeartbeatSent = false;
  let breakSent = false;
  season.client = {
    snapshot: { enemies: { [mob.uid]: { id: mob.uid } } },
    send: async (kind, payload) => {
      if (kind === 'world') {
        worldHeartbeatSent = true;
        // 伺服器收到世界心跳後，核發 sabotageGrant
        season.client.snapshot.enemies[mob.uid].sabotageGrant = 'grant_delayed_123';
        return { ok: true };
      }
      if (kind === 'device_break') {
        assert.equal(payload.grantId, 'grant_delayed_123', 'device_break must use grant acquired via heartbeat');
        breakSent = true;
        return { ok: true };
      }
      return { ok: true };
    }
  };

  const ok = await T.requestDeviceSabotage(mob, { ref: eq, kind: 'lab', name: eq.name });
  assert.equal(ok, true, 'Sabotage should succeed after heartbeat grant');
  assert.equal(worldHeartbeatSent, true, 'Client must actively trigger world heartbeat when lacking grant');
  assert.equal(breakSent, true, 'device_break must be sent after grant received');
  assert.equal(eq.isBroken, true, 'Equipment is now authoritatively broken');
  assert.equal(eq.status, '💥BROKEN!');

  // 2. 拒絕時本地與後端維持一致：例如伺服器拒絕核發 grant (處於保固/冷卻中)
  eq.isBroken = false;
  eq.status = 'PASS READY';
  season.client.snapshot = { enemies: { [mob.uid]: { id: mob.uid } } }; // 無 grant
  season.client.send = async (kind) => {
    if (kind === 'world') {
      // 伺服器拒絕核發（不給 grant）
      return { ok: true };
    }
    throw new Error('should not be called without grant');
  };

  const deniedResult = await T.requestDeviceSabotage(mob, { ref: eq, kind: 'lab', name: eq.name });
  assert.equal(deniedResult, false, 'Sabotage rejected when grant denied');
  assert.equal(eq.isBroken, false, 'Equipment MUST remain intact, avoiding false broken UI');
  assert.equal(eq.status, 'PASS READY');

  // 3. 【提交後回應失敗】：例如網路中斷或後端拋錯，快照已記錄故障時，絕不可強制將設備設為完好 (isBroken=false)
  eq.isBroken = true;
  eq.status = '💥BROKEN!';
  season.client.snapshot = {
    enemies: { [mob.uid]: { id: mob.uid, sabotageGrant: 'grant_err_1' } },
    broken: { lab_0: { broken: true } }
  };
  season.client.send = async (kind) => {
    if (kind === 'device_break') throw new Error('Network timeout / dropped response');
    return { ok: true };
  };
  const netErrResult = await T.requestDeviceSabotage(mob, { ref: eq, kind: 'lab', name: eq.name });
  assert.equal(netErrResult, false, 'Operation unconfirmed due to network error');
  assert.equal(eq.isBroken, true, 'Equipment must remain broken based on authoritative snapshot, NOT reverted to false');

  // 4. 【等待期間收到故障快照】：在提交請求等待回應期間，外部快照已標記設備故障，隨後請求失敗亦不可把設備改回完好
  eq.isBroken = false;
  season.client.snapshot = {
    enemies: { [mob.uid]: { id: mob.uid, sabotageGrant: 'grant_concurrent_1' } },
    broken: {}
  };
  season.client.send = async (kind) => {
    if (kind === 'device_break') {
      // 模擬等待期間併發收到來自其他玩家的最新故障快照
      season.client.snapshot.broken = { lab_0: { broken: true } };
      eq.isBroken = true;
      throw new Error('設備已由其他事件故障');
    }
    return { ok: true };
  };
  const concurrentResult = await T.requestDeviceSabotage(mob, { ref: eq, kind: 'lab', name: eq.name });
  assert.equal(concurrentResult, false, 'Request itself threw error');
  assert.equal(eq.isBroken, true, 'Equipment must strictly preserve authoritative broken state from incoming snapshot');
});

test('Behavioral: Cloud mode ignores peer P2P device_repair packets via actual execution', () => {
  const root = path.join(__dirname, '../static/js');
  const context = {
    console, Date, Math,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    window: {
      addEventListener: () => {},
      GATHER_CONFIG: { season2: true },
      WORLD_MAP: {
        labEquipments: [{ idx: 0, isBroken: true, status: '💥BROKEN' }],
        workstations: [],
      },
    },
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'network.js'), 'utf8'), context);

  const net = new context.window.EphemeralOfficeNetwork();
  net.connect({ name: 'Bob', unit: 'PP10', x: 200, y: 200 });

  // 1. 雲端模式 (season2: true): 收到 P2P device_repair 封包 -> 封包被直接忽略，isBroken 保持 true
  net.handleIncomingPacket({ type: 'device_repair', nonce: 'nonce_cloud_1', idx: 0, id: 'lab_0' });
  assert.equal(context.window.WORLD_MAP.labEquipments[0].isBroken, true, 'In cloud mode, P2P device_repair must be ignored');

  // 2. 本地/離線模式 (season2: false): 收到 P2P device_repair 封包 -> 成功修改本地設備 isBroken = false
  context.window.GATHER_CONFIG.season2 = false;
  net.handleIncomingPacket({ type: 'device_repair', nonce: 'nonce_offline_1', idx: 0, id: 'lab_0' });
  assert.equal(context.window.WORLD_MAP.labEquipments[0].isBroken, false, 'In offline mode, P2P device_repair should repair locally');
});

test('Behavioral: completeRepairSession waits for backend resolution and rolls back on rejection', async () => {
  const root = path.join(__dirname, '../static/js');
  const nodes = new Map();
  const doc = {
    getElementById: (id) => nodes.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => {
      const el = {
        tagName: tag,
        style: {},
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        appendChild: (c) => { el.children.push(c); return c; },
        children: [],
        firstElementChild: { remove: () => {} },
        remove: () => {},
        addEventListener: () => {},
        setAttribute: () => {},
        removeAttribute: () => {},
        innerHTML: '',
      };
      if (tag === 'template') {
        el.content = { get textContent() { return el.innerHTML.replace(/<[^>]*>/g, ''); } };
      }
      return el;
    },
    body: { appendChild: () => {}, classList: { add: () => {}, remove: () => {} } },
    documentElement: { style: {} },
    head: { appendChild: () => {} },
  };
  const context = {
    console, Date, Math,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    requestAnimationFrame: () => {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    window: {
      addEventListener: () => {},
      innerWidth: 1200,
      innerHeight: 800,
      WORLD_MAP: {
        workstations: [],
        labEquipments: [{ name: 'Lab Equip 1', isBroken: true, status: '💥BROKEN' }],
        toiletStalls: []
      },
      GATHER_CONFIG: { season2: true }
    }
  };
  context.window.document = doc;
  context.document = doc;
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'network.js'), 'utf8'), context);

  let appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  appSrc = appSrc.replace("window.addEventListener('DOMContentLoaded', init);", 'window.__testInit = init;');
  vm.runInContext(appSrc, context);

  const T = context.window.__PP00_TEST__;
  assert.ok(T && typeof T.completeRepairSession === 'function', 'completeRepairSession must be exposed and executable');
  const season = T.getSeason();
  const targetLab = context.window.WORLD_MAP.labEquipments[0];

  // 1. 驗證等待中 (Waiting state): 在伺服器 Promise 未完成前，目標機台保持 isBroken=true，且無浮動文字特效
  let resolveSend;
  season.enabled = true;
  season.client = {
    send: () => new Promise((resolve) => { resolveSend = resolve; }),
    snapshot: { broken: { lab_0: { broken: true } } }
  };
  T.setActiveRepairSession({
    type: 'lab',
    target: targetLab,
    name: targetLab.name,
    targetX: 100, targetY: 100
  });

  const pendingPromise = T.completeRepairSession();
  assert.equal(targetLab.isBroken, true, 'While device_finish is pending, equipment must remain broken');
  assert.equal(T.getVfxList().filter(v => v.text === '🎉 完成維修').length, 0, 'No floating text while pending');

  // 2. 驗證後端拒絕 (Rejection state): 伺服器拒絕修復 -> 回滾，保持 isBroken=true，重置 session，絕不呈現成功 UI
  let rejectSend;
  season.client.send = () => new Promise((_, reject) => { rejectSend = reject; });
  T.setActiveRepairSession({
    type: 'lab',
    target: targetLab,
    name: targetLab.name,
    targetX: 100, targetY: 100
  });

  const rejectPromise = T.completeRepairSession();
  rejectSend(new Error('維修進度驗證失敗'));
  await rejectPromise;

  assert.equal(targetLab.isBroken, true, 'Upon backend rejection, equipment must remain broken');
  assert.equal(T.getActiveRepairSession(), null, 'Active repair session must be reset upon rejection');
  assert.equal(T.getVfxList().filter(v => v.text === '🎉 完成維修').length, 0, 'No floating text upon rejection');

  // 3. 驗證後端授權成功 (Success state): 伺服器核准 -> 成功修復，呈現完成浮動文字
  season.client.send = async () => ({ ok: true });
  T.setActiveRepairSession({
    type: 'lab',
    target: targetLab,
    name: targetLab.name,
    targetX: 100, targetY: 100
  });

  await T.completeRepairSession();
  assert.equal(targetLab.isBroken, false, 'Upon backend approval, equipment is repaired');
  assert.ok(T.getVfxList().some(v => v.text === '🎉 完成維修'), 'Celebratory floating text emitted upon success');
});
