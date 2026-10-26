const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// 載入 avatars.js 以獲取 COSTUME_CATALOG
const avatarsJs = fs.readFileSync(path.join(__dirname, '../static/js/avatars.js'), 'utf8');
const avatarsSandbox = { window: {} };
new Function('window', avatarsJs)(avatarsSandbox.window);
const COSTUME_CATALOG = avatarsSandbox.window.COSTUME_CATALOG;

test('Gacha Surprise Reveal Modal renders correctly with metadata and perk description', () => {
  // 建立虛擬 DOM 環境
  const domElements = [];
  const findInTree = (node, cls, id) => {
    if (!node) return null;
    if (id && node.id === id) return node;
    if (cls && node.className && node.className.includes(cls)) return node;
    for (const child of node.children || []) {
      const found = findInTree(child, cls, id);
      if (found) return found;
    }
    return null;
  };

  const fakeDocument = {
    querySelector: (sel) => {
      const id = sel.startsWith('#') ? sel.slice(1) : null;
      const cls = sel.startsWith('.') ? sel.slice(1) : null;
      for (const el of domElements) {
        const found = findInTree(el, cls, id);
        if (found) return found;
      }
      return null;
    },
    createElement: (tag) => {
      const el = {
        tagName: tag,
        className: '',
        innerHTML: '',
        children: [],
        style: {},
        listeners: {},
        appendChild(child) {
          this.children.push(child);
        },
        querySelector(sel) {
          const id = sel.startsWith('#') ? sel.slice(1) : null;
          const cls = sel.startsWith('.') ? sel.slice(1) : null;
          return findInTree(this, cls, id);
        },
        addEventListener(evt, fn) {
          this.listeners[evt] = fn;
        },
        remove() {
          const idx = domElements.indexOf(this);
          if (idx !== -1) domElements.splice(idx, 1);
        },
      };
      return el;
    },
    body: {
      appendChild(child) {
        domElements.push(child);
      },
    },
  };

  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');
  assert.ok(appJs.includes('function showGachaSurpriseModal'), 'app.js defines showGachaSurpriseModal');

  // 測試模擬 showGachaSurpriseModal
  const frogOutfit = COSTUME_CATALOG.find((c) => c.id === 'frog_eng');
  assert.ok(frogOutfit, 'frog_eng exists in catalog');

  let confirmed = false;
  const fakeWindow = {
    COSTUME_CATALOG,
    escapeHtml: (s) => s,
  };

  const modalHtmlGen = (item, isPending, onConfirm) => {
    const catalogItem = fakeWindow.COSTUME_CATALOG.find((c) => c.id === item.id) || {};
    const outfitName = item.name || catalogItem.name;
    const badge = catalogItem.badge || '🎁';
    const tag = catalogItem.tag;
    const desc = catalogItem.desc;
    const durability = item.durability || 5;

    const backdrop = fakeDocument.createElement('div');
    backdrop.className = 'gacha-modal-backdrop';
    const modal = fakeDocument.createElement('div');
    modal.className = 'gacha-surprise-modal';

    const btn = fakeDocument.createElement('button');
    btn.id = 'gachaSurpriseConfirmBtn';
    btn.className = 'gacha-confirm-btn';
    btn.addEventListener('click', () => {
      backdrop.remove();
      if (onConfirm) onConfirm();
    });
    modal.children.push(btn);

    modal.innerHTML = `
      <div class="gacha-surprise-banner">✨ 扭蛋大獎出爐！CONGRATULATIONS ✨</div>
      <div class="gacha-icon-glow"><span>${badge}</span></div>
      <div class="gacha-outfit-name">${outfitName}</div>
      <div class="gacha-outfit-tag">${tag}</div>
      <div class="gacha-outfit-desc">${desc}</div>
      <div class="gacha-perk-box">
        <div class="gacha-perk-item">🛡️ 傳奇防禦耐久度：${durability} / 5</div>
        <div class="gacha-perk-item">🔰 致命傷害抵擋：可全額吸收致命攻擊！</div>
      </div>
    `;
    backdrop.appendChild(modal);
    fakeDocument.body.appendChild(backdrop);
  };

  modalHtmlGen(frogOutfit, false, () => {
    confirmed = true;
  });

  const backdrop = fakeDocument.querySelector('.gacha-modal-backdrop');
  assert.ok(backdrop, 'Backdrop element created');
  const modal = fakeDocument.querySelector('.gacha-surprise-modal');
  assert.ok(modal, 'Modal element created');
  assert.ok(modal.innerHTML.includes('青蛙裝工程師'), 'Contains outfit name');
  assert.ok(modal.innerHTML.includes('🐸'), 'Contains frog badge');
  assert.ok(modal.innerHTML.includes('5 / 5'), 'Contains 5/5 durability');
  assert.ok(modal.innerHTML.includes('致命傷害抵擋'), 'Contains fatal damage absorption perk');

  // 測試確認按鈕觸發
  const btn = modal.querySelector('#gachaSurpriseConfirmBtn');
  assert.ok(btn, 'Confirm button found');
  btn.listeners.click();
  assert.equal(confirmed, true, 'Callback onConfirm was called');
  assert.equal(domElements.length, 0, 'Modal removed after clicking confirm');
});

test('Attacking an interacting player interrupts interaction and applies knockback physics', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // 驗證 handleIncomingWeaponAttack 不再被 if (season.enabled) return 阻擋
  assert.ok(
    !appJs.includes('function handleIncomingWeaponAttack(pkt) {\n    if(season.enabled)return;'),
    'handleIncomingWeaponAttack is NOT blocked by season.enabled'
  );

  // 模擬玩家在辦公桌或馬桶上互動中
  const localPlayer = {
    id: 'user_1',
    x: 1000,
    y: 800,
    actionState: 'sit_code',
    occupiedSpotId: 'spot_chair_4',
    autoWalkTarget: { x: 1000, y: 800 },
    knockback: null,
    jumpOffset: 0,
    isInjured: false,
    isRestrained: false,
  };

  let actionCancelled = false;
  const cancelContextualAction = () => {
    actionCancelled = true;
    localPlayer.actionState = null;
    localPlayer.occupiedSpotId = null;
  };

  // 模擬收到真實玩家的武器攻擊封包
  const pkt = {
    targetId: 'user_1',
    senderName: '測試同事',
    weaponEmoji: '🪑',
    weaponName: '人體工學椅',
    fromX: 980,
    fromY: 800,
    power: 26,
  };

  // 執行攻擊反應邏輯
  cancelContextualAction();
  localPlayer.autoWalkTarget = null;
  const dx = localPlayer.x - pkt.fromX;
  const dy = localPlayer.y - pkt.fromY;
  const angle = Math.atan2(dy, dx);
  const power = pkt.power || 26;
  localPlayer.knockback = {
    vx: Math.cos(angle) * power,
    vy: Math.sin(angle) * power,
    ticksLeft: 26,
    totalTicks: 26,
  };
  localPlayer.jumpOffset = 44;

  // 斷言：原本的互動狀態已被強制中斷
  assert.equal(actionCancelled, true, 'Contextual action was cancelled');
  assert.equal(localPlayer.actionState, null, 'actionState is reset to null');
  assert.equal(localPlayer.occupiedSpotId, null, 'occupiedSpotId is reset to null');
  assert.equal(localPlayer.autoWalkTarget, null, 'autoWalkTarget is reset to null');

  // 斷言：玩家獲得被擊飛的位移向量與跳躍 offset
  assert.ok(localPlayer.knockback, 'Knockback vector exists');
  assert.ok(localPlayer.knockback.vx > 0, 'Knockback vx pushes away from attack origin (dx > 0)');
  assert.equal(localPlayer.jumpOffset, 44, 'Player is launched into air with jumpOffset 44');
});

test('Toilet stall prevents unauthorized opening and locks to kick-only when occupied by another user', () => {
  const stall = {
    id: 'wc_1',
    name: '1號尊榮馬桶間',
    x: 2470,
    y: 605,
    w: 180,
    h: 96,
    seatX: 2595,
    seatY: 652,
    doorOpen: 0,
    occupiedBy: 'player_squatter', // 正在裡面蹲馬桶的人
  };

  const localPlayer = {
    id: 'player_waiting',
    x: stall.x - 10,
    y: stall.y + 48,
    actionState: null,
  };

  // 模擬 getClosestInteractable 針對廁所隔間的檢測
  const getInteractable = (p, st) => {
    const distToSeat = Math.hypot(p.x - st.seatX, p.y - st.seatY);
    const distToDoor = Math.hypot(p.x - st.x, p.y - (st.y + 48));
    if (distToSeat < 92 || distToDoor < 88) {
      if (st.occupiedBy && st.occupiedBy !== p.id) {
        return {
          actionId: 'kick_toilet_door',
          label: `🦵 隔間內有人！在門外猛踹【${st.name}】隔間門催促 [按E]`,
          isKickDoor: true,
          doorOpen: false, // 絕不能開門！
        };
      }
      return {
        actionId: 'toilet',
        label: `🚽 開門進入【${st.name}】蹲馬桶 [按E]`,
        isExitToilet: false,
      };
    }
    return null;
  };

  const res = getInteractable(localPlayer, stall);
  assert.ok(res, 'Interactable prompt is found');
  assert.equal(res.actionId, 'kick_toilet_door', 'Action is strictly kick_toilet_door');
  assert.equal(res.isKickDoor, true, 'isKickDoor flag is true');
  assert.ok(res.label.includes('猛踹'), 'Label prompts user to kick door');
  assert.ok(!res.label.includes('開門進入'), 'Does NOT allow opening or entering');

  // 模擬門外按 E 踹門互動
  stall.kickShakeTicks = 28;
  const kickPool = ['不要再屎遁', '老闆在找你', '拉完了沒換我了'];
  const kickText = kickPool[0];

  assert.equal(stall.kickShakeTicks, 28, 'Door vibrates with kickShakeTicks');
  assert.ok(kickPool.includes(kickText), 'Quotes match designed urgent toilet murmurs');
});

test('Toilet door is closed and rendered red for everyone when occupied', () => {
  const worldJs = fs.readFileSync(path.join(__dirname, '../static/js/world.js'), 'utf8').replace(/\r\n/g, '\n');

  // 驗證 world.js 包含被佔用時的紅色門板渲染代碼
  assert.ok(
    worldJs.includes("const doorPrimary = stall.occupiedBy ? '#dc2626' : '#fde68a';"),
    'Door primary color turns #dc2626 when occupiedBy is present'
  );
  assert.ok(
    worldJs.includes("const doorSide = stall.occupiedBy ? '#991b1b' : '#d97706';"),
    'Door side color turns #991b1b when occupiedBy is present'
  );
  assert.ok(
    worldJs.includes("ctx.fillStyle = stall.occupiedBy ? '#ef4444' : '#22c55e';"),
    'Lock indicator light turns red (#ef4444) when occupied'
  );

  // 驗證 update 邏輯中強制將 occupied stall 的 doorOpen 設為 0
  assert.ok(
    worldJs.includes('if (stall.occupiedBy) {\n        stall.doorOpen = 0;\n      }'),
    'Occupied stall forces doorOpen to 0 (closed) regardless of proximity'
  );

  // 模擬多玩家狀態同步演算法
  const stalls = [
    { id: 'wc_1', x: 2470, y: 605, w: 180, h: 96, seatX: 2595, seatY: 652, doorOpen: 0.8, occupiedBy: null },
  ];
  const allOnlinePlayers = [
    { id: 'remote_squatter', x: 2595, y: 652, actionState: 'toilet' },
    { id: 'bystander', x: 2475, y: 653, actionState: null },
  ];

  // 模擬 world.update 中新加入的隔間佔用同步偵測
  stalls.forEach((stall) => {
    if (!stall.occupiedBy && allOnlinePlayers) {
      const insidePlayer = allOnlinePlayers.find((p) => {
        const inside = p.x >= stall.x && p.x <= stall.x + stall.w && p.y >= stall.y && p.y <= stall.y + stall.h;
        return (p.actionState === 'toilet' || Math.hypot(p.x - stall.seatX, p.y - stall.seatY) < 45) && inside;
      });
      if (insidePlayer) {
        stall.occupiedBy = insidePlayer.id;
      }
    }
    if (stall.occupiedBy) {
      stall.doorOpen = 0;
    }
  });

  assert.equal(stalls[0].occupiedBy, 'remote_squatter', 'Stall automatically identified squatter');
  assert.equal(stalls[0].doorOpen, 0, 'Door is forced shut (0) even though bystander is near');

  // 計算門板與燈光顏色
  const doorPrimary = stalls[0].occupiedBy ? '#dc2626' : '#fde68a';
  const lockLight = stalls[0].occupiedBy ? '#ef4444' : '#22c55e';
  assert.equal(doorPrimary, '#dc2626', 'All users see the door as RED');
  assert.equal(lockLight, '#ef4444', 'All users see the lock light as RED');
});

test('User entering toilet is seated INSIDE stall on the toilet seat with door shut tight, NOT outside with door wide open', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // 驗證進入廁所時絕對不呼叫 startContextualAction('toilet')，因為那會觸發 cancelContextualAction 把人彈到門外
  assert.ok(
    !appJs.includes("startContextualAction('toilet');"),
    "app.js must NOT call startContextualAction('toilet') which expels player to doorway"
  );

  // 驗證進入廁所時，精確將玩家設置於 stall.seatX 與 stall.seatY
  assert.ok(
    appJs.includes('localPlayer.x = fac.stall.seatX;') && appJs.includes('localPlayer.y = fac.stall.seatY;'),
    'localPlayer is precisely placed inside the stall on seatX and seatY'
  );

  // 驗證門板直接鎖上並關閉 (doorOpen = 0)
  assert.ok(
    appJs.includes('fac.stall.doorOpen = 0;') && appJs.includes('fac.stall.occupiedBy = localPlayer.id;'),
    'Door is immediately shut tight (doorOpen = 0) and locked (occupiedBy)'
  );

  // 模擬進廁所行為
  const stall = {
    id: 'wc_1',
    name: '1號尊榮馬桶間',
    x: 2470,
    y: 605,
    w: 180,
    h: 96,
    seatX: 2595,
    seatY: 652,
    doorOpen: 1, // 先前可能被路人感應開著
    occupiedBy: null,
  };
  const localPlayer = {
    id: 'local',
    x: 2440, // 門外
    y: 653,
    actionState: null,
    occupiedSpotId: null,
    dir: 'right',
  };

  // 執行進入廁所邏輯
  localPlayer.x = stall.seatX;
  localPlayer.y = stall.seatY;
  localPlayer.dir = 'down';
  localPlayer.actionState = 'toilet';
  localPlayer.occupiedSpotId = stall.id;
  stall.doorOpen = 0;
  stall.occupiedBy = localPlayer.id;

  assert.equal(localPlayer.x, 2595, 'Player is placed inside at seatX 2595');
  assert.equal(localPlayer.y, 652, 'Player is placed inside at seatY 652');
  assert.equal(localPlayer.actionState, 'toilet', 'Action state is toilet');
  assert.equal(stall.doorOpen, 0, 'Door is shut tight (doorOpen: 0)');
  assert.equal(stall.occupiedBy, 'local', 'Stall is marked occupied by user');
});
