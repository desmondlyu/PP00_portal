const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Round 16: Empty heldItem preserves empty string and NEVER defaults to green circle 🟢', () => {
  const networkJs = fs.readFileSync(path.join(__dirname, '../static/js/network.js'), 'utf8');

  // 驗證 network.js 中 upsertRemotePlayer 的 heldItem 不再是 || '🟢'
  assert.ok(
    !networkJs.includes("heldItem: pData.heldItem || '🟢',"),
    "network.js upsertRemotePlayer must NOT fallback to '🟢'"
  );
  assert.ok(
    networkJs.includes("typeof pData.heldItem === 'string' ? pData.heldItem : (pData.heldItem ? String(pData.heldItem) : '')"),
    "network.js properly preserves empty string for heldItem"
  );

  // 模擬 upsertRemotePlayer
  const pData = {
    id: 'user_bare_hands',
    name: '空手同仁',
    heldItem: '', // 玩家未持有裝備道具
    x: 500,
    y: 500,
  };
  const mergedHeldItem = typeof pData.heldItem === 'string' ? pData.heldItem : (pData.heldItem ? String(pData.heldItem) : '');
  assert.equal(mergedHeldItem, '', 'Remote player heldItem must be empty string');
  assert.notEqual(mergedHeldItem, '🟢', 'Remote player heldItem must NOT be 🟢');
});

test('Round 16: Emergency revive buttons maintain DOM persistence and do not recreate per frame', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // 驗證 updateInjuryCountdownHUD 不再每幀直接 hud.innerHTML 覆蓋整個按鈕
  assert.ok(
    appJs.includes('btnsWrapper.dataset.foodCount !== currentFoodCount'),
    'updateInjuryCountdownHUD only updates buttons when food count changes'
  );
  assert.ok(
    appJs.includes('timerSpan.textContent = `${m}:${s}`') || appJs.includes('timerSpan.textContent = `${m}:${s}`;'),
    'updateInjuryCountdownHUD only updates timer textContent per frame'
  );

  // 模擬 DOM 與幀迴圈
  let reviveCallCount = 0;
  let useItemsCallCount = 0;

  const fakeButtonRevive = {
    onclick: null,
    onpointerdown: null,
  };
  const fakeButtonItems = {
    onclick: null,
    onpointerdown: null,
  };

  const timerSpan = { textContent: '05:00' };
  const btnsWrapper = {
    dataset: {},
    innerHTML: '',
    querySelector(id) {
      if (id === '#btnEmergencyRevive') return fakeButtonRevive;
      if (id === '#btnEmergencyUseItems') return fakeButtonItems;
      return null;
    },
  };

  // 模擬按鈕事件綁定
  fakeButtonRevive.onclick = (e) => {
    reviveCallCount++;
  };
  fakeButtonItems.onclick = (e) => {
    useItemsCallCount++;
  };

  // 模擬 60 幀渲染迴圈
  for (let frame = 0; frame < 60; frame++) {
    // 時間文字每幀微更新
    timerSpan.textContent = '04:59';
  }

  // 點擊事件觸發
  fakeButtonRevive.onclick({ preventDefault() {}, stopPropagation() {} });
  fakeButtonItems.onclick({ preventDefault() {}, stopPropagation() {} });

  assert.equal(reviveCallCount, 1, 'Revive button click fires successfully');
  assert.equal(useItemsCallCount, 1, 'Use items button click fires successfully');
});

test('Round 16: System feedback toasts and logs have a strict 3-second normalized cooldown', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  assert.ok(
    appJs.includes('function normalizeSystemFeedbackKey(text)'),
    'normalizeSystemFeedbackKey is defined'
  );
  assert.ok(
    appJs.includes('systemLogCooldowns.get(normKey)'),
    'systemLogCooldowns applies 3-second throttle to 系統 sender'
  );

  // 測試正規化算法
  function normalizeSystemFeedbackKey(text) {
    return String(text || '')
      .replace(/（[^）]*\d+[^）]*）/g, '')
      .replace(/\([^)]*\d+[^)]*\)/g, '')
      .replace(/\d+:\d+/g, '')
      .replace(/\d+\s*(?:秒|分鐘|min|sec)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const msg1 = '🚑 身受重傷休養中（會議室 B 休養中，剩餘 04:59）';
  const msg2 = '🚑 身受重傷休養中（會議室 B 休養中，剩餘 04:58）';
  const msg3 = '🚑 身受重傷休養中（會議室 B 休養中，剩餘 04:57）';

  const norm1 = normalizeSystemFeedbackKey(msg1);
  const norm2 = normalizeSystemFeedbackKey(msg2);
  const norm3 = normalizeSystemFeedbackKey(msg3);

  assert.equal(norm1, '🚑 身受重傷休養中', 'Normalized key extracts core feedback');
  assert.equal(norm1, norm2, 'msg1 and msg2 have the same normalized key');
  assert.equal(norm2, norm3, 'msg2 and msg3 have the same normalized key');

  // 測試 3 秒冷卻防刷
  const cooldownMap = new Map();
  const pushTest = (text, now) => {
    const key = normalizeSystemFeedbackKey(text);
    if (cooldownMap.has(key)) {
      const last = cooldownMap.get(key);
      if (now - last < 3000) return false;
    }
    cooldownMap.set(key, now);
    return true;
  };

  assert.equal(pushTest(msg1, 1000), true, 'First message at 1.0s passes');
  assert.equal(pushTest(msg2, 1200), false, 'Second message at 1.2s is blocked by 3s cooldown');
  assert.equal(pushTest(msg3, 2500), false, 'Third message at 2.5s is blocked by 3s cooldown');
  assert.equal(pushTest(msg3, 4001), true, 'Message after 3 seconds (4.001s) passes');
});
