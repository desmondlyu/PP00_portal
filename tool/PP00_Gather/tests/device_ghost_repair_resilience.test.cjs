const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

test('Resilience: device_finish timing tolerance and error messaging strictly separates insufficient time from repaired state', async () => {
  const engineModule = await import('../server/engine.mjs');
  const s = {
    players: {
      p: { id: 'p', connection: 'c_1', room: 'PP00', x: 1592.5, y: 1458, items: [], effects: {}, exp: 0 }
    },
    enemies: {},
    drops: {},
    tasks: {},
    broken: {
      lab_0: { broken: true, room: 'PP00' }
    }
  };
  const p = s.players.p;

  // 1. device_start 於 now = 1000 建立 channel
  engineModule.act(s, 'p', 'device_start', { target: 'lab_0' }, 1000);
  assert.ok(p.channel, 'Channel must be established on device_start');
  assert.equal(p.channel.target, 'lab_0');

  // 2. 測試若時間過短 (2000ms)，拋出專屬錯誤訊息，絕不可包含「已修好」，避免前端誤判為成功
  assert.throws(
    () => engineModule.act(s, 'p', 'device_finish', {}, 2000),
    (err) => {
      assert.match(err.message, /修復時間不足或未在維修狀態/);
      assert.ok(!err.message.includes('已修好'), 'Insufficient time error must NEVER include "已修好"');
      return true;
    }
  );

  // 3. 測試 2700ms 傳輸延遲容錯緩衝 (now - c.at = 2700ms >= 2600ms)，必須成功核准修復
  const res = engineModule.act(s, 'p', 'device_finish', {}, 3700);
  assert.equal(s.broken.lab_0.broken, false, 'Equipment must be marked as repaired');
  assert.equal(s.broken.lab_0.handledAt, 3700);
  assert.equal(p.channel, null, 'Channel must be cleared');
  assert.equal(p.exp, 30, 'XP must be awarded');
  assert.equal(res?.success, true);
});

test('Resilience: service.mjs carries alreadyRepaired actionResult back to client', async () => {
  const serviceModule = await import('../server/service.mjs');
  const engineModule = await import('../server/engine.mjs');
  const s = {
    players: {
      p: { id: 'p', connection: 'c_1', room: 'PP00', x: 1592.5, y: 1458, items: [], effects: {}, exp: 0, lastSeen: 1000, generation: 'g1' }
    },
    enemies: {},
    drops: {},
    tasks: {},
    broken: {
      lab_0: { broken: false, room: 'PP00', handledAt: 1000 }
    }
  };
  const p = s.players.p;
  // 建立虛擬 token
  const rawToken = 'test-token-12345';
  p.tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken)).then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''));
  p.sessionUntil = 100000;
  p.channel = { kind: 'device', at: 1000, x: p.x, y: p.y, target: 'lab_0' };

  // 透過 serviceModule.request 發送 device_finish
  const response = await serviceModule.request(s, 'device_finish', {}, rawToken, 4000);
  assert.ok(response, 'Response must be returned');
  assert.equal(response.actionResult?.alreadyRepaired, true, 'actionResult must contain alreadyRepaired: true');
  assert.equal(p.channel, null, 'Channel must be cleared by service handler');
});

function setupTestAppEnvironment(realMap = false) {
  const root = path.join(__dirname, '../static/js');
  const nodes = new Map();
  function makeEl(tag = 'div') {
    const el = {
      tagName: tag.toUpperCase(),
      classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
      style: {},
      setAttribute: () => {},
      getAttribute: () => null,
      appendChild: () => {},
      removeChild: () => {},
      remove: () => {},
      addEventListener: () => {},
      children: [],
      content: { textContent: '' },
      _html: '',
    };
    Object.defineProperty(el, 'innerHTML', {
      get() { return el._html; },
      set(val) { el._html = String(val); el.content.textContent = String(val); el.textContent = String(val); }
    });
    Object.defineProperty(el, 'textContent', {
      get() { return el.content.textContent; },
      set(val) { el.content.textContent = String(val); el._html = String(val); }
    });
    return el;
  }
  const defaultEl = makeEl();
  const doc = {
    getElementById: (id) => nodes.get(id) || defaultEl,
    querySelector: () => defaultEl,
    querySelectorAll: () => [],
    createElement: makeEl,
    body: { appendChild: () => {}, removeChild: () => {}, remove: () => {}, classList: { add: () => {}, remove: () => {} } },
    documentElement: { style: {}, classList: { toggle: () => {} } },
    head: { appendChild: () => {} },
  };
  const context = {
    console, Date, Math,
    setTimeout: (fn) => setTimeout(fn, 0), clearTimeout: () => {}, requestAnimationFrame: () => {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    window: {
      addEventListener: () => {}, innerWidth: 1200, innerHeight: 800,
      WORLD_MAP: {
        workstations: [],
        labEquipments: [
          { name: 'Advantest T5830ES #1', x: 1520, y: 1330, w: 145, h: 110, status: '💥BROKEN!', statusColor: '#ef4444', isBroken: true, kind: 'tester' }
        ],
        toiletStalls: []
      },
      GATHER_CONFIG: { season2: true, statuses: [{ id: 'active', dot: '#22c55e' }] }
    }
  };
  context.window.document = doc;
  context.document = doc;
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
  if (realMap) vm.runInContext(fs.readFileSync(path.join(root, 'world.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'network.js'), 'utf8'), context);
  let appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  appSrc = appSrc.replace("window.addEventListener('DOMContentLoaded', init);", 'window.__testInit = init; window.__testStartRepair = startActiveRepairSession; window.__testSyncEquipment = syncEquipmentState;');
  vm.runInContext(appSrc, context);
  return context;
}

test('Behavioral: seasonInteract network timeout/failure retains equipment broken state and submits synchronized pose', async () => {
  const context = setupTestAppEnvironment();
  const T = context.window.__PP00_TEST__;
  T.setEcosystem({ groundItems: [], mobs: [] });
  const season = T.getSeason();
  season.enabled = true;

  const targetEq = context.window.WORLD_MAP.labEquipments[0];
  const localPlayer = T.getLocalPlayer();
  // 設置玩家於機台旁
  localPlayer.x = 1592;
  localPlayer.y = 1458;

  let capturedPayload = null;
  season.client = {
    snapshot: {
      now: 1000,
      player: { id: 'local_p', effects: {} },
      players: [],
      drops: [],
      broken: {
        lab_0: { broken: true, room: 'PP00' }
      }
    },
    send: async (kind, payload) => {
      if (kind === 'device_start') {
        capturedPayload = payload;
        // 模擬網路超時報錯 (ETIMEDOUT)
        throw new Error('ETIMEDOUT: 網路連線逾時');
      }
      return { ok: true };
    }
  };

  // 執行互動
  const handled = await T.seasonInteract();
  assert.equal(handled, true);

  // 1. 驗證 payload.pose 確實附帶了玩家更新後的座標 (人物位置與開始請求一致)
  assert.ok(capturedPayload, 'device_start must be invoked');
  assert.equal(capturedPayload.target, 'lab_0');
  assert.ok(capturedPayload.pose, 'device_start must include player pose');
  assert.equal(capturedPayload.pose.x, targetEq.x + targetEq.w / 2);
  assert.equal(capturedPayload.pose.y, targetEq.y + targetEq.h + 18);

  // 2. 驗證連線失敗時，設備【絕不被擅自清除為完好】，保留損壞真實性！
  assert.equal(targetEq.isBroken, true, 'Equipment must remain broken upon network failure');
  assert.equal(targetEq.status, '💥BROKEN!');
  assert.equal(season.client.snapshot.broken.lab_0.broken, true, 'Snapshot must remain broken');
  assert.equal(T.getActiveRepairSession(), null, 'Repair session must not be started');
  assert.equal(localPlayer.actionState, null, 'Action state must be reset to stand');
});

test('Behavioral: equipment remains broken when device_start is rejected due to distance or error without falsifying PASS state', async () => {
  const context = setupTestAppEnvironment();
  const T = context.window.__PP00_TEST__;
  T.setEcosystem({ groundItems: [], mobs: [] });
  const season = T.getSeason();
  season.enabled = true;

  const targetEq = context.window.WORLD_MAP.labEquipments[0];
  targetEq.isBroken = true;
  targetEq.status = '💥BROKEN!';
  const localPlayer = T.getLocalPlayer();
  localPlayer.x = 1592;
  localPlayer.y = 1458;

  season.client = {
    snapshot: {
      now: 1000,
      player: { id: 'local_p', effects: {} },
      players: [],
      drops: [],
      broken: {
        lab_0: { broken: true, room: 'PP00' }
      }
    },
    send: async (kind) => {
      if (kind === 'device_start') {
        // 後端因距離過遠拒絕
        throw new Error('距離設備過遠');
      }
      return { ok: true };
    }
  };

  // 執行互動
  const handled = await T.seasonInteract();
  assert.equal(handled, true);

  // 驗證拒絕時絕不將損壞偽造為完好 PASS 狀態，嚴格保留真實故障
  assert.equal(targetEq.isBroken, true, 'Equipment must strictly remain broken');
  assert.equal(targetEq.status, '💥BROKEN!');
  assert.equal(season.client.snapshot.broken.lab_0.broken, true, 'Snapshot must strictly remain broken');
  assert.equal(T.getActiveRepairSession(), null, 'Repair session must not be active');
});

test('Behavioral: completeRepairSession on alreadyRepaired resets target to PASS without claiming reward or vfx', async () => {
  const context = setupTestAppEnvironment();
  const T = context.window.__PP00_TEST__;
  T.setEcosystem({ groundItems: [], mobs: [] });
  const season = T.getSeason();
  season.enabled = true;

  const targetEq = context.window.WORLD_MAP.labEquipments[0];
  targetEq.isBroken = true;

  // 設置活躍維修會話
  T.setActiveRepairSession({
    target: targetEq,
    type: 'lab',
    name: targetEq.name,
    startTime: 1000,
    duration: 3000,
    startX: 1592,
    startY: 1458,
    targetX: 1592,
    targetY: 1400,
  });

  const vfxBefore = T.getVfxList().length;
  season.client = {
    snapshot: {
      now: 4000,
      player: { id: 'local_p', effects: {} },
      players: [],
      drops: [],
      broken: {
        lab_0: { broken: true, room: 'PP00' }
      }
    },
    send: async (kind) => {
      if (kind === 'device_finish') {
        // 伺服器通知：設備已由其他玩家修好
        return {
          actionResult: { alreadyRepaired: true }
        };
      }
      return { ok: true };
    }
  };

  // 執行完成維修邏輯
  await T.completeRepairSession();

  // 1. 設備狀態恢復為 PASS READY
  assert.equal(targetEq.isBroken, false, 'Equipment must be synchronized to not broken');
  assert.equal(targetEq.status, 'PASS READY (100%)');
  assert.equal(season.client.snapshot.broken.lab_0.broken, false);

  // 2. 維修會話正常結束清理
  assert.equal(T.getActiveRepairSession(), null, 'Active repair session must be closed');

  // 3. 不宣稱本次領獎、不增加「🎉 完成維修」浮動文字與彩帶
  const vfxAfter = T.getVfxList().length;
  assert.equal(vfxAfter, vfxBefore, 'Must not spawn floating text or reward confetti when already repaired by peer');
});

test('Cloud repair requires a snapshot and a target belonging to the equipment list', async () => {
  const context = setupTestAppEnvironment();
  const T = context.window.__PP00_TEST__;
  T.setEcosystem({ groundItems: [], mobs: [] });
  T.setNetwork({ broadcastPacket() {}, getPublicState: () => ({}) });
  const eq = context.window.WORLD_MAP.labEquipments[0];
  Object.assign(T.getLocalPlayer(), { x: eq.x + eq.w / 2, y: eq.y + eq.h + 18 });
  T.getSeason().client = { snapshot: null };
  await T.tryInteractWithEnvironment();
  assert.equal(T.getActiveRepairSession(), null, 'No server channel means no local repair countdown');
  assert.equal(eq.isBroken, true);

  for (const [type, collection] of [['lab', 'labEquipments'], ['ws', 'workstations']]) {
    T.getSeason().client.snapshot = { player: { channel: { kind: 'device', target: `${type}_-1` } } };
    const foreignTarget = { ...eq, kind: type === 'lab' ? 'tester' : undefined };
    context.window.__testStartRepair(foreignTarget, type, 'Unknown equipment');
    assert.equal(T.getActiveRepairSession(), null, 'An unknown target must never start a repair with index -1');

    delete context.window.WORLD_MAP[collection];
    assert.doesNotThrow(() => context.window.__testStartRepair(foreignTarget, type, 'Missing equipment list'));
    assert.equal(T.getActiveRepairSession(), null, 'A missing list must not start a repair');
  }
});

test('Equipment visuals rebuild from the authoritative snapshot, including active and recently repaired devices', () => {
  const context = setupTestAppEnvironment(true);
  const T = context.window.__PP00_TEST__;
  const map = context.window.WORLD_MAP;
  const normalLab = map.labEquipments[3];
  const brokenLab = map.labEquipments[5];
  const normalWs = map.workstations[0];
  const brokenWs = map.workstations[1];
  for (const target of [normalLab, brokenLab, normalWs, brokenWs]) {
    Object.assign(target, { isBroken: true, brokenBy: 'Old mob', status: 'BROKEN',
      statusColor: '#ef4444', screenState: 'pass', leftScreen: 'FIX E', rightScreen: 'FAIL', lastRepairedAt: Date.now() });
  }
  T.setActiveRepairSession({ target: normalLab });
  context.window.__testSyncEquipment({ lab_5: { broken: true, brokenBy: 'Current mob' }, ws_1: { broken: true } });
  assert.equal(normalLab.isBroken, false);
  assert.equal(normalLab.brokenBy, null);
  assert.equal(normalLab.status, 'PASS READY (100%)');
  assert.equal(normalLab.statusColor, '#22c55e');
  assert.equal(normalWs.isBroken, false);
  assert.equal(normalWs.leftScreen, 'Pass');
  assert.equal(normalWs.rightScreen, 'Good');
  assert.equal(brokenLab.isBroken, true);
  assert.equal(brokenLab.brokenBy, 'Current mob');
  assert.equal(brokenLab.status, '💥BROKEN!');
  assert.equal(brokenWs.isBroken, true);
  assert.equal(brokenWs.screenState, 'error');
  assert.equal(T.getActiveRepairSession().target, normalLab, 'Peer repair must not fabricate a local reward');
  context.window.__testSyncEquipment(undefined);
  assert.equal(brokenLab.isBroken, true, 'An incomplete snapshot must not clear real faults');
});

test('Healthy cloud workstations never randomly advertise FIX E or FAIL', () => {
  const context = setupTestAppEnvironment(true);
  // Pick the first workstation and the old random red branch deterministically.
  context.Math = Object.create(Math);
  context.Math.random = () => 0;
  context.WORKSTATION_SCREEN_OPTIONS = context.window.WORKSTATION_SCREEN_OPTIONS;
  const eco = new context.window.OfficeEcosystem();
  for (const ws of context.window.WORLD_MAP.workstations) ws.isBroken = false;
  eco.update(60, []);
  const ws = context.window.WORLD_MAP.workstations[0];
  assert.ok(!['ERR!!', 'FIX E', 'FAIL', '😭', '哭臉'].includes(ws.leftScreen));
  assert.equal(ws.isBroken, false);
});

for (const [collection, index] of [['labEquipments', 0], ['labEquipments', 3], ['labEquipments', 5], ['workstations', 0]]) {
test(`Cloud repair completes through the real service without restarting its timer: ${collection}[${index}]`, async () => {
  const { request, digest } = await import('../server/service.mjs');
  const context = setupTestAppEnvironment(true);
  const T = context.window.__PP00_TEST__;
  T.setEcosystem({ groundItems: [], mobs: [] });
  T.setNetwork({ broadcastPacket() {}, getPublicState: () => ({}) });
  const eq = context.window.WORLD_MAP[collection][index];
  const targetId = `${collection === 'labEquipments' ? 'lab' : 'ws'}_${index}`;
  eq.isBroken = true;
  Object.assign(T.getLocalPlayer(), { x: eq.x + eq.w / 2, y: eq.y + eq.h + 18 });
  let now = 1000000;
  context.Date = class extends Date { static now() { return now; } };
  const token = 'repair-integration-fixture';
  const p = { id: 'p', name: 'p', unit: 'PP32', connection: 'p', room: 'PP00',
    x: eq.x + eq.w / 2, y: eq.y + eq.h + 18, items: [], effects: {}, exp: 0,
    tokenHash: await digest(token), sessionUntil: now + 100000, lastSeen: now };
  const s = { players: { p }, enemies: {}, drops: {}, tasks: {},
    broken: { [targetId]: { broken: true, room: 'PP00' } } };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/js/profileClient.js'), 'utf8'), context);
  context.crypto = crypto;
  const client = new context.GatherProfileClient('in-process');
  client.token = token;
  client.raw = body => request(s, body.action, body.data, token, now);
  client.snapshot = await request(s, 'snapshot', {}, token, now);
  T.getSeason().client = client;
  await T.tryInteractWithEnvironment();
  const session = T.getActiveRepairSession();
  assert.ok(session);
  assert.equal(p.channel.target, targetId);
  const beganAt = p.channel.at;
  now += 2000;
  await T.tryInteractWithEnvironment();
  assert.equal(p.channel.at, beganAt, 'Pressing E twice must not reset the server timer');
  assert.equal(T.getActiveRepairSession(), session);
  now += 1000;
  await T.completeRepairSession();
  assert.equal(s.broken[targetId].broken, false);
  assert.equal(eq.isBroken, false);
  assert.equal(p.exp, 30);
  assert.equal(p.channel, null);
  assert.equal(p.items.reduce((n, i) => n + (i.count || 1), 0), 1);
  assert.equal(T.getActiveRepairSession(), null);
});
}
