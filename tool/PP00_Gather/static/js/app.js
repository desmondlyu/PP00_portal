// PP00 Gather Office — 主控制器 (V7: 整合左下深色聊天/狀態面板、無動作30秒自動閒置、廁所隔間防進與踹門MURMUR、攻擊主管關緊閉訓話10秒、快捷鍵防洗版冷卻、情境睡覺與Alt快捷鍵)

(function () {
  let canvas, ctx;
  let ecosystem, network;
  let tick = 0;
  let isLoggedIn = false;
  const season = {enabled: window.GATHER_CONFIG.season2 === true, client:null, busy:false, lastPoll:0, polling:false, pendingChoice:false, attacking:false, hiddenDrops:new Set(), effects:{}, lastDamage:null};
  const gameClock=window.OfficeProgression?.clock();
  const gameNow=()=>season.enabled&&gameClock?gameClock.now():Date.now();
  if(season.enabled)window.GatherServerClock=gameClock;
  let loginTimestamp = 0;

  // 安全性冷卻時間與自動閒置追蹤
  let lastUserActionAt = gameNow();
  let lastInteractAt = 0;
  let lastWeaponAttackAt = 0;
  let isAutoIdled = false;

  // 聊天與動態紀錄佇列 (僅存於 RAM)
  // - 真實使用者對談上限 20 行 (自動洗掉)
  // - NPC 與狀態/動作紀錄上限 10 行 (自動洗掉)
  const userChatHistory = [];
  const statusLogHistory = [];
  let chatOnlyFilter = false;
  let activePipWindow = null;

  const PERSISTENCE_KEY = 'PP00_GATHER_PERSISTENCE_v1';
  const LOGIN_SESSION_KEY = 'PP00_GATHER_LOGIN_SESSION_v1';

  function saveLoginSession(autoLogin = true) {
    try {
      const session = {
        name: localPlayer.name,
        unit: localPlayer.unit,
        status: localPlayer.status || 'active',
        avatarId: localPlayer.avatarId,
        passcode: (document.getElementById('loginPasscode')?.value || '').trim(),
        roomCode: 'PP00',
        autoLogin: !!autoLogin,
        savedAt: gameNow(),
      };
      localStorage.setItem(LOGIN_SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('儲存登入憑證失敗：', e);
    }
  }

  function loadLoginSession() {
    try {
      const raw = localStorage.getItem(LOGIN_SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  async function triggerGameReload() {
    if(season.enabled&&season.client){try{await season.client.flush();}catch(e){seasonError(e);return;}}
    if (!isLoggedIn) {
      window.location.reload();
      return;
    }
    showToast('🔄 正在儲存狀態並重新整理遊戲（免手動重新登入）...', 'join');
    savePersistentState();
    saveLoginSession(true);
    setTimeout(() => {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.location.href = `${cleanUrl}?v=${gameNow()}`;
    }, 150);
  }

  // 儲存持久化狀態（包含裝備、持有道具、耐久度、重傷休養計時、鳥人指揮官暫時休養狀態）
  function savePersistentState() {
    try {
      const state = {
        equippedSlots: localPlayer.equippedSlots,
        backpack: localPlayer.inventory,
        overflow: localPlayer.overflow || [],
        wornOutfitUid: localPlayer.wornOutfitUid || null,
        heldItem: localPlayer.heldItem,
        activeEquipIndex: localPlayer.activeEquipIndex,
        isInjured: !!localPlayer.isInjured,
        injuredUntil: localPlayer.injuredUntil || 0,
        birdCommanderRestUntil: localPlayer.birdCommanderRestUntil || 0,
      };
      localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('儲存持久化狀態失敗：', e);
    }
  }

  function loadPersistentState() {
    try {
      const raw = localStorage.getItem(PERSISTENCE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  // 浮動提示重傷休養 5 分鐘倒數 HUD
  function updateInjuryCountdownHUD() {
    let hud = document.getElementById('injuryHudBanner');
    if (localPlayer.isInjured && gameNow() < (localPlayer.injuredUntil || 0)) {
      if (!hud) {
        hud = document.createElement('div');
        hud.id = 'injuryHudBanner';
        hud.style.position = 'fixed';
        hud.style.top = '22%';
        hud.style.left = '50%';
        hud.style.right = 'auto';
        hud.style.transform = 'translate(-50%, -50%)';
        hud.style.zIndex = '99999';
        hud.style.background = 'linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(153, 27, 27, 0.98))';
        hud.style.color = '#ffffff';
        hud.style.padding = '12px 24px';
        hud.style.borderRadius = '32px';
        hud.style.fontWeight = '700';
        hud.style.fontSize = '15px';
        hud.style.boxShadow = '0 12px 36px rgba(220, 38, 38, 0.65), 0 0 20px rgba(248, 113, 113, 0.4)';
        hud.style.border = '2px solid #fecaca';
        hud.style.letterSpacing = '0.04em';
        hud.style.backdropFilter = 'blur(12px)';
        hud.style.userSelect = 'none';
        hud.style.pointerEvents = 'auto';
        hud.style.display = 'flex';
        hud.style.alignItems = 'center';
        hud.style.gap = '14px';

        hud.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;">
            <span>🚑 <strong>身受重傷休養中</strong>｜無法動彈剩餘：<span id="injuryTimerSpan" style="font-variant-numeric:tabular-nums; color:#fef08a; font-weight:800;">00:00</span></span>
          </div>
          <div id="injuryButtonsWrapper" style="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;"></div>
        `;
        document.body.appendChild(hud);
      }

      const remSec = Math.max(0, Math.ceil((localPlayer.injuredUntil - gameNow()) / 1000));
      const m = String(Math.floor(remSec / 60)).padStart(2, '0');
      const s = String(remSec % 60).padStart(2, '0');

      const timerSpan = hud.querySelector('#injuryTimerSpan');
      if (timerSpan && timerSpan.textContent !== `${m}:${s}`) {
        timerSpan.textContent = `${m}:${s}`;
      }

      const foodItems = (localPlayer.equippedSlots || []).concat(localPlayer.inventory || [])
        .filter(i => i && ['coffee', 'pizza', 'boba'].includes(i.id));

      const btnsWrapper = hud.querySelector('#injuryButtonsWrapper');
      const currentFoodCount = String(foodItems.length);

      // 僅在按鈕結構改變或初次建立時更新按鈕，絕不在每幀破壞重建 DOM 按鈕！
      if (btnsWrapper && btnsWrapper.dataset.foodCount !== currentFoodCount) {
        btnsWrapper.dataset.foodCount = currentFoodCount;
        let buttonsHtml = '';
        if (foodItems.length > 0) {
          buttonsHtml = `
            <button id="btnEmergencyUseItems" type="button" style="
              background: linear-gradient(135deg, #f59e0b, #d97706);
              color: #ffffff;
              border: 1px solid #fcd34d;
              border-radius: 20px;
              padding: 6px 14px;
              font-weight: 800;
              font-size: 13px;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
              transition: transform 0.12s ease, filter 0.12s ease;
              outline: none;
              display: inline-flex;
              align-items: center;
              gap: 4px;
            ">🍱 消除物資縮短時間 (${foodItems.length}個，每樣-2分)</button>
            <button id="btnEmergencyRevive" type="button" style="
              background: linear-gradient(135deg, #10b981, #059669);
              color: #ffffff;
              border: 1px solid #6ee7b7;
              border-radius: 20px;
              padding: 6px 14px;
              font-weight: 800;
              font-size: 13px;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
              transition: transform 0.12s ease, filter 0.12s ease;
              outline: none;
              display: inline-flex;
              align-items: center;
              gap: 4px;
            ">✨ 立即急救甦醒 (緊急脫困) [-50 EXP]</button>
          `;
        } else {
          buttonsHtml = `
            <button id="btnEmergencyRevive" type="button" style="
              background: linear-gradient(135deg, #10b981, #059669);
              color: #ffffff;
              border: 1px solid #6ee7b7;
              border-radius: 20px;
              padding: 6px 14px;
              font-weight: 800;
              font-size: 13px;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
              transition: transform 0.12s ease, filter 0.12s ease;
              outline: none;
              display: inline-flex;
              align-items: center;
              gap: 4px;
            ">✨ 立即急救甦醒 (緊急脫困) [-50 EXP]</button>
          `;
        }
        btnsWrapper.innerHTML = buttonsHtml;

        const btnItems = btnsWrapper.querySelector('#btnEmergencyUseItems');
        if (btnItems) {
          const handleUseItems = (e) => {
            e.preventDefault();
            e.stopPropagation();
            emergencyReviveLocalPlayer('item');
          };
          btnItems.onclick = handleUseItems;
          btnItems.onpointerdown = handleUseItems;
        }

        const btnRevive = btnsWrapper.querySelector('#btnEmergencyRevive');
        if (btnRevive) {
          const handleRevive = (e) => {
            e.preventDefault();
            e.stopPropagation();
            emergencyReviveLocalPlayer('exp');
          };
          btnRevive.onclick = handleRevive;
          btnRevive.onpointerdown = handleRevive;
        }
      }

      hud.style.display = 'flex';
    } else if (hud) {
      hud.style.display = 'none';
    }
  }

  function emergencyReviveLocalPlayer() {
    const mode = arguments[0] || 'auto';
    if (!localPlayer.isInjured) return;
    const now = gameNow();
    let rem = Math.max(0, (localPlayer.injuredUntil || 0) - now);

    if (season.enabled) {
      (async () => {
        const res = await seasonSend('emergency_revive', { mode });
        if (!res) return;
        const snap = season.client?.snapshot;
        const p = snap?.player;
        const e = p?.effects || season.effects || {};
        if (e.injuredUntil > now) {
          const remSec = Math.max(0, Math.ceil((e.injuredUntil - now) / 1000));
          const m = String(Math.floor(remSec / 60)).padStart(2, '0');
          const s = String(remSec % 60).padStart(2, '0');
          showCombatToast(`🍱 消除物資縮短時間成功！剩餘休養：${m}:${s}`, 'info');
          pushStatusLog('系統', `🍱 消除急救物資（咖啡/披薩/珍奶），休養時間縮短！剩餘 ${m}:${s}`);
          updateInjuryCountdownHUD();
          return;
        }
        localPlayer.isInjured = false;
        localPlayer.injuredUntil = 0;
        localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
        localPlayer.autoWalkTarget = null;
        localPlayer.knockback = null;
        savePersistentState();
        updatePoseLabelUI();
        updateInjuryCountdownHUD();
        ensurePlayerNotStuck();
        if (res.method === 'exp') {
          showToast('💖 扣除 50 EXP 緊急急救甦醒，恢復自由走動能力！', 'join');
          pushStatusLog('系統', '💖 扣除 50 EXP 啟動緊急甦醒，成功脫困！');
        } else {
          showToast('💖 消除急救物資縮短時間完畢，成功甦醒並恢復自由行動！', 'join');
          pushStatusLog('系統', '💖 消除急救物資（咖啡/披薩/珍奶），重傷時間扣除完畢，成功甦醒！');
        }
        if (network) {
          network.broadcastPacket('state_sync', { player: network.getPublicState() });
          window.OfficeCombat?.send(network, 'recovery_release');
        }
      })();
      return;
    }

    // 非 Season 模式 本地同步處理
    const foodIds = ['coffee', 'pizza', 'boba'];
    const consumed = [];
    if (mode !== 'exp') {
      while (rem > 0) {
        let foundIdx = -1, inEquip = false;
        const eqIdx = (localPlayer.equippedSlots || []).findIndex(i => i && foodIds.includes(i.id));
        if (eqIdx !== -1) { foundIdx = eqIdx; inEquip = true; }
        else {
          const invIdx = (localPlayer.inventory || []).findIndex(i => i && foodIds.includes(i.id));
          if (invIdx !== -1) foundIdx = invIdx;
        }
        if (foundIdx === -1) break;
        let used = null;
        if (inEquip) {
          used = localPlayer.equippedSlots[foundIdx];
          localPlayer.equippedSlots[foundIdx] = null;
        } else {
          used = localPlayer.inventory.splice(foundIdx, 1)[0];
        }
        consumed.push(used.name || used.id);
        rem = Math.max(0, rem - 120000);
      }
      localPlayer.injuredUntil = now + rem;
      if (rem <= 0) {
        localPlayer.isInjured = false;
        localPlayer.injuredUntil = 0;
        showToast(`🍱 消耗【${consumed.join('、')}】縮短休養時間，成功完全甦醒！`, 'join');
        pushStatusLog('系統', `💖 消耗急救物資【${consumed.join('、')}】，成功甦醒！`);
      } else if (consumed.length > 0 && (mode === 'item' || mode === 'auto')) {
        const remSec = Math.ceil(rem / 1000);
        const m = Math.floor(remSec / 60), s = remSec % 60;
        showToast(`🍱 消除物資縮短了 ${consumed.length * 2} 分鐘！剩餘休養：${m}分${s}秒`, 'info');
        pushStatusLog('系統', `🍱 消除物資【${consumed.join('、')}】，剩餘休養時間縮短至 ${m}分${s}秒！`);
        savePersistentState();
        updateInjuryCountdownHUD();
        return;
      }
    }

    if (localPlayer.isInjured && (mode === 'exp' || (mode === 'auto' && consumed.length === 0))) {
      try { if (typeof addExp === 'function') addExp(-50); } catch (_) {}
      localPlayer.isInjured = false;
      localPlayer.injuredUntil = 0;
      showToast('💖 扣除 50 EXP 緊急急救甦醒，恢復自由走動能力！', 'join');
      pushStatusLog('系統', '💖 扣除 50 EXP 啟動緊急甦醒，成功脫困！');
    }

    localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
    localPlayer.autoWalkTarget = null;
    localPlayer.knockback = null;
    savePersistentState();
    try { syncPlayerActiveWeaponState(); } catch (_) {}
    updatePoseLabelUI();
    try { updateSelfHudCard(); } catch (_) {}
    updateInjuryCountdownHUD();
    ensurePlayerNotStuck();
    if (network) {
      network.broadcastPacket('state_sync', { player: network.getPublicState() });
      window.OfficeCombat?.send(network, 'recovery_release');
    }
  }
  window.emergencyReviveLocalPlayer = emergencyReviveLocalPlayer;

  // 依照 24 小時時段與武器強度階梯 (5%~20%) 計算加權隨機道具與武器
  function getRandomHeldItemMeta() {
    return window.getWeightedRandomItem
      ? window.getWeightedRandomItem(window.GATHER_CONFIG.items.filter(i=>i.category!=='outfit'))
      : window.GATHER_CONFIG.items[0];
  }

  function getRandomWeaponMeta() {
    return window.getWeightedRandomItem
      ? window.getWeightedRandomItem(window.GATHER_CONFIG.weapons)
      : window.GATHER_CONFIG.weapons[0];
  }

  // 玩家本機狀態 (支援持久化存檔)
  const localPlayer = {
    id: 'local',
    name: '',
    unit: '',
    avatarId: 'office_1',
    status: 'active',
    heldItem: '🪑',
    equippedMeta: null,
    // 最多同時裝備 3 個道具/武器，每個具備 durability: 3 (擊退 3 次損毀消失)
    equippedSlots: [null, null, null],
    activeEquipIndex: 0,
    // 持有物品儲物欄 (未裝備的道具與武器)
    inventory: [],
    overflow: [],
    wornOutfitUid: null,
    weaponSwing: null, // { emoji, ticksLeft, totalTicks }
    actionState: null, // 12 種情境動作 ID (含 sleep_bed)
    isInjured: false,  // 🚑 重傷狀態
    injuredUntil: 0,   // 🚑 重傷截止時間戳
    isRestrained: false, // 🚨 受警衛管教拘禁狀態 (無法移動與反擊 10 秒)
    restrainedUntil: 0,
    birdCommanderRestUntil: 0, // 🦩 鳥人指揮官暫時休養截止時間戳（不再永久流放）
    x: 880,
    y: 525,
    dir: 'down',
    isMoving: false,
    baseSpeed: 4.4,
    speed: 4.4,
    jumpOffset: 0,
    knockback: null, // 被暴走 NPC 攻擊時自動被打飛拋物線狀態（絕不定身）
    murmur: null,
    emote: null,
    autoWalkTarget: null,
  };

  // 上線次數與經驗加成系統
  const progression = {
    loginCount: 1,
    exp: 0,
    level: 1,
    title: 'Lv.1 菜鳥工程師',
    speedBonusPct: 0,
  };

  const keys = {};
  const touchMove = { x: 0, y: 0 };
  let marketPollTimer = null;
  let berserkBannerTimer = null;

  const FIST_WEAPON = Object.freeze({
    id: 'fist',
    name: '徒手拳頭',
    emoji: '👊',
    category: 'weapon',
    power: 3,
    hitsToRepel: 10,
    durability: Infinity,
    maxDurability: '∞',
    expBonusPct: 0,
    knockbackExp: 5,
    isFist: true,
  });

  let rmaBannerTimer = null;
  let lastRmaStage = null;
  let lastRmaProgress = -1;

  function showRmaMissionBanner(title, subtitle, progressText) {
    const modal = document.getElementById('rmaMissionModal');
    if (!modal) return;
    const titleEl = document.getElementById('rmaMissionTitle');
    const subEl = document.getElementById('rmaMissionSubtitle');
    const progEl = document.getElementById('rmaMissionProgress');
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = subtitle;
    if (progEl) progEl.textContent = progressText;
    modal.classList.remove('hidden');
    if (rmaBannerTimer) clearTimeout(rmaBannerTimer);
    rmaBannerTimer = setTimeout(() => {
      modal.classList.add('hidden');
    }, 4500);
  }

  const camera = {
    x: 300,
    y: 120,
    zoom: 1,
    overviewMode: false,
    minimapHidden: false,
  };

  let nearbyPlayers = [];
  let selectedTargetId = null;
  let nearbyFacilityAction = null;
  let activeHealingSession = null; // { targetId, targetName, targetX, targetY, startTime, duration: 5000 }
  let nearbyInjuredColleague = null; // 當前靠近的重傷同仁 (距離 <= 75px)

  const vfxList = [];
  let selectedAvatarIndex = 1;


  function seasonError(error) {
    const text=String(error.message||error);
    if(text.includes('登入已失效')){isLoggedIn=false;season.client?.clear();document.getElementById('loginOverlay')?.classList.remove('hidden');}
    showCombatToast(escapeHtml(text),'error');
  }
  async function seasonSend(action,data={}) {
    try {return await season.client.send(action,{...data,...(!['heartbeat','world','snapshot'].includes(action)?{pose:{x:localPlayer.x,y:localPlayer.y,action:localPlayer.actionState}}:{})});} catch(e){seasonError(e);return null;}
  }
  function applySeasonSnapshot(snap) {
    gameClock?.sync(snap.now);window.GATHER_SEASON_PLAYERS=snap.players;
    const p=snap.player;if(!p)return;
    const previous=progression.exp, oldLevel=progression.level;
    progression.exp=p.exp;progression.loginCount=p.totalLogins||1;
    localPlayer.avatarId=p.avatarId;
    localPlayer.inventory=p.items.filter(i=>i.slot==null).map(i=>({...i,count:1}));
    localPlayer.equippedSlots=[0,1,2].map(slot=>p.items.find(i=>i.slot===slot)||null);
    localPlayer.activeEquipIndex=p.activeSlot||0;localPlayer.overflow=p.overflow||[];localPlayer.wornOutfitUid=p.worn||null;
    // 自動將物品儲存欄補上空裝備槽 (支援快捷槽 1~3 全部空位，排除玩家主動手動卸除之槽位)
    if (isLoggedIn && !season.autoEquipping) {
      const emptySlotIdx = [0, 1, 2].findIndex(idx => !localPlayer.equippedSlots[idx] && !season.manualEmptySlots?.has(idx));
      if (emptySlotIdx !== -1) {
        const nextW = localPlayer.inventory.find(i => i.category !== 'outfit');
        if (nextW) {
          season.autoEquipping = true;
          seasonSend('equip', { uid: nextW.uid, slot: emptySlotIdx }).finally(() => { season.autoEquipping = false; });
          showCombatToast(`🎒 裝備空缺，已自動將儲存欄【${nextW.emoji} ${nextW.name}】補上裝備欄 ${emptySlotIdx + 1}！`, 'info');
        }
      }
    }
    season.effects=p.effects||{};
    const now=snap.now,e=season.effects,wasInjured=localPlayer.isInjured;
    localPlayer.isInjured=e.injuredUntil>now;localPlayer.injuredUntil=e.injuredUntil||0;
    localPlayer.stunnedUntil=e.stunnedUntil||0;localPlayer.ghostSleepUntil=e.ghostUntil||0;
    localPlayer.isRestrained=e.lockedUntil>now;localPlayer.restrainedUntil=e.lockedUntil||0;
    if(localPlayer.isInjured||localPlayer.isRestrained){
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
        localPlayer.x=p.x;
        localPlayer.y=p.y;
        localPlayer.injuredX=p.x;
        localPlayer.injuredY=p.y;
      }
      localPlayer.knockback=null;
      localPlayer.autoWalkTarget=null;
    }
    if(localPlayer.isInjured)localPlayer.actionState='sleep_bed';
    else if(wasInjured){localPlayer.actionState=null;localPlayer.injuredX=null;localPlayer.injuredY=null;}
    if(p.beating?.until>now && localPlayer.beatingSession?.until!==p.beating.until){
      const npc=network?.npcPlayers.get(p.beating.npcId);
      if(npc){triggerBossOrAuntieBeating(npc,p.beating.role);localPlayer.beatingSession.until=p.beating.until;localPlayer.restrainedUntil=p.beating.until;window.MEETING_LOCK_STATE.lockedUntil=p.beating.until;}
    }
    localPlayer.huntHits=p.huntRound===Math.floor(now/(window.GATHER_CONFIG?.huntPeriod||1800000))?p.huntHits||0:0;
    if(p.lastDamage?.id!==season.lastDamage&&p.lastDamage){
      season.lastDamage=p.lastDamage.id;
      if(now-p.lastDamage.at<5000){
        localPlayer.emote={emoji:p.lastDamage.stun?'💫':'💥',expiresAt:gameNow()+1500};
        showCombatToast(p.lastDamage.absorbed?'乖乖護盾吸收攻擊！':p.lastDamage.injury==='critical'?'重傷退場，前往會議室 B':p.lastDamage.injury==='light'?'輕微挫傷：移速降低 30%':'受到攻擊');
        // 💥 遭受攻擊時，若正在進行互動（坐下寫 code、上廁所、修機台、祈福等），立即中斷互動並被打飛！
        if (!localPlayer.isInjured && !localPlayer.isRestrained) {
          cancelContextualAction();
          localPlayer.actionState = null;
          localPlayer.occupiedSpotId = null;
          localPlayer.autoWalkTarget = null;
          updatePoseLabelUI();

          let kx = (Math.random() - 0.5) * 2;
          let ky = (Math.random() - 0.5) * 2;
          if (p.lastDamage.fromX !== undefined && p.lastDamage.fromY !== undefined) {
            kx = localPlayer.x - p.lastDamage.fromX;
            ky = localPlayer.y - p.lastDamage.fromY;
          }
          const klen = Math.hypot(kx, ky) || 1;
          const kPower = 24;
          localPlayer.knockback = {
            vx: (kx / klen) * kPower,
            vy: (ky / klen) * kPower,
            ticksLeft: 24,
            totalTicks: 24
          };
          localPlayer.jumpOffset = 40;
          spawnConfetti(localPlayer.x, localPlayer.y - 15);
          if (network) {
            network.broadcastPacket('state_sync', { player: network.getPublicState() });
          }
        }
      }
    }
    if(previous!==p.exp&&isLoggedIn)showCombatToast(`${p.exp>previous?'+':''}${p.exp-previous} EXP`);
    recalcLevelAndBuff();if(oldLevel>progression.level&&isLoggedIn)showCombatToast(`等級下跌！Lv.${oldLevel} → Lv.${progression.level}`);
    syncPlayerActiveWeaponState();updateInjuryCountdownHUD();
    if (snap.task?.claimer === p.id) {
      const task = snap.task;
      const progress = task.repairedIds?.length || 0;
      if (lastRmaStage !== task.stage || lastRmaProgress !== progress) {
        lastRmaStage = task.stage;
        lastRmaProgress = progress;
        if (task.stage === 'repairing') {
          showRmaMissionBanner(
            '🚨 任務開始：緊急 RMA 救火搶修！',
            `客戶退貨產線告急！請迅速前往標示機台完成 3 台設備搶修！（目前目標：${task.name || '損壞機台'}）`,
            `搶修進度：${progress} / 3 台`
          );
        } else if (task.stage === 'reporting') {
          spawnConfetti(localPlayer.x, localPlayer.y - 30);
          showRmaMissionBanner(
            '🎉 3 台設備已全數修復完畢！',
            '太神啦！3 台設備已全數修復完畢，請立刻回到【救火指揮所】報到領取獎勵！',
            '任務完成：回報領獎中 (3/3 台)'
          );
        }
      }
    } else {
      if (lastRmaStage !== null) {
        lastRmaStage = null;
        lastRmaProgress = -1;
      }
    }
    ecosystem.groundItems=snap.drops.filter(d=>!d.claimed&&!season.hiddenDrops.has(d.uid)).map(d=>({...d,dropY:0,combatDrop:true,seasonDrop:true}));
    for(const [id,f]of Object.entries(snap.broken||{})){const target=id.startsWith('ws_')?window.WORLD_MAP.workstations[Number(id.slice(3))]:window.WORLD_MAP.labEquipments[Number(id.slice(4))];if(target){target.isBroken=f.broken;if(!f.broken){target.brokenBy=null;target.screenState='pass';}}}
    for(const [id,e]of Object.entries(snap.enemies||{}))if(e.mob&&e.hp>0&&!ecosystem.mobs.some(m=>(m.uid||m.id)===id)){const meta=window.GATHER_CONFIG.minecraftMobs?.find(m=>m.id===e.templateId)||window.GATHER_CONFIG.minecraftMobs?.[0]||{};ecosystem.mobs.push({...meta,id:e.templateId,uid:id,name:e.name,x:e.x,y:e.y,hp:e.hp,maxHp:e.maxHp,isBerserk:false,waypoints:[]});}
    network.combat={enemies:snap.enemies||{}};
    for(const [id,e]of Object.entries(snap.enemies||{})){
      const npc=network.npcPlayers.get(id)||(ecosystem.mobs||[]).find(m=>(m.uid||m.id)===id);if(!npc)continue;
      npc.hp=e.hp;npc.maxHp=e.maxHp;const down=e.hp<=0||e.until>now;if(down&&!npc.combatDown)npc.combatDownAt=Date.now();npc.combatDown=down;
      if(npc.combatDown){npc.actionState='sleep_bed';npc.isMoving=false;}else if(npc.actionState==='sleep_bed')npc.actionState=null;
      if(e.reaction&&now-e.reaction.at<5000&&window.OfficeCombat.receiveReaction(npc,e.reaction)){
        // Apply authoritative displacement immediately; the render offset supplies the impact motion.
        npc.x=e.x;npc.y=e.y;
        showCombatToast(`${escapeHtml(e.name||id)} ${e.reaction.kind==='dodge'?'閃避':e.reaction.kind==='defeat'?'被擊倒':'受到擊退'}`);
      }
    }
    ecosystem.mobs=ecosystem.mobs.filter(m=>snap.enemies?.[m.uid||m.id]&&window.OfficeCombat.defeatVisible(m));
    for(const q of snap.players){if(q.id===p.id)continue;if(!network.remotePlayers.has(q.clientId))network.upsertRemotePlayer({id:q.clientId,name:q.name,unit:q.unit,x:q.x,y:q.y,avatarId:q.avatarId,status:'active'},true);const remote=network.remotePlayers.get(q.clientId);if(remote){remote.seasonPlayerId=q.id;remote.isInjured=q.effects.injuredUntil>now;remote.lightInjuredUntil=q.effects.lightUntil||0;remote.outfitAvatarId=q.worn;}}
    // 檢測是否扭蛋獲得新服裝 (包包未滿時直接進入 p.items)
    if (p.items) {
      const currentOutfits = p.items.filter(i => i.category === 'outfit');
      if (season.lastOutfitUids) {
        for (const out of currentOutfits) {
          if (!season.lastOutfitUids.has(out.uid)) {
            showGachaSurpriseModal(out, false);
            break;
          }
        }
      }
      season.lastOutfitUids = new Set(currentOutfits.map(i => i.uid));
    }

    if(p.pending&&!season.pendingChoice){
      season.pendingChoice=true;
      showGachaSurpriseModal(p.pending.outfit, true, async () => {
        const chosen = await window.OfficeFacilities.choose('抽到 ' + p.pending.outfit.name + '，選一套服裝替換；取消保留材料', p.items.filter(i => i.category === 'outfit'));
        await seasonSend(chosen ? 'gacha_confirm' : 'gacha_cancel', chosen ? { replace: chosen[0] } : {});
        season.pendingChoice = false;
      });
    }
  }
  async function seasonLogin(params) {
    if(!season.client)season.client=new window.GatherProfileClient(window.GATHER_CONFIG.supabaseUrl+'/functions/v1/gather-season2',{storage:localStorage,onSnapshot:applySeasonSnapshot});
    await season.client.recover();
    let result;
    if(params.isAutoReload&&season.client.token){result=await season.client.send('resume',{connection:network.clientId});}
    else {
      const pin=(document.getElementById('loginPasscode')?.value||"").trim();
      const legacy=[];
      result=await season.client.send('login',{name:params.name,unit:params.unit,pin,avatarId:params.avatarId,connection:network.clientId,legacy});
    }
    return result;
  }
  async function seasonPoll() {
    if(!season.enabled||!isLoggedIn||season.polling||season.client?.busy||gameNow()-season.lastPoll<2000)return;
    season.polling=true;season.lastPoll=gameNow();
    try {
      if(season.client.pending)await season.client.retry();
      await season.client.send('heartbeat',{x:localPlayer.x,y:localPlayer.y,action:localPlayer.actionState,...(network.isRoomMaster()?{world:{enemies:[...network.npcPlayers.values(),...(ecosystem.mobs||[])].map(e=>({id:e.uid||e.id,templateId:e.id,name:e.name,x:e.x,y:e.y,attacking:!!(e.isBerserk||e.isAggressive||e.isGhost)})),broken:[...window.WORLD_MAP.workstations.map((e,i)=>e.isBroken?'ws_'+i:null),...window.WORLD_MAP.labEquipments.map((e,i)=>e.isBroken?'lab_'+i:null)].filter(Boolean)}}:{})});
      season.failures=0;
      const channel=season.client.snapshot?.player?.channel;
      if(channel){
        const chDist = Math.hypot(localPlayer.x - channel.x, localPlayer.y - channel.y);
        if(chDist > 30 || (localPlayer.isMoving && !['sit_code', 'pray_kuaikuai', 'play_arcade'].includes(localPlayer.actionState))){
          season.client.snapshot.player.channel = null;
          seasonSend("cancel").catch(() => {});
          if(['sit_code', 'pray_kuaikuai', 'play_arcade'].includes(localPlayer.actionState)){
            localPlayer.actionState = null;
          }
        } else if(gameNow() - channel.at >= (channel.kind==='lounge'?5000:channel.kind==='heal'?channel.duration:3000)){
          await season.client.send(channel.kind==='rma'?'rma_finish':channel.kind==='heal'?'heal_finish':channel.kind==='device'?'device_finish':'facility_finish');
          localPlayer.actionState = null;
        }
      }
    } catch(e){season.failures=(season.failures||0)+1;if(String(e.message).includes('登入已失效'))seasonError(e);else if(!document.hidden&&season.failures>=3){const badge=document.getElementById('netModeBadge');if(badge){badge.textContent='雲端連線中斷・正在重試';badge.classList.add('disconnected');}}}
    finally{season.polling=false;}
  }
  function nearbySeasonDrop() {
    return ecosystem.groundItems.filter(d=>d.seasonDrop&&!d.claimed&&!(d.pickupAfter>gameNow()))
      .map(d=>({d,dist:Math.hypot(d.x-localPlayer.x,d.y-localPlayer.y)}))
      .filter(({d,dist})=>{
        const pickupRad = window.OfficeProgression?.pickupRadius ? window.OfficeProgression.pickupRadius(progression.level) : 80;
        if(dist > pickupRad + 20) return false;
        const steps=Math.max(1,Math.ceil(dist/12));
        for(let i=0;i<=steps;i++)if(window.isPositionBlocked(localPlayer.x+(d.x-localPlayer.x)*i/steps,localPlayer.y+(d.y-localPlayer.y)*i/steps,4))return false;
        return true;
      }).sort((a,b)=>a.dist-b.dist)[0]?.d||null;
  }
  async function seasonInteract() {
    if(!season.client?.snapshot)return;
    const snap=season.client.snapshot,p=snap.player;
    if(p.effects.injuredUntil>snap.now||p.effects.lockedUntil>snap.now)return;
    const q=snap.players.find(q=>q.id!==p.id&&(q.effects.injuredUntil>snap.now||q.effects.lightUntil>snap.now)&&Math.hypot(q.x-localPlayer.x,q.y-localPlayer.y)<75);
    if(q){await seasonSend('heal_start',{target:q.id});localPlayer.actionState='sit_code';return true;}
    const d=nearbySeasonDrop();
    if(d){
      season.hiddenDrops.add(d.uid);ecosystem.groundItems=ecosystem.groundItems.filter(i=>i.uid!==d.uid);
      vfxList.push({type:'click_ring',x:d.x,y:d.y,radius:4,maxRadius:40,alpha:1,color:'#34d399'});
      try{const result=await seasonSend('pickup',{uid:d.uid});if(result)showCombatToast(`拾起 ${d.emoji||'🎁'} ${escapeHtml(d.name)}`);
        else if(!ecosystem.groundItems.some(i=>i.uid===d.uid)&&season.client.snapshot.drops.some(i=>i.uid===d.uid&&!i.claimed))ecosystem.groundItems.push(d);
      }finally{season.hiddenDrops.delete(d.uid);}return true;
    }
    if(snap.task?.claimer===p.id&&Math.hypot(localPlayer.x-snap.task.x,localPlayer.y-snap.task.y)<95){
      if(snap.task.stage==='reporting'){
        await seasonSend('rma_report');
        spawnConfetti(localPlayer.x, localPlayer.y - 20);
        showCombatToast('🎖️ 救火任務完成！領取大量經驗 +150 EXP 與隨機道具獎勵！', 'join');
        pushStatusLog('系統', '🎖️ 完成緊急 RMA 救火任務，獲得 150 EXP 及隨機裝備物資！');
        return true;
      }
      await seasonSend('rma_start');
      localPlayer.actionState='sit_code';
      return true;
    }
    const fault=Object.entries(snap.broken||{}).find(([id,f])=>{
      const target=id.startsWith('ws_')?window.WORLD_MAP.workstations[Number(id.slice(3))]:window.WORLD_MAP.labEquipments[Number(id.slice(4))];
      if(!f.broken||!target)return false;
      const cx=Math.max(target.x,Math.min(localPlayer.x,target.x+target.w));
      const cy=Math.max(target.y,Math.min(localPlayer.y,target.y+target.h));
      return Math.hypot(localPlayer.x-cx,localPlayer.y-cy)<=95||Math.hypot(localPlayer.x-target.x-target.w/2,localPlayer.y-target.y-target.h-18)<125;
    });
    if(fault){await seasonSend('device_start',{target:fault[0]});localPlayer.actionState='sit_code';return true;}
    const f=window.OfficeFacilities?.nearby?.(localPlayer,snap);
    if(f){await window.OfficeFacilities.use(f,season.client,()=>({x:localPlayer.x,y:localPlayer.y,action:localPlayer.actionState})).catch(seasonError);if(season.client.snapshot.player.channel)localPlayer.actionState=f.id==='shrine'?'pray_kuaikuai':f.id==='lounge'?'play_arcade':'sit_code';return true;}
    return false;
  }

  function init() {
    document.documentElement.classList.toggle("embedded-office", window.parent !== window);
    canvas = document.getElementById('officeCanvas');
    ctx = canvas.getContext('2d');

    // 檢查持久化記憶：包含身上裝備、持有道具、耐久度、受傷休養計時與鳥人流放狀態
    try {
      const raw = localStorage.getItem(PERSISTENCE_KEY);
      if (raw) {
        const persisted = JSON.parse(raw);
        let changed = false;
        if (persisted.birdCommanderExiled) {
          delete persisted.birdCommanderExiled;
          changed = true;
        }
        if (persisted.birdCommanderRestUntil && gameNow() >= persisted.birdCommanderRestUntil) {
          delete persisted.birdCommanderRestUntil;
          changed = true;
        }
        if (changed) {
          localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(persisted));
        }
      }
    } catch (_) {}

    const saved = loadPersistentState();
    if (
      saved &&
      Array.isArray(saved.equippedSlots) &&
      (saved.equippedSlots.some(Boolean) || saved.backpack || saved.overflow)
    ) {
      localPlayer.equippedSlots = saved.equippedSlots;
      localPlayer.inventory = saved.backpack || [];
      localPlayer.overflow = saved.overflow || [];
      localPlayer.wornOutfitUid = saved.wornOutfitUid || null;
      window.OfficeWardrobe.migrate(localPlayer);
      localPlayer.activeEquipIndex =
        typeof saved.activeEquipIndex === 'number' ? saved.activeEquipIndex : 0;
      localPlayer.heldItem = saved.heldItem || '🪑';
      if (saved.birdCommanderExiled) {
        // 清除先前 10% 永久流放的舊存檔，讓鳥人指揮官重返辦公室
        saved.birdCommanderExiled = false;
        savePersistentState();
      }
      if (saved.birdCommanderRestUntil && gameNow() < saved.birdCommanderRestUntil) {
        localPlayer.birdCommanderRestUntil = saved.birdCommanderRestUntil;
      } else {
        localPlayer.birdCommanderRestUntil = 0;
      }
      if (saved.isInjured && saved.injuredUntil > gameNow()) {
        localPlayer.isInjured = true;
        localPlayer.injuredUntil = saved.injuredUntil;
        localPlayer.x = 400; // 會議室 A
        localPlayer.y = 1350;
        localPlayer.actionState = 'sleep_bed';
      }
      syncPlayerActiveWeaponState();
      if (window.gatherSupabase) {
        window.gatherSupabase.syncDurability(localPlayer.equippedSlots);
      }
    } else {
      // 首次登入無存檔：預設不持有任何道具，保持完全徒手狀態
      localPlayer.equippedSlots = [null, null, null];
      localPlayer.inventory = [];
      localPlayer.heldItem = '';
      localPlayer.activeEquipIndex = 0;
      syncPlayerActiveWeaponState();
      savePersistentState();
    }

    ecosystem = new window.OfficeEcosystem({
      onMobBerserk: (mob, target) => {
        pushStatusLog('系統', `👾 怪物【${mob.name}】暴走，衝向 ${target.name}！按 [F] 揮裝備擊退！`);
      },
      onEquipmentBroken: (mob, target) => {
        pushStatusLog('系統', `💥 【${target.name}】遭怪物【${mob.name}】破壞！靠近按 [E] 修復獲得經驗！`);
      },
      onMobHitPlayer: (mob, pl) => {
        if (season.enabled) return;
        triggerBerserkKnockback(mob, `遭遇怪物【${mob.name}】衝撞！`);
      },
    });

    network = new window.EphemeralOfficeNetwork({
      onPlayerJoin: (player) => {
        pushStatusLog('系統', `🟢 ${player.name} (${player.unit}) 已上線進入辦公室！`);
        // 登入歡迎動畫只顯示給「已經在線上」，看到新使用者登入時的提示
        if (loginTimestamp && gameNow() - loginTimestamp > 3000) {
          showWelcome(player);
        }
        renderSidebarRoster();
      },
      onPlayerLeave: (player) => {
        pushStatusLog('系統', `👋 ${player.name} 已離線離開辦公室`);
        showToast(`👋 <b>${escapeHtml(player.name)}</b> 已離開辦公室`, 'leave');
        renderSidebarRoster();
      },
      onRemoteMurmur: (pkt) => {
        // MURMUR 依需求僅在頭頂氣泡卡片呈現，不寫入左下角聊天記錄
        renderUnifiedChatAndStatus();
      },
      onRecoveryLocation: (spot) => {
        if(!localPlayer.isInjured || !spot || !Number.isFinite(spot.x) || !Number.isFinite(spot.y)) return;
        const changed=localPlayer.injuredX!==spot.x||localPlayer.injuredY!==spot.y;
        localPlayer.x=localPlayer.injuredX=spot.x;localPlayer.y=localPlayer.injuredY=spot.y;
        localPlayer.actionState='sleep_bed';localPlayer.autoWalkTarget=null;localPlayer.knockback=null;
        if(changed){savePersistentState();network.broadcastPacket('state_sync',{player:network.getPublicState()});}
      },
      onCombatMobDefeat: (uid) => {if(network.isRoomMaster()){ecosystem.mobs=ecosystem.mobs.filter(m=>m.uid!==uid);ecosystem.lastMobDefeatedAt=gameNow();}},
      onCombatResult: (text) => {if(season.enabled)return; showCombatToast(text); addExp(30,'擊倒目標'); },
      onCombatGround: (items) => {if(season.enabled)return;
        ecosystem.groundItems = [...ecosystem.groundItems.filter(i=>!i.combatDrop), ...items];
      },
      onCombatPickup: (item) => {if(season.enabled)return; addItemToInventory(item,true);savePersistentState();updateSelfHudCard();showCombatToast(`撿起【${escapeHtml(item.name)}】`); },
      onCombatDamage: (effect) => {if(season.enabled)return;
        if(effect.outfitDamage){
          const outfit=window.OfficeWardrobe.damage(localPlayer);
          if(outfit){syncPlayerActiveWeaponState();showCombatToast(outfit.durability ? `${outfit.name} 耐久 -1（${outfit.durability}/5）` : `${outfit.name} 已損毀，恢復日常穿著`);}
        }
        if(effect.stun && gameNow()>=(localPlayer.stunImmuneUntil||0) && !localPlayer.isInjured){
          cancelContextualAction();localPlayer.stunnedUntil=effect.until;localPlayer.stunImmuneUntil=effect.until+2000;localPlayer.autoWalkTarget=null;localPlayer.knockback=null;
          localPlayer.emote={emoji:'💫',expiresAt:effect.until};showCombatToast('💫 被擊暈 2 秒！');
        }
        if(effect.drop){
          const idx=localPlayer.activeEquipIndex;let item=localPlayer.equippedSlots[idx];
          if(item)localPlayer.equippedSlots[idx]=null;
          else if(localPlayer.inventory.length){const i=Math.floor(Math.random()*localPlayer.inventory.length);item={...localPlayer.inventory[i]};if((item.count||1)>1)localPlayer.inventory[i].count--;else localPlayer.inventory.splice(i,1);}
          if(item){delete item.count;savePersistentState();syncPlayerActiveWeaponState();updateSelfHudCard();window.OfficeCombat.send(network,'combat_drop',{effectId:effect.id,item});showCombatToast(`掉落【${escapeHtml(item.name)}】，可以撿回！`);}
        }
      },
      onHuntEscape: () => {
        if (localPlayer.isInjured && gameNow() < (localPlayer.injuredUntil || 0)) {
          showToast('🚑 身受重傷休養中，無法前往安全區！', 'error');
          return;
        }
        cancelContextualAction(); localPlayer.x=2350; localPlayer.y=350;
        localPlayer.autoWalkTarget=null; localPlayer.knockback=null;
        network.broadcastPacket('state_sync',{player:network.getPublicState()});
      },
      onHuntHit: (count) => {if(season.enabled)return;
        window.OfficeCombat?.send(network,'combat_hurt',{targetId:network.clientId});
        localPlayer.emote={emoji:'💥',expiresAt:gameNow()+2000};
        if(count>=3) handleIncomingWeaponAttack({targetId:network.clientId,isCriticalInjury:true,hunt:true});
      },
      onGhostScare: (until, isAttack) => {
        window.OfficeCombat?.send(network,'combat_hurt',{targetId:network.clientId});
        if (isAttack) {
          const nowInj = gameNow();
          if (nowInj >= (localPlayer.lightInjuredUntil || 0) && !localPlayer.isInjured) {
            localPlayer.lightInjuredUntil = nowInj + 60000;
            showCombatToast('🩹 遭幽靈突襲撕裂造成輕微挫傷：移速降低 30% (持續 60 秒)', 'error');
            pushCombatLog('夜遊幽靈', '👻 怨念利爪突襲！造成輕微挫傷');
          }
          const ghost = network?.npcPlayers?.get('npc_night_ghost');
          let dx = localPlayer.x - (ghost ? ghost.x : localPlayer.x - 20);
          let dy = localPlayer.y - (ghost ? ghost.y : localPlayer.y);
          if (Math.hypot(dx, dy) < 1) { dx = 1; dy = 0; }
          const ang = Math.atan2(dy, dx);
          localPlayer.knockback = { vx: Math.cos(ang) * 16, vy: Math.sin(ang) * 16, ticksLeft: 20 };
        }
        if (!isLoggedIn || gameNow() < (localPlayer.ghostSleepUntil || 0)) return;
        cancelContextualAction();
        localPlayer.autoWalkTarget = null;
        if (!isAttack) localPlayer.knockback = null;
        localPlayer.ghostSleepUntil = until;
        localPlayer.actionState = 'scared_faint';
        localPlayer.isMoving = false;
        localPlayer.emote = { emoji: isAttack ? '💥' : '💫', expiresAt: gameNow() + 3000 };
        showCombatToast(isAttack ? '👻 遭幽靈怨念突襲撕裂！受到攻擊並嚇暈……' : '👻 遭夜遊幽靈驚嚇！嚇暈斷線 5 秒……', 'error');
        pushStatusLog('夜遊幽靈', isAttack ? '怨念利爪突襲！嚇暈斷線 5 秒……' : '嚇到斷線！原地打瞌睡 5 秒……');
      },
      onProximityChat: (msg) => {
        const suffix = msg.isNearby ? ' (身邊)' : '';
        pushUserChat(msg.senderName + suffix, msg.senderUnit, msg.text, false);
        triggerChatNotifyFlash(msg.senderName);
        if (document.hidden) {
          triggerDesktopNotification(msg.senderName, msg.senderUnit, msg.text);
        }
      },
      onPrivateChat: (msg) => {
        pushUserChat(msg.senderName, msg.senderUnit, msg.text, false, true, localPlayer.name);
        triggerChatNotifyFlash(msg.senderName, true);
        if (isChatPanelCollapsed()) {
          // 聊天室窗使用者縮合中：在畫面正中央顯示醒目的大方塊卡片
          showCenterPrivateChatBox(msg);
        } else {
          // 聊天室窗已展開：使用者正在看聊天窗，維持頂部輕量通知避免遮擋視線
          showToast(`🔒 收到來自 <b>${escapeHtml(msg.senderName)}</b> 的私人對談！`, 'join');
        }
        if (document.hidden) {
          triggerDesktopNotification(msg.senderName, msg.senderUnit, `[私人對談] ${msg.text}`);
        }
      },
      onGuardHitMob: (guard, mob) => {
        spawnConfetti(mob.x, mob.y - 16);
        pushStatusLog(guard.name, `🏏 警棍命中【${mob.name}】！成功消滅方塊怪！`);
        showToast(`🏏 夜間警衛擊退了【${mob.name}】！`, 'security');
      },
      onRemoteHealStart: (pkt) => {if(season.enabled)return;
        if (localPlayer.id === pkt.targetId) {
          localPlayer.beingHealed = true;
          localPlayer.beingHealedBy = pkt.healerName;
          showToast(`🩹 同仁【${pkt.healerName}】正在為你進行 5 秒緊急醫療包紮！請耐心等待！`, 'join');
        }
        pushStatusLog('系統', `🩹 【${pkt.healerName}】正在對【${pkt.targetName || '重傷同仁'}】展開 5 秒急救醫療！`);
      },
      onRemoteHealProgress: (pkt) => {if(season.enabled)return;
        if (localPlayer.id === pkt.targetId) {
          localPlayer.beingHealed = true;
          localPlayer.healProgress = pkt.progress;
        }
      },
      onRemoteHealCancel: (pkt) => {if(season.enabled)return;
        if (localPlayer.id === pkt.targetId) {
          localPlayer.beingHealed = false;
          localPlayer.healProgress = 0;
          showToast('⚠️ 急救醫療中斷！', 'error');
        }
      },
      onRemoteHealComplete: (pkt) => {if(season.enabled)return;
        if (localPlayer.id === pkt.targetId) {
          localPlayer.isInjured = false;
          localPlayer.injuredUntil = 0;
          localPlayer.beingHealed = false;
          localPlayer.healProgress = 0;
          localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
          savePersistentState();
          updatePoseLabelUI();
          updateInjuryCountdownHUD();
          spawnConfetti(localPlayer.x, localPlayer.y - 20);
          showToast(`💖 感謝同仁【${pkt.healerName}】完成 5 秒醫療！傷勢已全面康復！`, 'join');
        }
        pushStatusLog('系統', `💖 【${pkt.healerName}】完成 5 秒急救，成功治癒【${pkt.targetName || '同仁'}】！`);
      },
      getMobs: () => (typeof ecosystem !== 'undefined' && ecosystem && ecosystem.mobs ? ecosystem.mobs : []),
      getWorldSyncState: () => {
        return {
          groundItems: (typeof ecosystem !== 'undefined' && ecosystem && ecosystem.groundItems)
            ? ecosystem.groundItems.filter(item=>!item.combatDrop).map((item) => {
                const confItem = (window.GATHER_CONFIG?.items || []).find((it) => it.id === item.id)
                  || (window.GATHER_CONFIG?.weapons || []).find((w) => w.id === item.id) || {};
                return {
                  uid: item.uid || ('drop_' + item.id),
                  id: item.id,
                  name: item.name || confItem.name || '道具',
                  emoji: item.emoji || item.icon || confItem.emoji || '🎁',
                  icon: item.icon || item.emoji || confItem.emoji || '🎁',
                  category: item.category || confItem.category || 'item',
                  power: item.power ?? confItem.power,
                  x: item.x,
                  y: item.y,
                  dropY: item.dropY || 0,
                  type: item.type,
                  exp: item.exp,
                  score: item.score,
                };
              })
            : [],
          mobs: (typeof ecosystem !== 'undefined' && ecosystem && ecosystem.mobs)
            ? ecosystem.mobs.map((m) => ({
                id: m.id,
                uid: m.uid,
                type: m.type,
                name: m.name,
                x: m.x,
                y: m.y,
                hp: m.hp,
                maxHp: m.maxHp,
                isBerserk: !!m.isBerserk,
                targetDeskIdx: m.targetDeskIdx,
              }))
            : [],
          workstations: (window.WORLD_MAP?.workstations || []).map((ws, idx) => ({
            idx,
            isBroken: !!ws.isBroken,
            brokenBy: ws.brokenBy || null,
            leftScreen: ws.leftScreen || 'Pass',
            rightScreen: ws.rightScreen || 'Good',
          })),
          labEquipments: (window.WORLD_MAP?.labEquipments || []).map((eq, idx) => ({
            idx,
            isBroken: !!eq.isBroken,
            brokenBy: eq.brokenBy || null,
            status: eq.status,
            statusColor: eq.statusColor,
            screenState: eq.screenState,
          })),
        };
      },
      onWorldSync: (pkt) => {
        if (network && network.isRoomMaster()) return;

        // 同步掉落物 (防禦性補全 emoji 與屬性，杜絕 undefined 道具標籤)
        if (!season.enabled && Array.isArray(pkt.groundItems) && typeof ecosystem !== 'undefined' && ecosystem) {
          ecosystem.groundItems = pkt.groundItems.map((gi) => {
            const confItem = (window.GATHER_CONFIG?.items || []).find((it) => it.id === gi.id)
              || (window.GATHER_CONFIG?.weapons || []).find((w) => w.id === gi.id) || {};
            return {
              uid: gi.uid || ('drop_' + gi.id),
              id: gi.id,
              name: gi.name || confItem.name || '道具',
              emoji: gi.emoji || gi.icon || confItem.emoji || '🎁',
              icon: gi.icon || gi.emoji || confItem.emoji || '🎁',
              category: gi.category || confItem.category || 'item',
              power: gi.power ?? confItem.power,
              x: gi.x,
              y: gi.y,
              dropY: gi.dropY || 0,
              type: gi.type,
              exp: gi.exp,
              score: gi.score,
            };
          });
        }

        // 同步方塊怪
        if (Array.isArray(pkt.mobs) && typeof ecosystem !== 'undefined' && ecosystem) {
          const localMobMap = new Map((ecosystem.mobs || []).map((m) => [m.uid||m.id, m]));
          ecosystem.mobs = pkt.mobs
            .filter((rm) => rm.hp > 0 && (!season.enabled || season.client?.snapshot?.enemies?.[rm.uid||rm.id]?.hp>0))
            .map((rm) => {
              const localMob = localMobMap.get(rm.uid||rm.id);
              if (!localMob) return { ...rm };
              localMob.hp = rm.hp;
              localMob.isBerserk = rm.isBerserk;
              if (Math.hypot(localMob.x - rm.x, localMob.y - rm.y) > 40) {
                localMob.x = rm.x;
                localMob.y = rm.y;
              } else {
                localMob.x += (rm.x - localMob.x) * 0.35;
                localMob.y += (rm.y - localMob.y) * 0.35;
              }
              return localMob;
            });
        }

        // 同步工作站螢幕與損壞狀態
        if (Array.isArray(pkt.workstations) && window.WORLD_MAP?.workstations) {
          pkt.workstations.forEach((wsState) => {
            const ws = window.WORLD_MAP.workstations[wsState.idx];
            if (ws) {
              ws.isBroken = wsState.isBroken;
              ws.brokenBy = wsState.brokenBy;
              ws.leftScreen = wsState.leftScreen;
              ws.rightScreen = wsState.rightScreen;
            }
          });
        }

        // 同步 Lab 機台損壞與狀態
        if (Array.isArray(pkt.labEquipments) && window.WORLD_MAP?.labEquipments) {
          pkt.labEquipments.forEach((eqState) => {
            const eq = window.WORLD_MAP.labEquipments[eqState.idx];
            if (eq) {
              eq.isBroken = eqState.isBroken;
              eq.brokenBy = eqState.brokenBy;
              if (eqState.status) eq.status = eqState.status;
              if (eqState.statusColor) eq.statusColor = eqState.statusColor;
              if (eqState.screenState) eq.screenState = eqState.screenState;
            }
          });
        }
      },
      onRemoteDeviceRepair: (pkt) => {
        if (pkt.type === 'ws' && window.WORLD_MAP?.workstations?.[pkt.idx]) {
          const ws = window.WORLD_MAP.workstations[pkt.idx];
          ws.isBroken = false;
          ws.brokenBy = null;
          ws.leftScreen = 'Pass';
          ws.rightScreen = 'Good';
          ws.screenState = 'pass';
        } else if (pkt.type === 'lab' && window.WORLD_MAP?.labEquipments?.[pkt.idx]) {
          const eq = window.WORLD_MAP.labEquipments[pkt.idx];
          eq.isBroken = false;
          eq.brokenBy = null;
          eq.status = 'PASS 99.9%';
          eq.statusColor = '#22c55e';
        }
      },
      onRemoteItemCollected: (pkt) => {
        if (typeof ecosystem !== 'undefined' && ecosystem?.groundItems) {
          ecosystem.groundItems = ecosystem.groundItems.filter(
            (item) => (item.uid || item.id) !== pkt.itemId && item.id !== pkt.itemId
          );
        }
      },
      onRemoteSkill: (pkt) => {
        handleIncomingSkillEffect(pkt);
      },
      onRemoteWeaponAttack: (pkt) => {
        handleIncomingWeaponAttack(pkt);
      },
      onRemoteToiletKick: (pkt) => {
        // 遠端同事踹門廣播
        for (const s of window.WORLD_MAP.toiletStalls) {
          if (s.occupiedBy) {
            s.kickShakeTicks = 28;
            break;
          }
        }
        pushStatusLog(pkt.senderName || '同事', `🦵 在廁所門外猛踹門大喊：「${pkt.text || '不要再屎遁'}」！`);
      },
      onRemoteToiletState: (pkt) => {
        if (pkt && pkt.stallId && window.WORLD_MAP?.toiletStalls) {
          const stall = window.WORLD_MAP.toiletStalls.find((st) => st.id === pkt.stallId);
          if (stall) {
            stall.occupiedBy = pkt.occupiedBy || null;
            if (pkt.doorOpen !== undefined) {
              stall.doorOpen = pkt.doorOpen;
            } else if (pkt.occupiedBy) {
              stall.doorOpen = 0;
            }
          }
        }
      },
      onRemoteStatusLog: (pkt) => {
        if (pkt && pkt.senderName && pkt.text) {
          pushStatusLog(pkt.senderName, pkt.text);
        }
      },
      onNpcToiletKick: (npc, kickText) => {
        for (const s of window.WORLD_MAP.toiletStalls) {
          if (s.occupiedBy) {
            s.kickShakeTicks = 28;
            break;
          }
        }
        pushStatusLog(npc.name, `🦵 在廁所門外猛踹門：「${kickText}」！`);
      },
      onBerserkStart: (npc, cry) => {
        pushStatusLog('系統', `🚨 警告！${npc.name} 暴走衝來！按 [F] 揮武器擊退！`);
      },
      onBerserkHit: (npc, reason) => {
        triggerBerserkKnockback(npc, reason);
      },
      onBirdFollowStart: (npc, target) => {
        const isSelf = !target || target.id === localPlayer.id;
        const targetName = isSelf ? '你' : (target.name || '同仁');
        pushStatusLog('系統', `🦩 【${npc.name}】開始隨機跟隨【${targetName}】並碎念（按 [F] 揮擊 20% 機率得道具經驗）`);
      },
      onMeetingPull: (npc, roomId, targetX, targetY, target) => {if(season.enabled)return;
        const isSelf = !target || target.id === localPlayer.id;
        const targetName = isSelf ? '你' : (target.name || '同仁');
        if (isSelf) {
          const lockMs = window.GATHER_CONFIG?.security?.meetingLockMs || 10000;
          window.MEETING_LOCK_STATE = {
            lockedUntil: gameNow() + lockMs,
            roomId,
            reason: '鳥人指揮官閉門討論 10 秒',
            notifiedRelease: false,
          };
          localPlayer.autoWalkTarget = null;
          localPlayer.knockback = null;
          localPlayer.x = targetX;
          localPlayer.y = targetY;
          localPlayer.actionState = roomId === 'meet_a' ? 'watch_stock' : 'pray_kuaikuai';
          spawnConfetti(localPlayer.x, localPlayer.y - 20);
        }
        pushStatusLog(
          '系統',
          `🦩 【${npc.name}】將【${targetName}】拉進【${roomId === 'meet_a' ? '會議室 A' : '會議室 B'}】關門10秒${isSelf ? '（按[F]可擊退脫困）' : ''}！`
        );
      },
      onConnectionChange: (connected, label) => {
        const badge = document.getElementById('netModeBadge');
        const watermark = document.getElementById('netStatusWatermark');
        if (badge) {
          if (connected) {
            badge.textContent = `⚡ ${label || '多人連線正常'}`;
            badge.title = '顯示玩家位置與聊天的連線狀態，不代表資料庫存檔結果。';
            badge.classList.remove('disconnected');
            if (watermark) watermark.classList.remove('disconnected');
          } else {
            badge.textContent = '⚠️ 瞬時連線已中斷 (離線重連中)';
            badge.title = '連線中斷，正在嘗試重新建立連線';
            badge.classList.add('disconnected');
            if (watermark) watermark.classList.add('disconnected');
          }
        }
      },
    });

    setupLoginUI();
    setupContextualActionButtons();
    setupCollapsiblePanels();
    setupMinecraftInventoryEvents();
    setupGameControls();
    setupTouchControls();
    setupUnifiedChatUI();

    // TWSE 盤後指數輪詢（維持會議室 A 大螢幕資料更新，每 5 分鐘輪詢一次）
    updateMarket();
    if (marketPollTimer) clearInterval(marketPollTimer);
    marketPollTimer = setInterval(() => {
      if (!document.hidden) updateMarket();
    }, 300000);

    handleResize();
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('beforeunload', () => {
      savePersistentState();
      if (window.gatherSupabase) window.gatherSupabase.logoutUser();
    });
    window.addEventListener('pagehide', () => {
      savePersistentState();
      if (window.gatherSupabase) window.gatherSupabase.logoutUser();
    });

    requestAnimationFrame(gameLoop);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getFormatTime() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // =========================================================================
  // 0. 裝備與持有物品欄系統 (最多同時裝備 3 個、擊退 3 次損毀消失、無裝備不可擊退、依道具給予不同經驗加成與擊退經驗)
  // =========================================================================
  function findItemMetaByEmoji(emoji) {
    return (
      window.GATHER_CONFIG.items.find((i) => i.emoji === emoji) || {
        id: 'custom_' + emoji,
        emoji: emoji || '🪑',
        name: '神秘辦公室道具',
        category: 'weapon',
        power: 24,
        expBonusPct: 10,
        knockbackExp: 25,
        maxDurability: 3,
      }
    );
  }

  function createItemInstance(metaOrEmoji) {
    const base =
      typeof metaOrEmoji === 'string' ? findItemMetaByEmoji(metaOrEmoji) : metaOrEmoji;
    const full =
      window.GATHER_CONFIG.items.find((i) => i.id === base?.id || i.emoji === base?.emoji) ||
      base ||
      findItemMetaByEmoji('🪑');
    const resolved = { ...full, ...(typeof base === 'object' ? base : {}) };
    const maxDur = resolved.maxDurability || window.GATHER_CONFIG?.security?.weaponMaxDurability || 3;
    return {
      uid: 'inst_' + gameNow() + '_' + Math.random().toString(36).slice(2, 6),
      id: resolved.id || 'item_' + gameNow(),
      emoji: resolved.emoji || '🪑',
      name: resolved.name || '道具',
      category: resolved.category || 'weapon',
      avatarId: resolved.avatarId || null,
      power: resolved.power ?? 24,
      expBonusPct: resolved.expBonusPct ?? 10,
      knockbackExp: resolved.knockbackExp ?? 25,
      hitsToRepel: resolved.hitsToRepel || 3,
      durability: typeof base?.durability === 'number' ? base.durability : maxDur,
      maxDurability: maxDur,
    };
  }

  function getActiveEquippedItem() {
    const cur = localPlayer.equippedSlots[localPlayer.activeEquipIndex];
    if (cur) return cur;
    const firstIdx = localPlayer.equippedSlots.findIndex((s) => s !== null);
    if (firstIdx >= 0) {
      localPlayer.activeEquipIndex = firstIdx;
      return localPlayer.equippedSlots[firstIdx];
    }
    return null;
  }

  function getEquippedCount() {
    return localPlayer.equippedSlots.filter((s) => s !== null).length;
  }

  function getTotalEquippedExpBonusPct() {
    return localPlayer.equippedSlots.reduce(
      (sum, slot) => sum + (slot ? slot.expBonusPct || 0 : 0),
      0
    );
  }

  function syncPlayerActiveWeaponState() {
    const outfit = window.OfficeWardrobe.worn(localPlayer);
    localPlayer.outfitAvatarId = outfit?.avatarId || null;
    localPlayer.outfitUid = outfit?.uid || null;
    const active = getActiveEquippedItem();
    if (active) {
      localPlayer.heldItem = active.emoji;
      localPlayer.equippedMeta = active;
    } else {
      localPlayer.heldItem = '';
      localPlayer.equippedMeta = null;
    }
    updateSelfHudCard();
    renderMinecraftInventoryUI();
    savePersistentState();
    if (isLoggedIn && network) {
      network.broadcastPacket('state_sync', { player: network.getPublicState() });
    }
  }

  /**
   * 將獲得的道具/武器加入玩家隨身裝備欄或持有物品欄（絕不掉在地上）
   * 若 autoEquip 為 true 且目前裝備未滿 3 個，會自動裝入空槽；否則收入持有物品欄
   */
  function addItemToInventory(metaOrEmoji, autoEquip = false) {
    if(season.enabled)return createItemInstance(metaOrEmoji);
    const inst = createItemInstance(metaOrEmoji);
    if (!window.OfficeWardrobe.add(localPlayer, inst, autoEquip)) {
      // Already-granted rewards and exchanges must not disappear on a capacity race.
      localPlayer.overflow.push({...inst, count:1});
      showCombatToast('背包或服裝已滿，物品保留在暫存領取區');
    }
    syncPlayerActiveWeaponState();
    return inst;
  }

  function equipFromBag(bagIdx) {
    const item = localPlayer.inventory[bagIdx]; if (!item) return;
    if(season.enabled){
      if(season.manualEmptySlots) season.manualEmptySlots.clear();
      seasonSend("equip",{uid:item.uid});
      return;
    }
    if (window.OfficeWardrobe.isOutfit(item)) {
      window.OfficeWardrobe.wear(localPlayer, bagIdx);
      showCombatToast(`${localPlayer.wornOutfitUid === item.uid ? '穿上' : '脫下'}【${escapeHtml(item.name)}】`);
    } else if (!window.OfficeWardrobe.equip(localPlayer, bagIdx)) {
      showCombatToast('背包已滿，請先騰出一格再交換裝備'); return;
    }
    syncPlayerActiveWeaponState();
    if(item.category!=='outfit')showCombatToast(`已裝備【${escapeHtml(item.name)}】`);
  }

  function unequipSlotToBag(equipIdx) {
    if(season.enabled){
      season.manualEmptySlots = season.manualEmptySlots || new Set();
      season.manualEmptySlots.add(equipIdx);
      const i=localPlayer.equippedSlots[equipIdx];
      if(i)seasonSend("equip",{uid:i.uid});
      return;
    }
    if (!window.OfficeWardrobe.unequip(localPlayer, equipIdx)) {
      showCombatToast('背包已滿，無法卸下裝備'); return;
    }
    syncPlayerActiveWeaponState();
    showCombatToast('已卸下裝備，放回背包');
  }

  function renderMinecraftInventoryUI() {
    const wardrobeStatus = document.getElementById('wardrobeStatus');
    const worn = window.OfficeWardrobe.worn(localPlayer);
    if(wardrobeStatus) wardrobeStatus.textContent = `總攜帶 ${season.enabled?(localPlayer.inventory.length+getEquippedCount()):localPlayer.inventory.length}/10 件 · 服裝 ${window.OfficeWardrobe.outfitCount(localPlayer)}/3 套 · ${worn ? '穿著：'+worn.name+'（'+worn.durability+'/5）' : '日常穿著'}`;
    const overflowEl=document.getElementById('inventoryOverflow');
    if(overflowEl){
      overflowEl.replaceChildren();
      if(localPlayer.overflow.length){
        const heading=document.createElement('p');heading.textContent='暫存領取區（只可取出，領取需有背包空間）';overflowEl.appendChild(heading);
        localPlayer.overflow.forEach((item,index)=>{
          const button=document.createElement('button');button.type='button';button.textContent=`領取 ${item.emoji} ${item.name} ×${item.count||1}`;
          button.onclick=()=>{if(season.enabled){seasonSend("claim_legacy",{uid:item.uid});return;}if(window.OfficeWardrobe.claim(localPlayer,index))syncPlayerActiveWeaponState();else showCombatToast('背包或服裝已滿，請先騰出空間');};overflowEl.appendChild(button);
        });
      }
    }
    const modalHotbarEl = document.getElementById('mcModalHotbarGrid');
    const modalGridEl = document.getElementById('mcInventoryGrid');
    const eqIcon = document.getElementById('mcEquippedIcon');
    const eqName = document.getElementById('mcEquippedName');
    const eqDesc = document.getElementById('mcEquippedDesc');
    const bonusBadge = document.getElementById('mcTotalBonusBadge');
    const hudDurability = document.getElementById('hudActiveWeaponDurability');
    const hudEquipCount = document.getElementById('hudEquipCountBadge');
    const atkBtn = document.getElementById('btnWeaponAttack');

    const active = getActiveEquippedItem();
    const eqCount = getEquippedCount();
    const totalBonusPct = getTotalEquippedExpBonusPct();

    if (hudEquipCount) {
      hudEquipCount.textContent = `(${eqCount}/3)`;
    }
    if (hudDurability) {
      hudDurability.textContent = active
        ? `${active.emoji}(${active.durability}/${active.maxDurability})`
        : '(未裝備)';
    }
    if (atkBtn) {
      atkBtn.classList.toggle('disabled-no-equip', !active);
    }

    if (eqIcon && eqName && eqDesc) {
      if (active) {
        eqIcon.textContent = active.emoji;
        eqName.textContent = `${active.emoji} ${active.name} 【主手裝備｜耐久 ${active.durability}/${active.maxDurability}】`;
        eqDesc.textContent = `擊飛威力 Power ${active.power}｜經驗加成 +${active.expBonusPct}%｜擊退能力：${active.hitsToRepel || 3} 次擊退怪物｜耐久度：${active.durability}/${active.maxDurability}（命中滿 3 次損毀消失）`;
      } else {
        eqIcon.textContent = '👊';
        eqName.textContent = '👊 徒手拳頭【未裝備道具・肉身無限耐久】';
        eqDesc.textContent = '威力 Power 3｜經驗加成 +0%｜擊退需：10 次｜冷卻 1.0 秒｜按 [F] 徒手揮拳擊退！';
      }
    }

    if (bonusBadge) {
      bonusBadge.textContent = `✨ 已裝備 ${eqCount}/3 個｜裝備總經驗加成：+${totalBonusPct}%｜${
        active
          ? `主手擊退能力：${active.hitsToRepel || 3}次擊退怪物｜剩餘耐久：${active.durability}/${active.maxDurability}`
          : '👊 徒手拳頭：10次擊退｜耐久無限'
      }`;
    }

    // 繪製上方 3 格隨身裝備欄
    if (modalHotbarEl) {
      modalHotbarEl.innerHTML = [0, 1, 2]
        .map((idx) => {
          const item = localPlayer.equippedSlots[idx];
          const isSel = idx === localPlayer.activeEquipIndex && item;
          if (!item) {
            return `
              <div class="mc-equip-slot-card" data-equip-slot="${idx}">
                <div class="mc-equip-slot-icon">➕</div>
                <div class="mc-equip-slot-info">
                  <div class="mc-equip-slot-title">空裝備槽 #${idx + 1}</div>
                  <div class="mc-equip-slot-meta">點擊下方持有物品裝上</div>
                </div>
              </div>
            `;
          }
          return `
            <div class="mc-equip-slot-card ${isSel ? 'mc-selected' : ''}" data-equip-slot="${idx}" title="點擊設為主手揮擊武器">
              <button type="button" class="mc-unequip-mini-btn" data-unequip-slot="${idx}" title="卸下回持有物品欄">✕</button>
              <div class="mc-equip-slot-icon">${item.emoji}</div>
              <div class="mc-equip-slot-info">
                <div class="mc-equip-slot-title">${escapeHtml(item.name)}</div>
                <div class="mc-equip-slot-meta">經驗+${item.expBonusPct}%｜${item.hitsToRepel || 3}次擊退</div>
                <div class="mc-equip-slot-dur">🔧 耐久度：${item.durability}/${item.maxDurability} 次（滿3次損毀）</div>
              </div>
            </div>
          `;
        })
        .join('');

      modalHotbarEl.querySelectorAll('[data-unequip-slot]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          unequipSlotToBag(Number(btn.dataset.unequipSlot));
        });
      });

      modalHotbarEl.querySelectorAll('[data-equip-slot]').forEach((card) => {
        card.addEventListener('click', () => {
          const idx = Number(card.dataset.equipSlot);
          if (localPlayer.equippedSlots[idx]) {
            localPlayer.activeEquipIndex = idx;
          if(season.enabled)seasonSend("active",{slot:idx});
            syncPlayerActiveWeaponState();
            const s = localPlayer.equippedSlots[idx];
            showCombatToast(
              `⚔️ 已切換主手武器為：${s.emoji} ${escapeHtml(s.name)}（擊退 +${
                s.knockbackExp
              } EXP，剩餘耐久 ${s.durability}/${s.maxDurability}）`,
              'info'
            );
          }
        });
      });
    }

    // 十格背包，穿著中的服裝仍保留原格
    if (modalGridEl) {
      modalGridEl.innerHTML = Array.from({ length: 10 })
        .map((_, idx) => {
          const item = localPlayer.inventory[idx];
          if (!item) {
            return `<div class="mc-slot" data-bag-slot="${idx}" title="空置儲物格"></div>`;
          }
          return `
            <div class="mc-slot ${
              item.category === 'weapon' ? 'mc-weapon-slot' : item.category === 'outfit' ? 'mc-outfit-slot' : ''
            }" data-bag-slot="${idx}" title="${escapeHtml(item.name)} (x${
            item.count
          })｜經驗+${item.expBonusPct}%｜${item.hitsToRepel || 3}次擊退怪｜耐久 ${item.durability}/${item.maxDurability} — ${item.category === 'outfit' ? '點擊穿上／脫下' : '點擊裝備'}">
              <span>${item.emoji}</span>
              ${item.category === 'outfit' ? `<span class="outfit-durability">${item.uid === localPlayer.wornOutfitUid ? '穿著 ' : ''}${item.durability}/5</span>` : ''}
              ${item.count > 1 ? `<span class="mc-slot-count">${item.count}</span>` : ''}
            </div>
          `;
        })
        .join('');

      modalGridEl.querySelectorAll('[data-bag-slot]').forEach((el) => {
        el.addEventListener('click', () => {
          const idx = Number(el.dataset.bagSlot);
          if (localPlayer.inventory[idx]) {
            equipFromBag(idx);
          }
        });
      });
    }
  }

  function setupMinecraftInventoryEvents() {
    const modal = document.getElementById('mcInventoryModal');
    const toggleBtn = document.getElementById('btnToggleMcInv');
    const closeBtn = document.getElementById('closeMcInvBtn');
    const atkBtn = document.getElementById('btnWeaponAttack');

    if (toggleBtn && modal) {
      toggleBtn.addEventListener('click', () => {
        modal.classList.toggle('hidden');
        renderMinecraftInventoryUI();
      });
    }
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    }
    if (atkBtn) {
      atkBtn.addEventListener('click', () => {
        triggerWeaponAttack();
      });
    }
    renderMinecraftInventoryUI();
  }

  // =========================================================================
  // 1. 上線次數與經驗加成系統 + 修復機台直接升一級 (forceLevelUp)
  // =========================================================================
  function initAndIncrementLoginExp(userName, skipExp = false) {
    const key = 'pp00_gather_exp_' + (userName || 'default').toLowerCase();
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved && typeof saved.loginCount === 'number') {
        progression.loginCount = skipExp ? saved.loginCount : (saved.loginCount + 1);
        progression.exp = skipExp ? (saved.exp || 50) : ((saved.exp || 0) + 50);
      } else {
        progression.loginCount = 1;
        progression.exp = 50;
      }
      localStorage.setItem(
        key,
        JSON.stringify({ loginCount: progression.loginCount, exp: progression.exp })
      );
    } catch (_) {
      progression.loginCount = 1;
      progression.exp = 50;
    }
    recalcLevelAndBuff();
  }

  function addExp(amount, reasonText, applyEquipBonus = true) {
    if(season.enabled)return 0;
    if (amount < 0) {
      const loss = Math.abs(amount);
      progression.exp = Math.max(0, progression.exp - loss);
      if (reasonText) appendCombatText(`-${loss} EXP · ${reasonText}`);
      const key = 'pp00_gather_exp_' + (localPlayer.name || 'default').toLowerCase();
      try {
        localStorage.setItem(key, JSON.stringify({ loginCount: progression.loginCount, exp: progression.exp }));
      } catch (_) {}
      recalcLevelAndBuff();
      updateSelfHudCard();
      return -loss;
    }
    const equipBonusPct = applyEquipBonus ? getTotalEquippedExpBonusPct() : 0;
    const finalAmount = Math.max(1, Math.round(amount * (1 + equipBonusPct / 100)));
    progression.exp += finalAmount;
    if (reasonText) appendCombatText(`+${finalAmount} EXP · ${reasonText}`);
    const key = 'pp00_gather_exp_' + (localPlayer.name || 'default').toLowerCase();
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ loginCount: progression.loginCount, exp: progression.exp })
      );
    } catch (_) {}
    const prevLv = progression.level;
    recalcLevelAndBuff();
    if (progression.level > prevLv) {
      spawnConfetti(localPlayer.x, localPlayer.y - 30);
      showCombatToast(
        `🎉 等級提升！升至 ${progression.title}（移速加成 +${progression.speedBonusPct}%｜裝備經驗加成 +${equipBonusPct}%）`,
        'join'
      );
    } else if (reasonText) {
      updateSelfHudCard();
    }
    return finalAmount;
  }

  globalThis.handleNonSeasonArcadeResult = function(outcome) {
    if (outcome === 'win') {
      const pool = [
        { id: 'coffee', name: '熱咖啡', emoji: '☕', category: 'item', maxDurability: 1 },
        { id: 'boba', name: '波霸珍奶', emoji: '🧋', category: 'item', maxDurability: 1 },
        { id: 'pizza', name: '美味披薩', emoji: '🍕', category: 'item', maxDurability: 1 },
        { id: 'kuaikuai', name: '綠乖乖', emoji: '🟢', category: 'item', maxDurability: 1 },
        { id: 'wrench', name: '工程板手', emoji: '🔧', category: 'weapon', maxDurability: 3 },
        { id: 'duck', name: '黃色小鴨', emoji: '🦆', category: 'weapon', maxDurability: 3 },
        { id: 'ic_pkg', name: '封裝晶片', emoji: '💾', category: 'weapon', maxDurability: 3 },
        { id: 'keyboard', name: '機械鍵盤', emoji: '⌨️', category: 'weapon', maxDurability: 3 },
        { id: 'bench', name: '折疊鐵椅', emoji: '🪑', category: 'weapon', maxDurability: 3 },
      ];
      const item = pool[Math.floor(Math.random() * pool.length)];
      addItemToInventory(item, true);
      addExp(15, '電競猜拳勝利！');
      updateSelfHudCard();
      showCombatToast(`🎉 電競猜拳大獲全勝！獲得獎勵【${item.emoji} ${item.name}】與 +15 EXP！`);
    } else if (outcome === 'lose') {
      addExp(-10, '電競猜拳落敗');
      updateSelfHudCard();
      showCombatToast('💀 電競猜拳遺憾落敗，經驗值 -10 EXP！', 'error');
    }
  };

  globalThis.startNonSeasonHealing = function() {
    localPlayer.actionState = 'play_arcade';
    updatePoseLabelUI();
    showCombatToast('🎮 正在電競娛樂室打電動療傷中 (5 秒)……');
    setTimeout(() => {
      if (localPlayer.actionState === 'play_arcade') {
        localPlayer.lightInjuredUntil = 0;
        localPlayer.isInjured = false;
        localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
        updatePoseLabelUI();
        showCombatToast('✨ 療傷完成！身心愉悅，挫傷已痊癒！', 'join');
        savePersistentState();
      }
    }, 5000);
  };

  function forceLevelUp(facilityName) {
    if(season.enabled){showCombatToast("設備已修復；Season 2 獎勵由後端結算");return;}
    // 補足至下一等級所需 EXP（每 100 EXP 升 1 級，保證立即升 1 級！）
    const nextLevelExp = progression.level * 100;
    const needed = Math.max(100, nextLevelExp - progression.exp);
    progression.exp += needed;
    const key = 'pp00_gather_exp_' + (localPlayer.name || 'default').toLowerCase();
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ loginCount: progression.loginCount, exp: progression.exp })
      );
    } catch (_) {}
    recalcLevelAndBuff();
    spawnConfetti(localPlayer.x, localPlayer.y - 30);
    showToast(
      `🛠️ <b>成功修復【${escapeHtml(facilityName)}】！等級立即提升至 ${
        progression.title
      }</b>（移速加成 +${progression.speedBonusPct}%）！`,
      'join'
    );
  }

  function recalcLevelAndBuff() {
    if(season.enabled){const R=window.OfficeProgression;if(R){progression.level=R.level(progression.exp);progression.title=R.title(progression.level);progression.speedBonusPct=(progression.level-1)*2;localPlayer.speed=R.speed(localPlayer.baseSpeed,progression.level,season.effects,gameNow());}updateSelfHudCard();return;}
    const lv = Math.min(20, Math.floor(progression.exp / 100) + 1);
    progression.level = lv;
    const titles = [
      'Lv.1 實習小鮮肉',
      'Lv.2 晶圓探險家',
      'Lv.3 良率守護者',
      'Lv.4 綠乖乖傳教士',
      'Lv.5 資深 Debug 肝帝',
      'Lv.6 T5830 馴獸師',
      'Lv.7 半導體大魔導',
      'Lv.8 處級榮譽顧問',
      'Lv.9 傳奇 Yield 之神',
      'Lv.10 PP00 創世神',
    ];
    progression.title = titles[lv - 1] || `Lv.${lv} PP00 超越神`;
    progression.speedBonusPct = (lv - 1) * 4; // 每級 +4% 移速加成
    localPlayer.speed = localPlayer.baseSpeed * (1 + progression.speedBonusPct / 100);
    updateSelfHudCard();
  }

  // =========================================================================
  // 2. 台灣加權股價指數 (TAIEX) 盤後資料整合模組
  //    嚴格遵循 TAIEX_GitHub_Pages_Integration_Plan.md 規範：
  //    • 首選資料來源：臺灣證券交易所 (TWSE) OpenAPI (MI_INDEX)
  //    • 每 60 秒輪詢，標示「最近交易日收盤資料」，絕不誤稱「即時/Live」
  //    • 嚴格驗證欄位與民國/西元日期，失敗時保留上次成功數值，絕不捏造假數據
  // =========================================================================
  const STATIC_MARKET_JSON = './static/data/taiex.json';
  const MARKET_API = 'https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX';

  function parseNumeric(raw) {
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      return NaN;
    }
    return Number(String(raw).replace(/,/g, '').replace(/%/g, '').trim());
  }

  function parseMarketDate(raw) {
    const s = String(raw ?? '').trim();
    let year, month, day;
    if (/^\d{7}$/.test(s)) {
      // 民國年 YYYMMDD (例如 1141023 -> 2025/10/23)
      year = Number(s.slice(0, 3)) + 1911;
      month = Number(s.slice(3, 5));
      day = Number(s.slice(5, 7));
    } else if (/^\d{8}$/.test(s)) {
      // 西元年 YYYYMMDD
      year = Number(s.slice(0, 4));
      month = Number(s.slice(4, 6));
      day = Number(s.slice(6, 8));
    } else {
      throw new Error('不支援的行情日期格式');
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new Error('無效的行情日期');
    }
    return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
  }

  function parseMarket(records) {
    if (!Array.isArray(records)) throw new Error('行情格式非陣列');
    const item = records.find(
      (x) => String(x?.['指數'] ?? '').trim() === '發行量加權股價指數'
    );
    if (!item) throw new Error('找不到加權股價指數');

    const value = parseNumeric(item['收盤指數']);
    const magnitude = parseNumeric(item['漲跌點數']);
    const percentMagnitude = parseNumeric(item['漲跌百分比']);
    if (![value, magnitude, percentMagnitude].every(Number.isFinite)) {
      throw new Error('行情數值無效');
    }

    // 移除可能夾帶的 HTML 標籤再判斷正負號
    const direction = String(item['漲跌'] ?? '')
      .replace(/<[^>]*>/g, '')
      .trim();
    let sign;
    if (['+', '＋', '▲', '漲'].includes(direction)) sign = 1;
    else if (['-', '－', '−', '▼', '跌'].includes(direction)) sign = -1;
    else if (
      ['', '0', 'X', '---'].includes(direction) &&
      magnitude === 0 &&
      percentMagnitude === 0
    ) {
      sign = 0;
    } else {
      throw new Error(`無法辨識漲跌方向: ${direction}`);
    }

    return {
      value,
      change: sign * Math.abs(magnitude),
      percent: sign * Math.abs(percentMagnitude),
      sign,
      date: parseMarketDate(item['日期']),
    };
  }

  async function updateMarket() {
    const valEl = document.getElementById('taiex-value');
    const chgEl = document.getElementById('taiex-change');
    const dateEl = document.getElementById('taiex-date');
    const statusEl = document.getElementById('taiex-status');
    const st = window.TAIWAN_STOCK_STATE;

    let loaded = false;

    // 優先從同源靜態檔案讀取 (由 GitHub Actions 每日自動抓取並發布，零 CORS 限制)
    try {
      const staticRes = await fetch(STATIC_MARKET_JSON, { cache: 'no-store' });
      if (staticRes.ok) {
        const data = await staticRes.json();
        if (data && data.hasData && Number.isFinite(data.value)) {
          st.hasData = true;
          st.valueText = data.formattedValue || data.value.toLocaleString('en-US', { minimumFractionDigits: 2 });
          st.changeText = data.formattedChange || '';
          st.direction = data.sign || 0;
          st.dateText = `行情日期：${data.date}`;
          st.statusText = data.statusText || '最近交易日收盤資料 (TWSE 官方盤後)';
          loaded = true;
        }
      }
    } catch (_) {
      // 靜態檔未就緒時平滑降級嘗試線上 API
    }

    if (!loaded) {
      try {
        const response = await fetch(MARKET_API, { cache: 'no-store' });
        if (response.ok) {
          const market = parseMarket(await response.json());

          const formattedValue = market.value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const arrow = market.change > 0 ? '▲ ' : market.change < 0 ? '▼ ' : '';
          const sign = market.change > 0 ? '+' : '';
          const pctSign = market.percent > 0 ? '+' : '';
          const formattedChange = `${arrow}${sign}${market.change.toFixed(2)} (${pctSign}${market.percent.toFixed(2)}%)`;

          // 同步更新會議室 A 巨型大螢幕狀態
          st.hasData = true;
          st.valueText = formattedValue;
          st.changeText = formattedChange;
          st.direction = market.sign;
          st.dateText = `行情日期：${market.date}`;
          st.statusText = '最近交易日收盤資料 (TWSE 官方盤後)';
          loaded = true;
        }
      } catch (error) {
        console.warn('[Market] 保留最新真實盤後數據:', error.message || error);
      }
    }

    // 確保會議室 A 大螢幕資料與文字顯示
    if (valEl) valEl.textContent = st.valueText;
    if (chgEl) {
      chgEl.textContent = st.changeText;
      chgEl.className = st.direction > 0 ? 'market-up' : st.direction < 0 ? 'market-down' : '';
    }
    if (dateEl) dateEl.textContent = st.dateText;
    if (statusEl) statusEl.textContent = st.statusText;
  }

  // =========================================================================
  // 3. NPC 暴走攻擊命中：角色自動被打飛拋物線（絕不定身，可隨時自由移動！）
  // =========================================================================
  function triggerBerserkKnockback(npc, reason) {
    if(season.enabled)return;
    window.OfficeCombat?.send(network,'combat_hurt',{targetId:network.clientId});
    const nowInj = gameNow();
    if (Math.random() < 0.20 && nowInj >= (localPlayer.lightInjuredUntil || 0) && !localPlayer.isInjured) {
      localPlayer.lightInjuredUntil = nowInj + 60000;
      showCombatToast('🩹 輕微挫傷：移速降低 30% (持續 60 秒)', 'error');
      pushCombatLog('系統', `🩹 遭【${npc.name || '敵人'}】重擊造成輕微挫傷！移速降低 30%（持續 60 秒）`);
    }
    // 計算從攻擊者指向玩家的擊飛向量
    let dx = localPlayer.x - npc.x;
    let dy = localPlayer.y - npc.y;
    if (Math.hypot(dx, dy) < 1) {
      dx = Math.random() - 0.5;
      dy = Math.random() - 0.5;
    }
    const angle = Math.atan2(dy, dx);
    const power = window.GATHER_CONFIG.security.berserkKnockbackPower || 24;
    const totalTicks = window.GATHER_CONFIG.security.berserkKnockbackTicks || 28;

    // 釋放可能佔用的馬桶或動作，啟動擊飛拋物線（不鎖定鍵盤移動！）
    window.WORLD_MAP.toiletStalls.forEach((s) => {
      if (s.occupiedBy === localPlayer.id) s.occupiedBy = null;
    });
    localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
    localPlayer.autoWalkTarget = null;
    localPlayer.knockback = {
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power,
      ticksLeft: totalTicks,
      totalTicks,
    };
    localPlayer.jumpOffset = 46;
    localPlayer.emote = { emoji: '💫', expiresAt: gameNow() + 2800 };

    // 產生擊飛震波與火花粒子
    vfxList.push({
      type: 'click_ring',
      x: localPlayer.x,
      y: localPlayer.y,
      radius: 10,
      maxRadius: 110,
      alpha: 1,
      color: '#ef4444',
    });
    spawnConfetti(localPlayer.x, localPlayer.y - 20);

    if (appendCombatText(`💥 遭受【${escapeHtml(npc.name)}】暴走擊飛！${escapeHtml(reason || '')}`)) return;
    const modal = document.getElementById('berserkWarningModal');
    const titleEl = document.getElementById('berserkModalAttacker');
    const reasonEl = document.getElementById('berserkModalReason');
    const timerEl = document.getElementById('berserkModalCountdown');

    if (modal) {
      titleEl.textContent = `💥 遭受【${npc.name}】暴走擊飛！`;
      reasonEl.textContent = reason;
      timerEl.textContent = '🚀 您已被自動打飛出去！（不會定身，可立即自由移動閃避）';
      modal.classList.remove('hidden');

      if (berserkBannerTimer) clearTimeout(berserkBannerTimer);
      berserkBannerTimer = setTimeout(() => {
        modal.classList.add('hidden');
      }, 2800);
    }
  }

  // =========================================================================
  // 4. 登入視窗、可縮合面板、情境動作按鈕與左下整合聊天 UI 綁定
  // =========================================================================
async function executeOfficeLogin(params) {
      if(season.enabled){try{const snap=await seasonLogin(params);params={...params,avatarId:snap.player.avatarId,roomCode:"PP00"};}catch(e){const err=document.getElementById("loginErrorMsg");err.textContent=e.message;err.style.display="block";return;}}
      const { name, unit, roomCode, status, avatarId, isAutoReload = false } = params;
      const cleanName = network.sanitizeText(name, 16);
      const cleanRoom = network.sanitizeText(roomCode || 'PP00', 16) || 'PP00';

      const chosenAvatar = window.AVATAR_CATALOG.find((a) => a.id === avatarId)
        || window.AVATAR_CATALOG[selectedAvatarIndex]
        || window.AVATAR_CATALOG[0];
      const chosenIdx = window.AVATAR_CATALOG.findIndex((a) => a.id === chosenAvatar.id);
      if (chosenIdx !== -1) selectedAvatarIndex = chosenIdx;

      localPlayer.name = cleanName;
      localPlayer.unit = unit;
      localPlayer.status = status || 'active';
      localPlayer.avatarId = chosenAvatar.id;

      // 首次登入預設不贈送初始裝備，完全徒手，由玩家在場景中撿拾或互動取得

      // 計算上線次數與經驗加成（若是重整自動載入，保留現有經驗不重複刷打卡加成）
      if(!season.enabled)initAndIncrementLoginExp(cleanName, isAutoReload);
      lastUserActionAt = gameNow();

      // 請求桌面原生通知權限（方便縮小後接受同事私聊）
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }

      const overlay = document.getElementById('loginOverlay');
      if (overlay) overlay.classList.add('hidden');
      isLoggedIn = true;
      loginTimestamp = gameNow();
      network.connect(localPlayer, season.enabled?cleanRoom+'-S2':cleanRoom);

      if (window.gatherSupabase) {
        window.gatherSupabase.init({
          callbacks: {
            onError: () => {if(!document.hidden)showCombatToast('連線正在恢復；雲端交易將重新確認');},
            onAuditLogInsert: (log) => {if(season.enabled)return;
              if (log && log.client_id !== network.clientId) {
                const action = log.event_type === 'login' ? '上線進入' : '離線離開';
                showToast(`🔔 <b>${escapeHtml(log.user_name)}</b> (${escapeHtml(log.unit)}) 已${action}辦公室！`, 'join');
              }
            },
            onOnlineUsersFetched: (users) => {if(season.enabled)return;
              if (Array.isArray(users)) {
                users.forEach((u) => {
                  if (u.client_id && u.client_id !== network.clientId) {
                    network.upsertRemotePlayer({
                      id: u.client_id,
                      name: u.user_name,
                      unit: u.unit,
                      avatarId: u.avatar_id,
                      status: u.status,
                      heldItem: u.held_item,
                      x: u.x,
                      y: u.y,
                      dir: u.dir,
                      actionState: u.action_state,
                    }, false);
                  }
                });
                renderSidebarRoster();
              }
            },
            onUserTableChange: (payload) => {if(season.enabled)return;
              if (payload && payload.new && payload.new.client_id !== network.clientId) {
                if (payload.eventType === 'DELETE') {
                  const leavingId = payload.old?.client_id;
                  if (leavingId && network.remotePlayers.has(leavingId)) {
                    network.remotePlayers.delete(leavingId);
                    renderSidebarRoster();
                  }
                } else {
                  const u = payload.new;
                  network.upsertRemotePlayer({
                    id: u.client_id,
                    name: u.user_name,
                    unit: u.unit,
                    avatarId: u.avatar_id,
                    status: u.status,
                    heldItem: u.held_item,
                    x: u.x,
                    y: u.y,
                    dir: u.dir,
                    actionState: u.action_state,
                  }, false);
                  renderSidebarRoster();
                }
              }
            },
          },
        });
        window.gatherSupabase.registerUser(localPlayer);
      }

      // 確保鳥人指揮官出勤狀態正常
      if (localPlayer.birdCommanderRestUntil && gameNow() < localPlayer.birdCommanderRestUntil) {
        if (network) network.npcPlayers.delete('npc_bird_commander');
      } else {
        localPlayer.birdCommanderRestUntil = 0;
        if (network && typeof network.spawnBirdCommander === 'function') {
          network.spawnBirdCommander();
        }
      }

      // 若處於重傷休養狀態，強制定位於會議室休養
      if (!season.enabled && localPlayer.isInjured && gameNow() < (localPlayer.injuredUntil || 0)) {
        localPlayer.x = 400; // 會議室 A
        localPlayer.y = 1350;
        localPlayer.actionState = 'sleep_bed';
        updateInjuryCountdownHUD();
        const remSec = Math.max(0, Math.ceil((localPlayer.injuredUntil - gameNow()) / 1000));
        const m = String(Math.floor(remSec / 60)).padStart(2, '0');
        const s = String(remSec % 60).padStart(2, '0');
        pushStatusLog(
          '系統',
          `🚑 登入偵測：你仍處於重傷休養狀態，正在會議室休息無法動彈（剩餘 ${m}:${s}）！`
        );
        showToast(`🚑 處於重傷休養中（剩餘 ${m}:${s}）`, 'error');
      }

      savePersistentState();
      saveLoginSession(true);

      const selfStatusSel = document.getElementById('selfStatusSelect');
      if (selfStatusSel) selfStatusSel.value = localPlayer.status;
      updateSelfHudCard();
      renderMinecraftInventoryUI();
      renderSidebarRoster();

      if (season.enabled) {showCombatToast(`Season 2 · ${progression.title} · ${progression.exp} EXP`);}
      else if (isAutoReload) {
        pushStatusLog(
          '系統',
          `🔄 已成功重新載入最新版本程式碼！歡迎回到辦公室，${localPlayer.name}（${progression.title}）！`
        );
        showToast(`🔄 <b>${escapeHtml(localPlayer.name)}</b> 已載入最新版遊戲程式碼，自動接續連線！`, 'join');
      } else {
        pushStatusLog(
          '系統',
          `🎉 歡迎 ${localPlayer.name} 第 ${progression.loginCount} 次上線！打卡獎勵 +50 EXP（${progression.title}）`
        );
        showToast(`🎉 歡迎 <b>${escapeHtml(localPlayer.name)}</b> 進入辦公室！打卡成功 +50 EXP`, 'join');
      }

      const activeWpn = getActiveEquippedItem();
      if (activeWpn) {
        pushStatusLog(
          '系統',
          `⚔️ 當前隨身裝備：${activeWpn.emoji} ${activeWpn.name}（耐久 ${activeWpn.durability}/${activeWpn.maxDurability || 3}｜按 [F] 揮擊擊退｜按 [I] 開啟裝備欄）`
        );
      }
    }

  function setupLoginUI() {
    const unitSelect = document.getElementById('loginUnit');
    unitSelect.innerHTML = '<option value="" disabled selected>請選擇工程部門 / 主管區...</option>';
    window.GATHER_CONFIG.units.forEach((u) => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u;
      unitSelect.appendChild(opt);
    });

    const statusSelect = document.getElementById('loginStatus');
    window.GATHER_CONFIG.statuses.forEach((st) => {
      const opt = document.createElement('option');
      opt.value = st.id;
      opt.textContent = `${st.icon} ${st.label}`;
      statusSelect.appendChild(opt);
    });

    // 同步初始化左下角整合面板的狀態選單
    const selfStatusSel = document.getElementById('selfStatusSelect');
    if (selfStatusSel) {
      selfStatusSel.innerHTML = '';
      window.GATHER_CONFIG.statuses.forEach((st) => {
        const opt = document.createElement('option');
        opt.value = st.id;
        opt.textContent = `${st.icon} ${st.label}`;
        selfStatusSel.appendChild(opt);
      });
    }

    const avatarGrid = document.getElementById('avatarSelectorGrid');
    avatarGrid.innerHTML = '';
    window.AVATAR_CATALOG.forEach((av, idx) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'avatar-pick-card' + (idx === selectedAvatarIndex ? ' active' : '');
      card.innerHTML = `
        <canvas class="avatar-pick-preview" width="112" height="128" aria-hidden="true"></canvas>
        <span class="avatar-pick-name">${av.name}</span>
        <span class="avatar-pick-tag">${av.tag}</span>
      `;
      card.setAttribute('aria-label', `${av.name}，${av.tag}`);
      const preview = card.querySelector('.avatar-pick-preview');
      const previewCtx = preview.getContext('2d');
      previewCtx.imageSmoothingEnabled = false;
      window.drawWackyAvatar(previewCtx, {
        avatarId: av.id, x: 56, y: 81, dir: 'down', tick: 0, scale: 2,
      });
      card.addEventListener('click', () => {
        selectedAvatarIndex = idx;
        updateAvatarPreviewSelection();
      });
      avatarGrid.appendChild(card);
    });

    document.getElementById('prevAvatarBtn').addEventListener('click', () => {
      selectedAvatarIndex =
        (selectedAvatarIndex - 1 + window.AVATAR_CATALOG.length) % window.AVATAR_CATALOG.length;
      updateAvatarPreviewSelection();
    });

    document.getElementById('nextAvatarBtn').addEventListener('click', () => {
      selectedAvatarIndex = (selectedAvatarIndex + 1) % window.AVATAR_CATALOG.length;
      updateAvatarPreviewSelection();
    });

    updateAvatarPreviewSelection();



    // 讀取歷史登入憑證以預先填入表單；若存在 autoLogin 旗標則自動登入進入辦公室
    const savedSession = loadLoginSession();
    if (savedSession) {
      const nameInput = document.getElementById('loginName');
      const unitInput = document.getElementById('loginUnit');
      const passInput = document.getElementById('loginPasscode');
      const statusInput = document.getElementById('loginStatus');

      if (nameInput && savedSession.name) nameInput.value = savedSession.name;
      if (unitInput && savedSession.unit) unitInput.value = savedSession.unit;
      if (passInput && savedSession.passcode && /^\d{6}$/.test(savedSession.passcode)) passInput.value = savedSession.passcode;
      if (statusInput && savedSession.status) statusInput.value = savedSession.status;
      if (savedSession.avatarId) {
        const avIdx = window.AVATAR_CATALOG.findIndex((a) => a.id === savedSession.avatarId);
        if (avIdx !== -1) {
          selectedAvatarIndex = avIdx;
          updateAvatarPreviewSelection();
        }
      }

      // 自動重新連線：免手動點選「進入辦公室」！
      if (savedSession.autoLogin && savedSession.name && savedSession.unit) {
        setTimeout(() => {
          if (!isLoggedIn) {
            executeOfficeLogin({
              name: savedSession.name,
              unit: savedSession.unit,
              roomCode: savedSession.roomCode || 'PP00',
              status: savedSession.status || 'active',
              avatarId: savedSession.avatarId,
              isAutoReload: true,
            });
          }
        }, 50);
      }
    }

    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const rawName = document.getElementById('loginName').value;
      const cleanName = network.sanitizeText(rawName, 16);
      const passVal = (document.getElementById('loginPasscode')?.value || '').trim();
      const errEl = document.getElementById('loginErrorMsg');

      if (!cleanName) {
        errEl.textContent = '⚠️ 請輸入您的名稱（上限 16 字）';
        errEl.style.display = 'block';
        return;
      }
      const rawUnit = document.getElementById('loginUnit').value;
      if (!rawUnit) {
        errEl.textContent = '⚠️ 請選擇所屬工程部門 / 主管區';
        errEl.style.display = 'block';
        return;
      }
      if (!passVal || !/^\d{6}$/.test(passVal)) {
        errEl.textContent = '⚠️ 請輸入 6 位數個人雲端密碼（純數字）';
        errEl.style.display = 'block';
        return;
      }

      errEl.style.display = 'none';
      const chosenAvatar = window.AVATAR_CATALOG[selectedAvatarIndex];
      executeOfficeLogin({
        name: cleanName,
        unit: rawUnit,
        roomCode: 'PP00',
        status: document.getElementById('loginStatus').value || 'active',
        avatarId: chosenAvatar.id,
        isAutoReload: false,
      });
    });
  }

  function updateAvatarPreviewSelection() {
    const av = window.AVATAR_CATALOG[selectedAvatarIndex];
    document.getElementById('previewAvatarTitle').textContent = `${av.badge} ${av.name}`;
    document.getElementById('previewAvatarDesc').textContent = av.desc;
    document.querySelectorAll('.avatar-pick-card').forEach((el, idx) => {
      el.classList.toggle('active', idx === selectedAvatarIndex);
      el.setAttribute('aria-pressed', String(idx === selectedAvatarIndex));
    });
  }

  function updatePoseLabelUI() {
    const lbl = document.getElementById('currentPoseLabel');
    const actMeta = window.GATHER_CONFIG.contextualActions.find(
      (a) => a.id === localPlayer.actionState
    );
    if (lbl) {
      lbl.textContent = actMeta ? actMeta.label : '🚶 一般行走';
    }
    document.querySelectorAll('.pose-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.pose === localPlayer.actionState);
    });
  }

  /**
   * 建立點選展開式的 12 種情境動作選單 (含睡覺與 Alt 快捷鍵提示)
   */
  function setupContextualActionButtons() {
    const bar = document.getElementById('actionAnimGrid');
    const toggleMenuBtn = document.getElementById('btnToggleActionPoseMenu');
    const dropdown = document.getElementById('actionPoseDropdown');
    const closeDropdownBtn = document.getElementById('closeActionPoseDropdownBtn');

    if (toggleMenuBtn && dropdown) {
      toggleMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
      });
    }
    if (closeDropdownBtn && dropdown) {
      closeDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden');
      });
    }
    window.addEventListener('click', (e) => {
      if (dropdown && !dropdown.classList.contains('hidden')) {
        if (!dropdown.contains(e.target) && e.target !== toggleMenuBtn) {
          dropdown.classList.add('hidden');
        }
      }
    });

    if (!bar) return;
    bar.innerHTML = window.GATHER_CONFIG.contextualActions
      .map(
        (act) => `
        <button type="button" class="pose-btn" data-pose="${act.id}" title="${escapeHtml(act.desc)}（快捷鍵：${act.hotkey || '無'}）">
          ${act.label} <small style="font-size:9.5px;color:#94a3b8;">${act.hotkey || ''}</small>
        </button>
      `
      )
      .join('');

    bar.querySelectorAll('[data-pose]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const now = gameNow();
        if (now - lastInteractAt < (window.GATHER_CONFIG?.security?.interactCooldownMs || 250)) return;
        lastInteractAt = now;
        lastUserActionAt = now;
        startContextualAction(btn.dataset.pose);
        if (dropdown) dropdown.classList.add('hidden');
      });
    });

    const facBtn = document.getElementById('facilityTriggerBtn');
    if (facBtn) {
      facBtn.addEventListener('click', () => {
        tryInteractWithEnvironment();
      });
    }
    updatePoseLabelUI();
  }

  
  // 🎉 扭蛋大獎驚喜提示視窗 (Gacha Surprise Reveal Modal)
  function showGachaSurpriseModal(item, isPendingReplace, onConfirm) {
    if (!item) return;
    try {
      const old = document.querySelector('.gacha-modal-backdrop');
      if (old) old.remove();

      const catalogItem = (window.COSTUME_CATALOG || []).find((c) => c.id === item.id) || {};
      const outfitName = item.name || catalogItem.name || '傳奇限定造型';
      const badge = catalogItem.badge || item.badge || item.emoji || '🎁';
      const tag = catalogItem.tag || (item.wearType === 'headgear' ? '【頭部裝飾】傳奇防具' : '【全身偶裝】傳奇防具');
      const desc = catalogItem.desc || item.description || '全辦公室最吸睛的專屬造型，穿戴自帶氣場與光環！';
      const durability = item.durability || item.maxDurability || 5;

      const backdrop = document.createElement('div');
      backdrop.className = 'gacha-modal-backdrop';

      const modal = document.createElement('div');
      modal.className = 'gacha-surprise-modal';

      modal.innerHTML = `
        <div class="gacha-surprise-banner">✨ 扭蛋大獎出爐！CONGRATULATIONS ✨</div>
        <div class="gacha-icon-glow">
          <span>${badge}</span>
        </div>
        <div class="gacha-outfit-name">${escapeHtml(outfitName)}</div>
        <div class="gacha-outfit-tag">${escapeHtml(tag)}</div>
        <div class="gacha-outfit-desc">${escapeHtml(desc)}</div>
        <div class="gacha-perk-box">
          <div class="gacha-perk-item">🛡️ <strong>傳奇防禦耐久度：</strong> ${durability} / 5</div>
          <div class="gacha-perk-item">🔰 <strong>致命傷害抵擋：</strong> 可全額吸收致命攻擊，保護本體不受傷！</div>
          <div class="gacha-perk-item">🎨 <strong>全場即時同步：</strong> 3D 像素立體偶裝，全體同事即時可見！</div>
        </div>
        <button class="gacha-confirm-btn" id="gachaSurpriseConfirmBtn">
          ${isPendingReplace ? '🎉 選擇替換背包服飾' : '🎉 收入背包！'}
        </button>
      `;

      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);

      if (typeof spawnConfetti === 'function') {
        spawnConfetti(window.innerWidth / 2, window.innerHeight / 2);
        setTimeout(() => spawnConfetti(window.innerWidth * 0.35, window.innerHeight * 0.4), 150);
        setTimeout(() => spawnConfetti(window.innerWidth * 0.65, window.innerHeight * 0.4), 300);
      }

      const confirmBtn = modal.querySelector('#gachaSurpriseConfirmBtn');
      confirmBtn.addEventListener('click', () => {
        backdrop.remove();
        if (typeof onConfirm === 'function') {
          onConfirm();
        }
      });

      showToast(`🎉 恭喜扭中【${outfitName}】！`, 'success');
    } catch (e) {
      console.warn('showGachaSurpriseModal error:', e);
      if (typeof onConfirm === 'function') onConfirm();
    }
  }
  window.showGachaSurpriseModal = showGachaSurpriseModal;

  function cancelContextualAction() {
    if(season.enabled&&season.client?.snapshot?.player?.channel)seasonSend("cancel");
    if (!localPlayer.actionState && !localPlayer.occupiedSpotId) return;
    window.WORLD_MAP.toiletStalls.forEach((stall) => {
      if (stall.occupiedBy !== localPlayer.id) return;
      stall.occupiedBy = null;
      stall.doorOpen = 1;
      localPlayer.x = stall.x - 28;
      localPlayer.y = stall.y + 48;
      setTimeout(() => { stall.doorOpen = 0; }, 420);
      network?.broadcastPacket('toilet_state', { stallId: stall.id, occupiedBy: null, doorOpen: 0 });
    });
    localPlayer.occupiedSpotId = null;
    localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
    updatePoseLabelUI();
    network.broadcastPacket('state_sync', { player: network.getPublicState() });
  }

  function startContextualAction(actionId) {
    if(gameNow()<(localPlayer.stunnedUntil||0)) return;
    if (localPlayer.isInjured && gameNow() < (localPlayer.injuredUntil || 0)) {
      showToast('🚑 身受重傷休養中，無法動彈或切換動作！', 'error');
      return;
    }
    const actMeta = window.GATHER_CONFIG.contextualActions.find((a) => a.id === actionId);
    if (!actMeta) return;

    localPlayer.autoWalkTarget = null;
    localPlayer.isMoving = false;
    const sameAction = localPlayer.actionState === actionId;
    cancelContextualAction();
    if (sameAction || !actionId) {
      localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
      pushStatusLog('你', '已恢復一般行走狀態');
    } else {
      localPlayer.actionState = actionId;
      // 規則 12：取消情境動作增加經驗值功能，避免重複切換洗經驗
      pushStatusLog('你', `開始「${actMeta.label}」`);
    }

    updatePoseLabelUI();
    network.broadcastPacket('state_sync', { player: network.getPublicState() });
    network.broadcastPacket('status_log', {
      senderName: localPlayer.name,
      text: `開始「${actMeta.label}」`,
    });
  }

  /**
   * 檢查聊天視窗是否處於縮合/關閉狀態（跨瀏覽器相容 Edge / Chrome / Safari）
   */
  function isChatPanelCollapsed() {
    const chatPanel = document.getElementById('proxChatPanel');
    if (!chatPanel) return true;

    // 1. 若聊天面板帶有 chat-minimized class，肯定是縮合
    if (chatPanel.classList.contains('chat-minimized')) return true;

    // 2. 跨瀏覽器檢查實體算繪狀態（相容 Edge、Chrome、Safari 與各類縮放比例）
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      try {
        const panelStyle = window.getComputedStyle(chatPanel);
        if (panelStyle.display === 'none' || panelStyle.visibility === 'hidden') return true;

        // 檢查訊息與輸入框包裹層 (.prox-chat-body-wrap)
        const bodyWrap = chatPanel.querySelector('.prox-chat-body-wrap');
        if (bodyWrap) {
          const bodyStyle = window.getComputedStyle(bodyWrap);
          if (bodyStyle.display === 'none' || bodyStyle.visibility === 'hidden') return true;
        }
      } catch (_) {}
    }

    // 3. 手機模式下（寬度 <= 900px）如果沒有 mobile-open class 即為縮合
    const isMobileScreen = typeof window !== 'undefined' && window.innerWidth <= 900;
    if (isMobileScreen && !chatPanel.classList.contains('mobile-open')) return true;

    return false;
  }

  let centerPrivateChatTimeout = null;

  function dismissCenterPrivateChatBox() {
    if (centerPrivateChatTimeout) {
      clearTimeout(centerPrivateChatTimeout);
      centerPrivateChatTimeout = null;
    }
    const card = document.getElementById('centerPrivateMsgCard');
    if (card) {
      card.classList.add('fade-out');
      setTimeout(() => {
        if (card.parentNode) card.parentNode.removeChild(card);
      }, 250);
    }
  }

  function dispatchChangeEvent(element) {
    if (!element || typeof element.dispatchEvent !== 'function') return;
    try {
      const evt = typeof Event !== 'undefined' ? new Event('change') : { type: 'change' };
      element.dispatchEvent(evt);
    } catch (_) {}
  }

  function openChatToReply(senderName, senderId) {
    const chatPanel = document.getElementById('proxChatPanel');
    const toggleChatBtn = document.getElementById('toggleChatCollapseBtn');
    const mobileChatBtn = document.getElementById('btnChatToggle');
    if (chatPanel) {
      chatPanel.classList.remove('chat-minimized');
      chatPanel.classList.add('mobile-open');
    }
    if (toggleChatBtn) toggleChatBtn.textContent = '➖ 縮合';
    if (mobileChatBtn) mobileChatBtn.classList.add('active');
    clearChatNotifyFlash();
    dismissCenterPrivateChatBox();

    let target = null;
    if (senderId && network) {
      target = network.getAllOtherPlayers().find((p) => p.id === senderId);
    }
    if (!target && senderName && network) {
      target = network.getAllOtherPlayers().find((p) => p.name === senderName);
    }
    if (target) {
      selectedTargetId = target.id;
    }

    const sendModeSel = document.getElementById('chatSendModeSelect');
    if (sendModeSel) {
      sendModeSel.value = 'private';
      dispatchChangeEvent(sendModeSel);
    }

    const chatInput = document.getElementById('proxChatInput');
    if (chatInput) {
      chatInput.focus();
      if (senderName) {
        chatInput.placeholder = `🔒 私訊給 @${senderName}... (Enter 送出)`;
      }
    }

    pushStatusLog('系統', `🔒 已開啟聊天並切換至與【${senderName || '對方'}】的私人密語模式`);
  }

  function showCenterPrivateChatBox(msg) {
    if (typeof document === 'undefined' || !document.body) return;

    // 清除既有卡片以防重疊
    const existing = document.getElementById('centerPrivateMsgCard');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    if (centerPrivateChatTimeout) {
      clearTimeout(centerPrivateChatTimeout);
      centerPrivateChatTimeout = null;
    }

    const card = document.createElement('div');
    card.id = 'centerPrivateMsgCard';
    card.className = 'center-private-msg-card';

    const safeName = escapeHtml(msg.senderName || '線上同事');
    const safeUnit = escapeHtml(msg.senderUnit || 'PP00');
    const safeText = escapeHtml(msg.text || '');
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    card.innerHTML = `
      <div class="cp-header">
        <div class="cp-title-wrap">
          <span class="cp-icon">🔒</span>
          <span class="cp-title">收到私人訊息</span>
          <span class="cp-badge">Private</span>
        </div>
        <button class="cp-close-btn" id="cpCloseBtn" title="關閉通知" aria-label="關閉">✕</button>
      </div>

      <div class="cp-sender-row">
        <div class="cp-sender-avatar">💬</div>
        <div class="cp-sender-meta">
          <div class="cp-sender-name">${safeName}</div>
          <div class="cp-sender-unit">${safeUnit}</div>
        </div>
        <div class="cp-time">${timeStr}</div>
      </div>

      <div class="cp-body">
        <p class="cp-text">${safeText}</p>
      </div>

      <div class="cp-actions">
        <button id="cpReplyBtn" class="cp-btn cp-btn-primary" type="button">
          <span>💬 立即開啟聊天回覆</span>
        </button>
        <button id="cpDismissBtn" class="cp-btn cp-btn-secondary" type="button">
          <span>關閉</span>
        </button>
      </div>

      <div class="cp-progress-bar">
        <div class="cp-progress-fill" id="cpProgressFill"></div>
      </div>
    `;

    document.body.appendChild(card);

    const closeBtn = card.querySelector('#cpCloseBtn');
    if (closeBtn) closeBtn.onclick = () => dismissCenterPrivateChatBox();

    const dismissBtn = card.querySelector('#cpDismissBtn');
    if (dismissBtn) dismissBtn.onclick = () => dismissCenterPrivateChatBox();

    const replyBtn = card.querySelector('#cpReplyBtn');
    if (replyBtn) {
      replyBtn.onclick = () => {
        openChatToReply(msg.senderName, msg.senderId);
      };
    }

    // 倒數 9 秒自動關閉，滑鼠移入時暫停計時
    let remainingMs = 9000;
    let timerStartedAt = gameNow();
    let isPaused = false;

    const startTimer = (duration) => {
      timerStartedAt = gameNow();
      centerPrivateChatTimeout = setTimeout(() => {
        dismissCenterPrivateChatBox();
      }, duration);
    };

    startTimer(remainingMs);

    card.addEventListener('mouseenter', () => {
      if (!isPaused && centerPrivateChatTimeout) {
        clearTimeout(centerPrivateChatTimeout);
        centerPrivateChatTimeout = null;
        remainingMs = Math.max(1000, remainingMs - (gameNow() - timerStartedAt));
        isPaused = true;
        const fill = card.querySelector('#cpProgressFill');
        if (fill) fill.style.animationPlayState = 'paused';
      }
    });

    card.addEventListener('mouseleave', () => {
      if (isPaused) {
        isPaused = false;
        const fill = card.querySelector('#cpProgressFill');
        if (fill) fill.style.animationPlayState = 'running';
        startTimer(remainingMs);
      }
    });
  }

  function triggerChatNotifyFlash(senderName, isPrivate = false) {
    if (isChatPanelCollapsed()) {
      const chatBtn = document.getElementById('btnChatToggle');
      if (chatBtn) {
        chatBtn.classList.add('chat-notify-flash');
      }
      const dot = document.getElementById('mobileChatNotifyDot');
      if (dot) {
        dot.classList.remove('hidden');
      }
    }
  }

  function clearChatNotifyFlash() {
    const chatBtn = document.getElementById('btnChatToggle');
    if (chatBtn) {
      chatBtn.classList.remove('chat-notify-flash');
    }
    const dot = document.getElementById('mobileChatNotifyDot');
    if (dot) {
      dot.classList.add('hidden');
    }
  }

  /**
   * 綁定「🏢 PP00 虛擬辦公室」與「💬 聊天視窗」展開/縮合切換（支援手機手遊風格小小 icon 呼叫）
   */
  function setupCollapsiblePanels() {
    const campusPanel = document.getElementById('leftGatherPanel');
    const toggleCampusBtn = document.getElementById('toggleCampusPanelBtn');
    const mobileRosterBtn = document.getElementById('btnCampusRosterToggle');
    const closeMobileCampusBtn = document.getElementById('closeCampusPanelMobileBtn');

    function toggleCampus(forceOpen = null) {
      if (!campusPanel) return;
      if (window.innerWidth <= 900) {
        const shouldOpen = forceOpen !== null ? forceOpen : !campusPanel.classList.contains('mobile-open');
        campusPanel.classList.toggle('mobile-open', shouldOpen);
        campusPanel.classList.remove('minimized');
        if (mobileRosterBtn) mobileRosterBtn.classList.toggle('active', shouldOpen);
      } else {
        const isMin = forceOpen !== null ? !forceOpen : campusPanel.classList.toggle('minimized');
        if (toggleCampusBtn) toggleCampusBtn.textContent = isMin ? '展開 ▶' : '◀ 縮合';
        if (mobileRosterBtn) mobileRosterBtn.classList.toggle('active', !isMin);
      }
    }

    if (toggleCampusBtn) toggleCampusBtn.addEventListener('click', () => toggleCampus());
    if (mobileRosterBtn) mobileRosterBtn.addEventListener('click', () => toggleCampus());
    if (closeMobileCampusBtn) closeMobileCampusBtn.addEventListener('click', () => toggleCampus(false));

    const chatPanel = document.getElementById('proxChatPanel');
    const toggleChatBtn = document.getElementById('toggleChatCollapseBtn');
    const mobileChatBtn = document.getElementById('btnChatToggle');

    function toggleChat(forceOpen = null) {
      if (!chatPanel) return;
      if (window.innerWidth <= 900) {
        const shouldOpen = forceOpen !== null ? forceOpen : !chatPanel.classList.contains('mobile-open');
        chatPanel.classList.toggle('mobile-open', shouldOpen);
        chatPanel.classList.toggle('chat-minimized', !shouldOpen);
        if (mobileChatBtn) mobileChatBtn.classList.toggle('active', shouldOpen);
        if (shouldOpen) {
          clearChatNotifyFlash();
          dismissCenterPrivateChatBox();
          // 手機模式下展開聊天視窗不自動 focus 輸入框，避免強制彈出手機虛擬鍵盤擠壓畫面
        }
      } else {
        const isMin = forceOpen !== null ? !forceOpen : chatPanel.classList.toggle('chat-minimized');
        if (toggleChatBtn) toggleChatBtn.textContent = isMin ? '➕ 展開' : '➖ 縮合';
        if (mobileChatBtn) mobileChatBtn.classList.toggle('active', !isMin);
        if (!isMin) {
          clearChatNotifyFlash();
          dismissCenterPrivateChatBox();
          document.getElementById('proxChatInput')?.focus();
        }
      }
    }

    if (toggleChatBtn) toggleChatBtn.addEventListener('click', () => toggleChat());
    if (mobileChatBtn) mobileChatBtn.addEventListener('click', () => toggleChat());
  }

  // =========================================================================
  // 5. 遊戲控制、置中互動技能、情境 Alt 快捷鍵與安全冷卻 (1200ms)
  // =========================================================================
  function setupTouchControls() {
    // 禁用遊戲畫面與虛擬搖桿長按彈出系統右鍵選單 / 複製貼上功能
    window.addEventListener('contextmenu', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('selectstart', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      e.preventDefault();
    });
    const more = document.getElementById('touchMoreBtn');
    more.addEventListener('click', () => {
      const expanded = document.getElementById('proximitySkillDock').classList.toggle('touch-expanded');
      more.setAttribute('aria-expanded', String(expanded));
      more.textContent = expanded ? '收合' : '更多';
    });
    const pad = document.getElementById('touchMovePad');
    if (pad) {
      pad.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); return false; }, { passive: false });
    }
    const knob = document.getElementById('touchMoveKnob');
    let activePointer = null;
    function clearMovement() {
      Object.keys(keys).forEach((key) => { keys[key] = false; });
      touchMove.x = 0; touchMove.y = 0;
      activePointer = null;
      knob.style.transform = 'translate(0, 0)';
    }
    function move(event) {
      if (event.pointerId !== activePointer) return;
      event.preventDefault();
      const rect = pad.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      const distance = Math.hypot(x, y);
      const radius = rect.width * 0.32;
      const factor = Math.min(1, radius / (distance || 1));
      touchMove.x = distance > 10 ? x / distance : 0;
      touchMove.y = distance > 10 ? y / distance : 0;
      knob.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
      lastUserActionAt = gameNow();
    }
    pad.addEventListener('pointerdown', (event) => {
      if (!isLoggedIn || activePointer !== null) return;
      activePointer = event.pointerId;
      pad.setPointerCapture(event.pointerId);
      move(event);
    });
    pad.addEventListener('pointermove', move);
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      pad.addEventListener(name, (event) => { if (event.pointerId === activePointer) clearMovement(); });
    }
    window.addEventListener('blur', clearMovement);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearMovement(); });
    document.addEventListener('focusin', (event) => {
      if (event.target.matches('input, textarea, select')) clearMovement();
    });
    document.getElementById('touchInteractBtn').addEventListener('click', () => {
      if (!isLoggedIn) return;
      const now = gameNow();
      if (now - lastInteractAt < (window.GATHER_CONFIG.security.interactCooldownMs || 250)) return;
      lastInteractAt = now; lastUserActionAt = now;
      tryInteractWithEnvironment();
    });
    const touchAtkBtn = document.getElementById('touchAttackBtn');
    if (touchAtkBtn) {
      touchAtkBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!isLoggedIn) return;
        lastUserActionAt = gameNow();
        triggerWeaponAttack();
      });
    }
    if (window.matchMedia('(max-width: 900px), (pointer: coarse)').matches) {
      document.getElementById('proxChatPanel').classList.add('chat-minimized');
      document.getElementById('toggleChatCollapseBtn').textContent = '➕ 展開';
    }
  }

  function flashSkillHotkeyButton(hotkeyNum) {
    const btn = document.querySelector(`.skill-btn[data-hotkey="${hotkeyNum}"]`);
    if (!btn) return;
    btn.classList.add('hotkey-flash');
    setTimeout(() => btn.classList.remove('hotkey-flash'), 220);
  }

  function setupGameControls() {
    const numberSkillMap = {
      '1': 'chat',
      '2': 'exchange',
      '3': 'wave',
      '4': 'zap',
      '5': 'cheer',
      '6': 'follow',
    };

    const altPoseMap = Object.fromEntries(window.GATHER_CONFIG.contextualActions.map((a) => [a.altKey, a.id]));

    window.addEventListener('keydown', (e) => {
      if (!isLoggedIn) return;
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }
      if (e.key === 'Escape') {
        const mcModal = document.getElementById('mcInventoryModal');
        if (mcModal && !mcModal.classList.contains('hidden')) {
          mcModal.classList.add('hidden');
          return;
        }
        const pickers = document.querySelectorAll('dialog.s2-picker');
        if (pickers.length > 0) {
          pickers.forEach(d => { try { d.close('cancel'); } catch(_) { d.remove(); } });
          return;
        }
        const wardrobe = document.getElementById('wardrobeModal');
        if (wardrobe && !wardrobe.classList.contains('hidden')) {
          wardrobe.classList.add('hidden');
          return;
        }
        const poseDropdown = document.getElementById('actionPoseDropdown');
        if (poseDropdown && !poseDropdown.classList.contains('hidden')) {
          poseDropdown.classList.add('hidden');
          return;
        }
        if (camera.overviewMode) {
          setOverviewMode(false);
          return;
        }
      }

      // 只要使用者有任何操作，刷新操作時間戳
      lastUserActionAt = gameNow();
      if (isAutoIdled && localPlayer.status === 'idle') {
        isAutoIdled = false;
        localPlayer.status = 'active';
        const sel = document.getElementById('selfStatusSelect');
        if (sel) sel.value = 'active';
        network.broadcastPacket('state_sync', { player: network.getPublicState() });
        pushStatusLog('系統', '恢復操作，切換為「🟢 上線」狀態');
        renderSidebarRoster();
      }

      const k = e.key.toLowerCase();

      // 🚨 檢查受夜間警衛管教拘禁狀態：無法動彈與反擊 10 秒
      if (localPlayer.isRestrained && gameNow() < (localPlayer.restrainedUntil || 0)) {
        if (
          ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'f', 'e', ' ', '1', '2', '3', '4', '5', '6'].includes(k) ||
          e.altKey
        ) {
          e.preventDefault();
          const leftSec = Math.max(1, Math.ceil((localPlayer.restrainedUntil - gameNow()) / 1000));
          const reason = localPlayer.beatingSession
            ? `正在接受【${localPlayer.beatingSession.npc.name}】連續毆打管教中`
            : '正在受夜間警衛管教拘禁中';
          showToast(`🚨 ${reason}，無法移動與反擊！（剩餘 ${leftSec} 秒）`, 'error');
          return;
        }
      }

      // 🚑 檢查重傷休養狀態：無法動彈
      if (localPlayer.isInjured && gameNow() < (localPlayer.injuredUntil || 0)) {
        if (
          ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'f', 'e', ' ', '1', '2', '3', '4', '5', '6'].includes(k) ||
          e.altKey
        ) {
          e.preventDefault();
          const remSec = Math.max(0, Math.ceil((localPlayer.injuredUntil - gameNow()) / 1000));
          const m = String(Math.floor(remSec / 60)).padStart(2, '0');
          const s = String(remSec % 60).padStart(2, '0');
          showToast(`🚑 身受重傷休養中（會議室 B 休養中，剩餘 ${m}:${s}）`, 'error');
          return;
        }
      }

      keys[k] = true;

      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
      }

      // Alt + 數字鍵：切換情境動作 (含 🛌 睡覺)
      if (e.altKey && altPoseMap[e.key]) {
        e.preventDefault();
        const now = gameNow();
        if (now - lastInteractAt < (window.GATHER_CONFIG?.security?.interactCooldownMs || 250)) return;
        lastInteractAt = now;
        startContextualAction(altPoseMap[e.key]);
        return;
      }

      // 按鍵 Z：開關情境動作下拉選單
      if (k === 'z' || e.code === 'KeyZ') {
        e.preventDefault();
        const dropdown = document.getElementById('actionPoseDropdown');
        if (dropdown) dropdown.classList.toggle('hidden');
        return;
      }

      // 數字鍵 1~6 觸發置中互動功能 (含 1200ms 安全冷卻)
      if (numberSkillMap[e.key] && !e.altKey && !e.ctrlKey) {
        e.preventDefault();
        const now = gameNow();
        if (now - lastInteractAt < (window.GATHER_CONFIG?.security?.interactCooldownMs || 250)) return;
        lastInteractAt = now;
        flashSkillHotkeyButton(e.key);
        triggerProximitySkill(numberSkillMap[e.key]);
        return;
      }

      if (k === 'm' || e.code === 'KeyM') {
        e.preventDefault();
        const modeSel = document.getElementById('chatSendModeSelect');
        if (modeSel) {
          modeSel.value = 'murmur';
          dispatchChangeEvent(modeSel);
        }
        const chatInp = document.getElementById('proxChatInput');
        if (chatInp) chatInp.focus();
      }
      // 熱鍵 F：揮動武器擊退 (冷卻縮短至 250ms，支援連續連發打擊)
      if (k === 'f' || e.code === 'KeyF') {
        e.preventDefault();
        triggerWeaponAttack();
      }
      // 熱鍵 I 或 B：開關物品欄檢視
      if (k === 'i' || k === 'b' || e.code === 'KeyI' || e.code === 'KeyB') {
        e.preventDefault();
        const modal = document.getElementById('mcInventoryModal');
        if (modal) {
          modal.classList.toggle('hidden');
          renderMinecraftInventoryUI();
        }
      }
      // 熱鍵 E：設備互動 / 踹門 (含 1200ms 安全冷卻)
      if (k === 'e' || e.code === 'KeyE') {
        e.preventDefault();
        const now = gameNow();
        if (now - lastInteractAt < (window.GATHER_CONFIG?.security?.interactCooldownMs || 250)) return;
        lastInteractAt = now;
        tryInteractWithEnvironment();
      }
      if (e.key === ' ') {
        localPlayer.jumpOffset = 15;
      }
    });

    window.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false;
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (!isLoggedIn) return;

      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const mm = getMinimapRect();
      if (mm.w > 0 && !camera.minimapHidden && sx >= mm.x && sx <= mm.x + mm.w && sy >= mm.y && sy <= mm.y + mm.h) {
        // 點擊雷達右上角 ✕ 關閉雷達（身受重傷休養中亦可關閉小地圖）
        if (sx >= mm.x + mm.w - 22 && sy <= mm.y + 22) {
          camera.minimapHidden = true;
          showCombatToast('園區雷達小地圖已關閉（點擊全景視角按鈕可重新開啟）');
          return;
        }
        // 若在小地圖非 ✕ 區域點擊導航，受傷時不可移動
        if (localPlayer.isInjured && gameNow() < (localPlayer.injuredUntil || 0)) {
          const remSec = Math.max(0, Math.ceil((localPlayer.injuredUntil - gameNow()) / 1000));
          const m = String(Math.floor(remSec / 60)).padStart(2, '0');
          const s = String(remSec % 60).padStart(2, '0');
          showToast(`🚑 身受重傷休養中（會議室 B 休養中，剩餘 ${m}:${s}）`, 'error');
          return;
        }
        const worldX = ((sx - mm.x) / mm.w) * window.WORLD_MAP.width;
        const worldY = ((sy - mm.y) / mm.h) * window.WORLD_MAP.height;
        cancelContextualAction();
        localPlayer.autoWalkTarget = { x: worldX, y: worldY, followId: null };
        pushStatusLog('系統', '已透過雷達設定導航目標點');
        if (camera.overviewMode) setOverviewMode(false);
        return;
      }

      // 🚑 檢查重傷休養狀態：無法點擊地面移動
      if (localPlayer.isInjured && gameNow() < (localPlayer.injuredUntil || 0)) {
        const remSec = Math.max(0, Math.ceil((localPlayer.injuredUntil - gameNow()) / 1000));
        const m = String(Math.floor(remSec / 60)).padStart(2, '0');
        const s = String(remSec % 60).padStart(2, '0');
        showToast(`🚑 身受重傷休養中（會議室 B 休養中，剩餘 ${m}:${s}）`, 'error');
        return;
      }

      lastUserActionAt = gameNow();
      if (isAutoIdled && localPlayer.status === 'idle') {
        isAutoIdled = false;
        localPlayer.status = 'active';
        const sel = document.getElementById('selfStatusSelect');
        if (sel) sel.value = 'active';
        network.broadcastPacket('state_sync', { player: network.getPublicState() });
        pushStatusLog('系統', '恢復操作，切換為「🟢 上線」狀態');
        renderSidebarRoster();
      }

      const clickX = sx / camera.zoom + camera.x;
      const clickY = sy / camera.zoom + camera.y;

      const others = network.getAllOtherPlayers();
      const clickedColleague = others.find(
        (p) => Math.hypot(p.x - clickX, p.y - 10 - clickY) < 30
      );
      if (clickedColleague) {
        selectedTargetId = clickedColleague.id;
        openColleagueProfileCard(clickedColleague);
        return;
      }

      cancelContextualAction();
      localPlayer.autoWalkTarget = { x: clickX, y: clickY, followId: null };
      vfxList.push({
        type: 'click_ring',
        x: clickX,
        y: clickY,
        radius: 4,
        maxRadius: 26,
        alpha: 0.95,
        color: '#38bdf8',
      });
    });

    // （Murmur 發送功能已全面整合至左下角聊天室窗 proxChatForm 中）

    document.querySelectorAll('[data-skill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        triggerProximitySkill(btn.dataset.skill);
        if (window.innerWidth <= 900) {
          const dock = document.getElementById('proximitySkillDock');
          if (dock) dock.classList.remove('touch-expanded');
          const more = document.getElementById('touchMoreBtn');
          if (more) {
            more.setAttribute('aria-expanded', 'false');
            more.textContent = '更多';
          }
        }
      });
    });

    function setOverviewMode(active) {
      camera.overviewMode = !!active;
      const btn = document.getElementById('toggleOverviewBtn');
      if (btn) {
        btn.classList.toggle('active', camera.overviewMode);
        const lbl = btn.querySelector('.game-btn-label');
        if (lbl) lbl.textContent = camera.overviewMode ? '關閉全景' : '全景視角';
        btn.title = camera.overviewMode ? '關閉全景俯瞰視角 (Esc)' : '切換全景俯瞰視角';
      }
      let closeBar = document.getElementById('overviewCloseBar');
      if (camera.overviewMode) {
        if (!closeBar) {
          closeBar = document.createElement('div');
          closeBar.id = 'overviewCloseBar';
          closeBar.className = 'overview-close-bar';
          closeBar.innerHTML = '<span>🗺️ 全景俯瞰模式</span><button type="button" class="overview-close-btn" id="btnExitOverview">✕ 關閉全景 (Esc)</button>';
          document.body.appendChild(closeBar);
          document.getElementById('btnExitOverview')?.addEventListener('click', () => setOverviewMode(false));
        }
        closeBar.style.display = 'flex';
      } else if (closeBar) {
        closeBar.style.display = 'none';
      }
      handleResize();
    }
    window.setOverviewMode = setOverviewMode;
    window.closeOverviewMode = () => setOverviewMode(false);

    const overviewBtn = document.getElementById('toggleOverviewBtn');
    if (overviewBtn) {
      overviewBtn.addEventListener('click', (e) => {
        if (camera.minimapHidden && !camera.overviewMode) {
          camera.minimapHidden = false;
        }
        setOverviewMode(!camera.overviewMode);
      });
    }

    const reloadOfficeBtn = document.getElementById('btnGameReload');
    if (reloadOfficeBtn) {
      reloadOfficeBtn.addEventListener('click', () => {
        triggerGameReload();
      });
    }

    const exitOfficeBtn = document.getElementById('btnExitOffice');
    if (exitOfficeBtn) {
      exitOfficeBtn.addEventListener('click', () => {
        if (confirm('確定要登出並返回入口網站嗎？')) {
          window.logoutAndLeaveOffice();
        }
      });
    }

    const closeCardBtn = document.getElementById('closeProfileCardBtn');
    if (closeCardBtn) {
      closeCardBtn.addEventListener('click', () => {
        const card = document.getElementById('colleagueProfileCard');
        if (card) card.classList.add('hidden');
        selectedTargetId = null;
        const sendModeSel = document.getElementById('chatSendModeSelect');
        if (sendModeSel && sendModeSel.value === 'private') {
          sendModeSel.value = 'chat';
          dispatchChangeEvent(sendModeSel);
        }
        const privateBtn = document.getElementById('profilePrivateChatBtn');
        if (privateBtn) privateBtn.classList.remove('active');
      });
    }
  }

  /**
   * 從 5 種隨機敘述中抽取並格式化
   */
  function pickSkillNarrative(skillKey, vars) {
    const list = window.GATHER_CONFIG.skillNarratives[skillKey] || [];
    const tpl = list[Math.floor(Math.random() * list.length)] || '';
    return tpl
      .replace(/\{target\}/g, escapeHtml(vars.target || '對方'))
      .replace(/\{myItem\}/g, escapeHtml(vars.myItem || ''))
      .replace(/\{theirItem\}/g, escapeHtml(vars.theirItem || '🍕'));
  }

  function getActiveTargetPlayer() {
    // 1. 若身邊有靠近的同仁（感應半徑內）：
    if (nearbyPlayers && nearbyPlayers.length > 0) {
      // 若手動選中的同仁正好就在身邊，精準對他互動
      if (selectedTargetId) {
        const nearSelected = nearbyPlayers.find((p) => p.id === selectedTargetId);
        if (nearSelected) return nearSelected;
      }
      // 否則，無論之前點選過誰，一律鎖定當前身邊距離最近的同仁（杜絕鎖定在前一人身上的問題）！
      return nearbyPlayers[0];
    }
    // 2. 身邊沒有人時，若有點選遠處目標（供自動尋路跟隨使用）
    if (selectedTargetId) {
      const found = network.getAllOtherPlayers().find((p) => p.id === selectedTargetId);
      if (found) return found;
    }
    return null;
  }

  function isNpcEntity(target) {
    if (!target) return false;
    return Boolean(
      target.isNpc ||
      (typeof target.id === 'string' && (target.id.startsWith('npc_') || target.id.includes('auntie') || target.id.includes('boss') || target.id.includes('guard') || target.id.includes('commander'))) ||
      (typeof target.name === 'string' && target.name.startsWith('NPC:')) ||
      (typeof target.unit === 'string' && target.unit.includes('NPC')) ||
      (network?.npcPlayers && network.npcPlayers.has(target.id))
    );
  }

  async function triggerProximitySkill(skillType, allowRemoteWave = false) {
    const now = gameNow();
    if (now - network.lastSkillAt < window.GATHER_CONFIG.security.skillCooldownMs) return;

    if (skillType === 'chat') {
      const drawer = document.getElementById('proxChatPanel');
      if (drawer) {
        drawer.classList.remove('chat-minimized');
        drawer.classList.add('mobile-open');
      }
      clearChatNotifyFlash();
      if (window.innerWidth > 900) {
        const input = document.getElementById('proxChatInput');
        if (input) input.focus();
      }
      return;
    }

    let target = getActiveTargetPlayer();
    const maxRadius = window.GATHER_CONFIG.security.proximityRadiusPx || 180;

    // 揮手特權：若身邊半徑內無目標，自動尋找視野內（520px）最近的 NPC 進行召喚
    if (!target && skillType === 'wave') {
      const all = network.getAllOtherPlayers();
      const npcs = all
        .filter(p => isNpcEntity(p) && !p.combatDown && !p.id.includes('ghost') && !p.isMob)
        .map(p => ({ p, dist: Math.hypot(p.x - localPlayer.x, p.y - localPlayer.y) }))
        .filter(item => item.dist <= 520)
        .sort((a, b) => a.dist - b.dist);
      if (npcs.length > 0) {
        target = npcs[0].p;
      }
    }

    if (!target) {
      showToast(`📡 身邊半徑 ${maxRadius}px 內沒有同仁或目標，請靠近後再互動！`, 'info');
      return;
    }

    const dist = Math.hypot(target.x - localPlayer.x, target.y - localPlayer.y);

    // 規定：交換禮物、揮手、靜電戳、乾杯要在指定的半徑範圍內才可以生效，避免遠距觸發
    if (dist > maxRadius) {
      if (skillType === 'wave' && isNpcEntity(target) && dist <= 550) {
        // 允許在視野範圍內（550px）遠距揮手召喚 NPC 靠近！
      } else if (skillType === 'follow') {
        showToast(`🏃 距離 <b>${escapeHtml(target.name)}</b> 較遠，正在自動跟隨走向他身邊...`, 'info');
        walkToPlayer(target.id);
        return;
      } else {
        showToast(`⚠️ 距離【${escapeHtml(target.name)}】過遠（${Math.round(dist)}px > 半徑 ${maxRadius}px），需走近身邊才能生效！`, 'error');
        return;
      }
    }

    network.lastSkillAt = now;
    addExp(15);

    switch (skillType) {
      case 'exchange': {
        if (isNpcEntity(target)) {
          // 檢查是否為幽靈或怪物
          const isGhost = target.id.includes('ghost') || target.role === 'ghost';
          const isMob = target.isMob || target.id.startsWith('mob_') || target.templateId;
          if (isGhost) {
            showToast('👻 幽靈無法進行禮物交換！', 'error');
            return;
          }
          if (isMob) {
            showToast('👾 怪物兇猛，無法進行禮物交換！', 'error');
            return;
          }

          // 取得玩家背包/裝備中的非外觀道具（不含頭飾服裝）
          let chosenItem = null;
          let chosenSlot = null;
          let chosenFromBag = false;

          if (season.enabled && season.client?.snapshot?.player) {
            const items = season.client.snapshot.player.items.filter(i => i && i.category !== 'outfit');
            if (!items.length) {
              showToast('🎒 你身上沒有可交換的道具或武器（不含頭飾服裝），無法使用！', 'error');
              return;
            }
            const activeItem = localPlayer.equippedSlots[localPlayer.activeEquipIndex];
            if (activeItem && activeItem.category !== 'outfit') {
              chosenItem = activeItem;
            } else {
              chosenItem = items[0];
            }
          } else {
            const activeIdx = localPlayer.activeEquipIndex;
            if (localPlayer.equippedSlots[activeIdx] && localPlayer.equippedSlots[activeIdx].category !== 'outfit') {
              chosenItem = localPlayer.equippedSlots[activeIdx];
              chosenSlot = activeIdx;
            } else {
              const eqIdx = localPlayer.equippedSlots.findIndex(i => i && i.category !== 'outfit');
              if (eqIdx !== -1) {
                chosenItem = localPlayer.equippedSlots[eqIdx];
                chosenSlot = eqIdx;
              } else {
                const invIdx = (localPlayer.inventory || []).findIndex(i => i && i.category !== 'outfit');
                if (invIdx !== -1) {
                  chosenItem = localPlayer.inventory[invIdx];
                  chosenFromBag = true;
                }
              }
            }
          }

          if (!chosenItem) {
            showToast('🎒 你身上沒有可交換的道具或武器（不含頭飾服裝），無法使用！', 'error');
            return;
          }

          // 依使用者指示降低 NPC 交換禮物機率 (50% 願意交換，50% 婉拒)
          const acceptTrade = Math.random() < 0.50;
          if (!acceptTrade) {
            target.jumpOffset = 10;
            target.emote = { emoji: '😅', expiresAt: now + 3500 };
            const declineQuotes = [
              '哎呀，我身上現在沒有適合給你的東西呢，下次再來換吧！',
              '這個你留著用吧！我手邊沒有多的回禮能給你呢～',
              '謝謝你的好意！但公發物資吃緊，改天再來交換喔！'
            ];
            const declineText = declineQuotes[Math.floor(Math.random() * declineQuotes.length)];
            target.murmur = {
              text: declineText,
              mood: 'idea',
              createdAt: now,
              expiresAt: now + 5000,
            };
            showToast(`😅 【${escapeHtml(target.name)}】目前手邊沒有合適的回禮，委婉婉拒了這次交換！`, 'info');
            pushStatusLog(target.name, `😅 苦笑說：「${declineText}」`);
            return;
          }

          // NPC 隨機回贈道具池 (不含頭飾服裝)
          const npcGiftPool = [
            { id: 'coffee', name: '熱咖啡', emoji: '☕', category: 'item', maxDurability: 1 },
            { id: 'boba', name: '波霸珍奶', emoji: '🧋', category: 'item', maxDurability: 1 },
            { id: 'pizza', name: '美味披薩', emoji: '🍕', category: 'item', maxDurability: 1 },
            { id: 'kuaikuai', name: '綠乖乖', emoji: '🟢', category: 'item', maxDurability: 1 },
            { id: 'wrench', name: '工程板手', emoji: '🔧', category: 'weapon', maxDurability: 3 },
            { id: 'duck', name: '黃色小鴨', emoji: '🦆', category: 'weapon', maxDurability: 3 },
            { id: 'ic_pkg', name: '封裝晶片', emoji: '💾', category: 'weapon', maxDurability: 3 },
            { id: 'keyboard', name: '機械鍵盤', emoji: '⌨️', category: 'weapon', maxDurability: 3 },
            { id: 'bench', name: '折疊鐵椅', emoji: '🪑', category: 'weapon', maxDurability: 3 },
          ];
          const returnItemMeta = npcGiftPool[Math.floor(Math.random() * npcGiftPool.length)];

          let receivedItem = returnItemMeta;
          if (season.enabled) {
            try {
              const res = await seasonSend('npc_exchange', { uid: chosenItem.uid, npcId: target.id });
              if (res && res.item) receivedItem = res.item;
            } catch (_) {
              if (season.client?.snapshot?.player) {
                const p = season.client.snapshot.player;
                p.items = p.items.filter(i => i.uid !== chosenItem.uid);
                p.items.push({ ...returnItemMeta, uid: 'ex_' + Date.now(), slot: chosenItem.slot });
                applySeasonSnapshot(season.client.snapshot);
              }
            }
          } else {
            if (chosenSlot !== null) {
              localPlayer.equippedSlots[chosenSlot] = null;
            } else if (chosenFromBag) {
              const idx = localPlayer.inventory.indexOf(chosenItem);
              if (idx !== -1) localPlayer.inventory.splice(idx, 1);
            }
            receivedItem = addItemToInventory(returnItemMeta, true);
          }

          // 雙向物品投擲動畫
          ecosystem.addThrownItem(localPlayer.x, localPlayer.y - 20, target.x, target.y - 20, chosenItem.emoji || '🎁');
          ecosystem.addThrownItem(target.x, target.y - 20, localPlayer.x, localPlayer.y - 20, receivedItem.emoji);

          target.heldItem = chosenItem.emoji || '🎁';
          target.jumpOffset = 14;
          target.emote = { emoji: '🎁', expiresAt: now + 3500 };
          target.murmur = {
            text: `謝謝你的禮物！這件【${receivedItem.name}】送你當回禮，收下吧！`,
            mood: 'idea',
            createdAt: now,
            expiresAt: now + 5000,
          };

          syncPlayerActiveWeaponState();
          updateSelfHudCard();
          savePersistentState();

          showToast(`🎁 與【${escapeHtml(target.name)}】交換了禮物！獲得【${receivedItem.emoji} ${receivedItem.name}】！`, 'join');
          pushStatusLog('系統', `🎁 與【${target.name}】交換禮物：給予【${chosenItem.name || '道具'}】，獲得【${receivedItem.emoji} ${receivedItem.name}】！`);
          break;
        }

        // 對玩家：維持原本設計
        if(season.enabled){const q=season.client.snapshot.players.find(p=>p.clientId===target.id),i=getActiveEquippedItem();if(!q||!i){showCombatToast('請選擇線上同事並先裝備要贈送的道具');return;}seasonSend('gift',{target:q.id,uid:i.uid});return;}
        const myOldItem = localPlayer.heldItem;
        const theirOldItem = target.heldItem || getRandomWeaponMeta().emoji;
        ecosystem.addThrownItem(localPlayer.x, localPlayer.y - 20, target.x, target.y - 20, myOldItem);
        ecosystem.addThrownItem(target.x, target.y - 20, localPlayer.x, localPlayer.y - 20, theirOldItem);

        addItemToInventory(theirOldItem, true);
        target.heldItem = myOldItem;
        updateSelfHudCard();
        renderSidebarRoster();

        network.broadcastPacket('skill_action', {
          skill: 'exchange',
          targetId: target.id,
          senderName: localPlayer.name,
          itemGiven: myOldItem,
          fromX: localPlayer.x,
          fromY: localPlayer.y,
        });

        const narrative = pickSkillNarrative('exchange', {
          target: target.name,
          myItem: myOldItem,
          theirItem: theirOldItem,
        });
        showToast(narrative, 'join');
        break;
      }
      case 'wave': {
        localPlayer.emote = { emoji: '👋', expiresAt: now + 3500 };
        localPlayer.jumpOffset = 10;
        vfxList.push({
          type: 'click_ring',
          x: localPlayer.x,
          y: localPlayer.y - 12,
          radius: 8,
          maxRadius: 95,
          alpha: 1,
          color: '#38bdf8',
        });
        network.broadcastPacket('skill_action', {
          skill: 'wave',
          targetId: target.id,
          senderName: localPlayer.name,
          fromX: localPlayer.x,
          fromY: localPlayer.y,
        });

        if (isNpcEntity(target)) {
          // 對 NPC 揮手：召喚對方走過來跟你講話一次，完成後結束
          target.emote = { emoji: '👋', expiresAt: now + 4000 };
          target.jumpOffset = 12;

          const savedWaypoints = target.waypoints ? [...target.waypoints] : [];
          const savedIndex = target.currentWaypointIndex || 0;

          const npcQuotes = {
            npc_vp_boss: [
              '找我有什麼事？專案進度有按照時程推進嗎？',
              '有話快說，待會我還要去巡視各產線機台！',
              '嗯？來得正好，這份產能報告你看過了嗎？'
            ],
            npc_dir_pp00: [
              '機台良率正常嗎？有任何異常立刻回報！',
              '找我？是不是測試機台又有報警了？',
              '辛苦了！記得保持測試機台綠燈常亮！'
            ],
            npc_guard: [
              '園區巡邏中，有發現可疑人員或怪物嗎？',
              '站住！請出示識別證……喔是你啊，注意安全！',
              '提高警覺，夜間會有幽靈出沒！'
            ],
            npc_bird_commander: [
              '啾～長官召喚！請問有何作戰指示？',
              '隨時保持警惕，別被逮到！啾！',
              '報告！鳥人中隊隨時待命支援！'
            ],
            default: [
              '哎呀！找我有什麼事嗎？今天工作加油喔！',
              '你好你好，找我聊兩句嗎？',
              '辛苦啦，記得適當休息喝杯水！'
            ]
          };
          const isAuntie = target.id.includes('auntie') || (target.name && target.name.includes('阿姨'));
          const auntieQuotes = [
            '哎呀找阿姨嗎？這裡地板剛拖好，小心別滑倒喔！',
            '小夥子真有禮貌！工作辛苦了，喝杯水吧！',
            '找阿姨聊聊？廁所衛生紙我都補齊了喔！'
          ];
          const list = isAuntie ? auntieQuotes : (npcQuotes[target.id] || npcQuotes.default);
          const quote = list[Math.floor(Math.random() * list.length)];

          showToast(`👋 向【${escapeHtml(target.name)}】揮手示意，對方正快步朝你走來...`, 'info');
          pushStatusLog(localPlayer.name, `👋 向【${target.name}】揮手召喚！`);

          // 設定召喚目標與回呼
          target.actionState = null;
          target.actionUntil = 0;
          target.isMoving = true;
          target.summonTarget = { x: localPlayer.x, y: localPlayer.y, getX: () => localPlayer.x, getY: () => localPlayer.y };
          target.summonedUntil = now + 9500;
          target.onSummonArrival = (npc) => {
            npc.jumpOffset = 14;
            npc.emote = { emoji: '💬', expiresAt: gameNow() + 4500 };
            npc.murmur = {
              text: quote,
              mood: 'idea',
              createdAt: gameNow(),
              expiresAt: gameNow() + 6000,
            };
            pushStatusLog(npc.name, `💬 走上前對你說：「${quote}」`);
            showToast(`💬 <b>${escapeHtml(npc.name)}</b> 走來對你說：「${quote}」`, 'info');

            setTimeout(() => {
              if (savedWaypoints.length > 0) {
                npc.waypoints = savedWaypoints;
                npc.currentWaypointIndex = savedIndex;
              }
            }, 4500);
          };
        } else {
          // 對玩家：維持原本設計
          const narrative = pickSkillNarrative('wave', { target: target.name });
          showToast(narrative, 'info');
        }
        break;
      }
      case 'zap': {
        vfxList.push({
          type: 'lightning',
          x1: localPlayer.x,
          y1: localPlayer.y - 18,
          x2: target.x,
          y2: target.y - 18,
          ticksLeft: 22,
        });
        target.jumpOffset = 18;

        if (isNpcEntity(target) && !target.id.includes('ghost') && !target.isMob) {
          // 對 NPC 靜電戳：有一定機率冒愛心說三句喜歡你並送禮物；一定機率覺得很噁心並追著攻擊你一次
          // 依使用者指示提高靜電戳憤怒衝刺追擊機率 (80% 憤怒追擊，20% 告白)
          const rollLove = Math.random() < 0.20;
          if (rollLove) {
            // 冒愛心 ❤️ 喜歡你並送你禮物
            target.emote = { emoji: '💖', expiresAt: now + 4000 };
            localPlayer.emote = { emoji: '❤️', expiresAt: now + 3000 };
            spawnConfetti(target.x, target.y - 25);

            const loveQuotes = [
              '哎呀～被你電得小鹿亂撞，我的心跳頻率都超過 1000MHz 了啦！💖',
              '這難道就是傳說中的觸電感覺嗎？這份心意你一定要收下！🎁',
              '討厭啦～幹嘛突然電人家！這個小禮物送你，不許跟別人說喔！🥰'
            ];
            const quote = loveQuotes[Math.floor(Math.random() * loveQuotes.length)];
            target.murmur = {
              text: quote,
              mood: 'idea',
              createdAt: now,
              expiresAt: now + 6000,
            };

            const giftPool = [
              { id: 'coffee', name: '熱咖啡', emoji: '☕', category: 'item', maxDurability: 1 },
              { id: 'boba', name: '波霸珍奶', emoji: '🧋', category: 'item', maxDurability: 1 },
              { id: 'pizza', name: '美味披薩', emoji: '🍕', category: 'item', maxDurability: 1 },
              { id: 'kuaikuai', name: '綠乖乖', emoji: '🟢', category: 'item', maxDurability: 1 },
              { id: 'wrench', name: '工程板手', emoji: '🔧', category: 'weapon', maxDurability: 3 },
              { id: 'duck', name: '黃色小鴨', emoji: '🦆', category: 'weapon', maxDurability: 3 },
              { id: 'ic_pkg', name: '封裝晶片', emoji: '💾', category: 'weapon', maxDurability: 3 },
              { id: 'keyboard', name: '機械鍵盤', emoji: '⌨️', category: 'weapon', maxDurability: 3 },
              { id: 'bench', name: '折疊鐵椅', emoji: '🪑', category: 'weapon', maxDurability: 3 },
            ];
            const giftMeta = giftPool[Math.floor(Math.random() * giftPool.length)];
            ecosystem.addThrownItem(target.x, target.y - 20, localPlayer.x, localPlayer.y - 20, giftMeta.emoji);

            let added = giftMeta;
            if (season.enabled) {
              try {
                const res = await seasonSend('npc_love_gift', { npcId: target.id });
                if (res && res.item) added = res.item;
              } catch (_) {
                if (season.client?.snapshot?.player) {
                  season.client.snapshot.player.items.push({ ...giftMeta, uid: 'love_' + Date.now(), slot: null });
                  applySeasonSnapshot(season.client.snapshot);
                }
              }
            } else {
              added = addItemToInventory(giftMeta, true);
            }

            updateSelfHudCard();
            savePersistentState();

            showToast(`💖 【${escapeHtml(target.name)}】被你電得冒愛心！「${quote}」並送你【${added.emoji} ${added.name}】！`, 'join');
            pushStatusLog(target.name, `💖 臉紅心跳地對你說：「${quote}」，贈送【${added.emoji} ${added.name}】！`);
          } else {
            // 覺得你很噁心 🤢 追著你攻擊一次，完成後結束
            target.emote = { emoji: '🤢', expiresAt: now + 4000 };
            const disgustQuotes = {
              npc_vp_boss: '成何體統！竟敢在辦公室動手動腳，看我不教訓你！😡',
              npc_dir_pp00: '太噁心了！嚴禁職場騷擾，吃我一記維修板手！💥',
              npc_guard: '好噁心！竟敢襲警動手動腳，吃我一棒！⚡',
              npc_bird_commander: '嘎！非禮啊！軍紀嚴明，看我啄你！💢',
              default: '哎唷好噁心喔！離我遠一點，看我的厲害！💢'
            };
            const isAuntie = target.id.includes('auntie') || (target.name && target.name.includes('阿姨'));
            const disgustQuote = isAuntie ? '哎唷好噁心喔！離阿姨遠一點，吃我一記掃把！💢' : (disgustQuotes[target.id] || disgustQuotes.default);

            target.murmur = {
              text: disgustQuote,
              mood: 'fire',
              createdAt: now,
              expiresAt: now + 5000,
            };
            showToast(`🤢 【${escapeHtml(target.name)}】覺得你很噁心！「${disgustQuote}」憤怒衝上前揮擊！`, 'error');
            pushStatusLog(target.name, `🤢 怒斥：「${disgustQuote}」，衝上前追擊反擊你一次！`);

            // 設定衝刺追擊目標與追到後攻擊回呼
            target.actionState = null;
            target.actionUntil = 0;
            target.isMoving = true;
            target.chaseTarget = { x: localPlayer.x, y: localPlayer.y, getX: () => localPlayer.x, getY: () => localPlayer.y };
            target.chaseUntil = now + 4500;
            target.onChaseArrival = (npc) => {
              npc.weaponSwing = { ticksLeft: 16, totalTicks: 16, startedAt: gameNow() };
              npc.emote = { emoji: '😤', expiresAt: gameNow() + 3000 };
              vfxList.push({ type: 'sparks', x: localPlayer.x, y: localPlayer.y });
              const kx = localPlayer.x > npc.x ? 38 : -38;
              localPlayer.knockback = { vx: kx, vy: 0, ticks: 12 };
              showCombatToast(`💥 遭【${npc.name}】憤怒反擊擊退！`, 'error');
            };
          }
          break;
        }

        // 對玩家：維持原本設計
        target.emote = { emoji: '⚡', expiresAt: now + 3000 };
        network.broadcastPacket('skill_action', {
          skill: 'zap',
          targetId: target.id,
          senderName: localPlayer.name,
          fromX: localPlayer.x,
          fromY: localPlayer.y,
        });
        const narrative = pickSkillNarrative('zap', { target: target.name });
        showToast(narrative, 'security');
        if (target.isNpc && target.murmurs) {
          target.murmur = {
            text: target.murmurs[Math.floor(Math.random() * target.murmurs.length)],
            mood: 'fire',
            createdAt: now,
            expiresAt: now + window.GATHER_CONFIG.security.murmurTtlMs,
          };
        }
        break;
      }
      case 'cheer': {
        localPlayer.jumpOffset = 15;
        target.jumpOffset = 15;
        localPlayer.emote = { emoji: '🍻', expiresAt: now + 4000 };
        target.emote = { emoji: '🍻', expiresAt: now + 4000 };
        localPlayer.actionState = 'victory_dance';
        spawnConfetti(localPlayer.x, localPlayer.y - 25);
        spawnConfetti(target.x, target.y - 25);

        network.broadcastPacket('skill_action', {
          skill: 'cheer',
          targetId: target.id,
          senderName: localPlayer.name,
          fromX: localPlayer.x,
          fromY: localPlayer.y,
        });

        if (isNpcEntity(target)) {
          // 對 NPC 乾杯：20% 機率讓玩家或對方喝醉暈倒 2 秒，並且掉出道具
          // 依使用者指示降低酒醉掉道具機率 (10% 機率喝醉，且醉倒時僅 40% 機率掉落道具)
          if (Math.random() < 0.10) {
            const isPlayerDrunk = Math.random() < 0.50;
            const willDrop = Math.random() < 0.40;
            if (isPlayerDrunk) {
              // 玩家喝醉暈倒 2 秒並掉落道具
              localPlayer.actionState = 'sleep_bed';
              localPlayer.stunnedUntil = now + 2000;
              localPlayer.emote = { emoji: '😵‍💫', expiresAt: now + 2500 };
              updatePoseLabelUI();

              let droppedItem = null;
              if (willDrop && season.enabled && season.client?.snapshot?.player) {
                const nonOutfits = season.client.snapshot.player.items.filter(i => i && i.category !== 'outfit');
                if (nonOutfits.length > 0) {
                  droppedItem = nonOutfits[0];
                  seasonSend('drop', { uid: droppedItem.uid }).catch(() => {});
                }
              } else if (willDrop) {
                const myItems = (localPlayer.equippedSlots || []).filter(i => i && i.category !== 'outfit').concat((localPlayer.inventory || []).filter(i => i && i.category !== 'outfit'));
                if (myItems.length > 0) {
                  const idx = localPlayer.activeEquipIndex;
                  if (localPlayer.equippedSlots[idx] && localPlayer.equippedSlots[idx].category !== 'outfit') {
                    droppedItem = localPlayer.equippedSlots[idx];
                    localPlayer.equippedSlots[idx] = null;
                  } else {
                    const invIdx = localPlayer.inventory.findIndex(i => i && i.category !== 'outfit');
                    if (invIdx !== -1) {
                      droppedItem = localPlayer.inventory[invIdx];
                      localPlayer.inventory.splice(invIdx, 1);
                    }
                  }
                }
                if (droppedItem) {
                  ecosystem.groundItems.push({
                    ...droppedItem,
                    uid: 'drunk_drop_' + now + '_' + Math.random().toString(36).slice(2, 6),
                    x: localPlayer.x + 30,
                    y: localPlayer.y,
                    dropY: 0,
                    pickupAfter: now + 1500,
                    combatDrop: true
                  });
                  syncPlayerActiveWeaponState();
                  updateSelfHudCard();
                  savePersistentState();
                }
              }

              showCombatToast(`😵‍💫 乾杯酒勁太強！你喝醉倒地暈眩 2 秒${droppedItem ? `，掉落【${droppedItem.emoji || '🎁'} ${droppedItem.name}】` : ''}！`, 'error');
              pushStatusLog('系統', `😵‍💫 乾杯過猛！你喝醉倒地暈眩 2 秒${droppedItem ? `，手中的【${droppedItem.name || '道具'}】不小心滾落到地上` : ''}！`);

              setTimeout(() => {
                if (localPlayer.actionState === 'sleep_bed') {
                  localPlayer.actionState = null;
                  localPlayer.injuredX = null;
                  localPlayer.injuredY = null;
                  updatePoseLabelUI();
                }
              }, 2000);
            } else {
              // NPC 喝醉暈倒 2 秒並掉落道具
              target.actionState = 'sleep_bed';
              target.stunnedUntil = now + 2500;
              target.actionUntil = now + 2500;
              target.isMoving = false;
              target.emote = { emoji: '😵‍💫', expiresAt: now + 2500 };
              target.murmur = { text: '這酒……好烈……我不行了……嗝！', mood: 'fire', createdAt: now, expiresAt: now + 3500 };

              const npcDropPool = [
                { id: 'coffee', name: '熱咖啡', emoji: '☕', category: 'item', maxDurability: 1 },
                { id: 'boba', name: '波霸珍奶', emoji: '🧋', category: 'item', maxDurability: 1 },
                { id: 'pizza', name: '美味披薩', emoji: '🍕', category: 'item', maxDurability: 1 },
                { id: 'kuaikuai', name: '綠乖乖', emoji: '🟢', category: 'item', maxDurability: 1 },
                { id: 'wrench', name: '工程板手', emoji: '🔧', category: 'weapon', maxDurability: 3 },
                { id: 'duck', name: '黃色小鴨', emoji: '🦆', category: 'weapon', maxDurability: 3 },
                { id: 'keyboard', name: '機械鍵盤', emoji: '⌨️', category: 'weapon', maxDurability: 3 },
                { id: 'bench', name: '折疊鐵椅', emoji: '🪑', category: 'weapon', maxDurability: 3 },
              ];
              let dropped = null;
              if (willDrop) {
                dropped = npcDropPool[Math.floor(Math.random() * npcDropPool.length)];
                if (season.enabled) {
                  seasonSend('npc_cheer_drop', { x: target.x + 25, y: target.y }).catch(() => {});
                }
                ecosystem.groundItems.push({
                  ...dropped,
                  uid: 'npc_drop_' + now + '_' + Math.random().toString(36).slice(2, 6),
                  x: target.x + 25,
                  y: target.y,
                  dropY: 0,
                  pickupAfter: now + 500,
                  combatDrop: true
                });
              }

              showCombatToast(`🍻 【${escapeHtml(target.name)}】不勝酒力喝醉倒地 2 秒！${dropped ? `身上掉落了【${dropped.emoji} ${dropped.name}】！` : ''}`, 'join');
              pushStatusLog(target.name, `😵‍💫 喝得滿臉通紅倒地 2 秒${dropped ? `，口袋滾落出【${dropped.emoji} ${dropped.name}】！快去撿！` : '！'}`);

              setTimeout(() => {
                if (target.actionState === 'sleep_bed') {
                  target.actionState = null;
                  target.stunnedUntil = 0;
                }
              }, 2500);
            }
          } else {
            showToast(`🍻 與【${escapeHtml(target.name)}】痛快乾杯！大家酒量都很好！`, 'join');
          }
        } else {
          // 對玩家：維持原本設計
          const narrative = pickSkillNarrative('cheer', { target: target.name });
          showToast(narrative, 'join');
        }
        break;
      }
      case 'follow': {
        walkToPlayer(target.id, true);
        break;
      }
    }
  }

  /**
   * ⚔️ 隨機武器與裝備揮擊系統 (熱鍵 [F] 或按鈕觸發)
   * 規則：
   * 1. 必須至少裝備 1 個道具於 3 格裝備槽中，否則無法使用擊退功能
   * 2. 依照不同裝備道具給予對應的「擊退敵人經驗值 (knockbackExp)」與「裝備經驗加成 (expBonusPct)」
   * 3. 擊退獲得的道具獎勵直接進入玩家裝備/持有物品欄，絕不掉落在地上
   * 4. 每個裝備道具擊退敵人滿 3 次後，耐久度歸零自動損毀消失
   * 5. 若攻擊 VP 大老闆或 PP00 處長：觸發閉門訓話 10 秒並發出 5 句專屬 MURMUR 之一！
   * 6. 若被「🦩 鳥人指揮官」抓進會議室，揮擊擊退他可立即解鎖會議室大門脫困
   */
  /**
   * 🥊 攻擊 VP 大老闆、PP00 處長或打掃阿姨時觸發的 50% 專屬抓去辦公室/打掃廁所連續毆打機制
   * ⚠️ 連續毆打純屬搞笑動畫，絕對不會造成使用者重傷（isInjured 保持 false）
   */
  let lastBeatingAnnouncedAt = 0;
  function triggerBossOrAuntieBeating(npc, role) {
    const now = gameNow();
    const durationMs = 8000;
    let targetRoom = 'vp_room';
    let roomX = 380;
    let roomY = 310;
    let weaponEmoji = '🏌️‍♂️';
    let scoldLines = window.GATHER_CONFIG?.bossScoldDialogues?.vp || ['進辦公室好好反省！'];
    let introMsg = `🚨 惹怒 VP 大老闆【${npc.name}】！被抓進 VP 室連續痛揍訓話！`;

    if (role === 'dir') {
      targetRoom = 'dir_pp00';
      roomX = 755;
      roomY = 310;
      weaponEmoji = '📊';
      scoldLines = window.GATHER_CONFIG?.bossScoldDialogues?.director_pp00 || ['客退報告給我看仔細！'];
      introMsg = `🚨 敢敲 PP00 處長【${npc.name}】？被抓進處長室連續痛揍訓話！`;
    } else if (role === 'auntie') {
      targetRoom = 'restroom';
      roomX = 2340;
      roomY = 820;
      weaponEmoji = '🧹';
      scoldLines = window.GATHER_CONFIG?.bossScoldDialogues?.cleaner_auntie || ['吃阿姨的黃金拖把連續百烈擊！'];
      introMsg = `🚨 連打掃阿姨【${npc.name}】都敢惹？被拖進廁所黃金拖把連續毆打！`;
    } else if (role === 'guard') {
      targetRoom = 'pantry';
      roomX = 2360;
      roomY = 350;
      weaponEmoji = window.GATHER_CONFIG?.guardWeaponEmoji || '🏏';
      scoldLines = window.GATHER_CONFIG?.bossScoldDialogues?.guard || [
        '敢在辦公區鬧事？進茶水間好好清醒清醒！',
        '園區保全紀律不容挑戰！吃我警棍百裂擊！',
        '敢打警衛？在茶水間反省冷靜一下！'
      ];
      introMsg = `🚨 敢攻擊園區警衛【${npc.name}】？被拉到茶水間痛毆！`;
      localPlayer.lightInjuredUntil = now + 60000;
      showCombatToast('🩹 遭警衛痛毆造成輕微挫傷：移速降低 30% (持續 60 秒)', 'error');
    }

    localPlayer.x = roomX;
    localPlayer.y = roomY;
    npc.x = roomX + 32;
    npc.y = roomY;
    localPlayer.autoWalkTarget = null;
    localPlayer.knockback = null;

    localPlayer.isRestrained = true;
    localPlayer.restrainedUntil = now + durationMs;
    localPlayer.isInjured = false; // ⚠️ 不會造成使用者重傷，只是動畫的一種
    localPlayer.actionState = 'cry';

    window.MEETING_LOCK_STATE = {
      lockedUntil: now + durationMs,
      roomId: targetRoom,
      reason: `${npc.name} 連續毆打管教中`,
      notifiedRelease: false,
    };

    npc.isBerserk = true;
    npc.berserkUntil = now + durationMs;
    const scoldLine = scoldLines[Math.floor(Math.random() * scoldLines.length)];
    npc.murmur = {
      text: scoldLine,
      mood: 'fire',
      createdAt: now,
      expiresAt: now + durationMs,
    };
    npc.emote = { emoji: '💢', expiresAt: now + durationMs };

    localPlayer.beatingSession = {
      npc,
      role,
      targetRoom,
      weaponEmoji,
      until: now + durationMs,
      startedAt: now,
    };

    if (now - lastBeatingAnnouncedAt > 9000) {
      lastBeatingAnnouncedAt = now;
      showToast(introMsg, 'error');
      pushCombatLog(npc.name, `💢 ${scoldLine}`);
      pushStatusLog(npc.name, `💢 ${scoldLine}`);
      if (network) {
        network.broadcastPacket('status_log', {
          senderName: npc.name,
          text: `💢 ${scoldLine}`,
        });
      }
    }
    if (network) {
      network.broadcastPacket('state_sync', { player: network.getPublicState() });
    }
  }

  function triggerWeaponAttack() {
    if(season.enabled){
      if(gameNow()-lastWeaponAttackAt<300||!isLoggedIn||season.attacking)return;
      const effects=season.effects,now=gameNow();
      if(['injuredUntil','lockedUntil','stunnedUntil','ghostUntil'].some(k=>effects[k]>now)){showCombatToast('目前狀態無法攻擊');return;}
      const w=getActiveEquippedItem()||FIST_WEAPON;
      const isFist=!!w.isFist;
      const cd=isFist?1000:300;
      if(now-lastWeaponAttackAt<cd||!isLoggedIn||season.attacking){
        if(isFist&&now-lastWeaponAttackAt<cd){
          showCombatToast(`👊 徒手揮拳冷卻中（剩餘 ${((cd-(now-lastWeaponAttackAt))/1000).toFixed(1)} 秒）`);
        }
        return;
      }
      lastWeaponAttackAt=now;season.attacking=true;
      localPlayer.weaponSwing={emoji:w.emoji,isFist,ticksLeft:18,totalTicks:18,startedAt:now,duration:300};network.broadcastPacket('weapon_swing',{emoji:w.emoji,isFist});
      const previews=[];
      for(const e of [...network.npcPlayers.values(),...(ecosystem.mobs||[])]){
        if(e.combatDown||Math.hypot(e.x-localPlayer.x,e.y-localPlayer.y)>135)continue;
        const dx=e.x-localPlayer.x,dy=e.y-localPlayer.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/8));let blocked=false;
        for(let i=0;i<=steps;i++)if(window.isPositionBlocked(localPlayer.x+dx*i/steps,localPlayer.y+dy*i/steps,18)){blocked=true;break;}
        if(blocked)continue;
        const angle=Math.atan2(dy,dx);
        // 客戶端即時打擊感：立即賦予位移、旋轉打擊與受擊特效
        const pushDist=isFist?16:26;
        const nx=Math.max(55,Math.min(2700,e.x+Math.cos(angle)*pushDist));
        const ny=Math.max(55,Math.min(1900,e.y+Math.sin(angle)*pushDist));
        if(!window.isPositionBlocked(nx,ny,16)){e.x=nx;e.y=ny;}
        e.knockback={vx:Math.cos(angle)*(isFist?9:14),vy:Math.sin(angle)*(isFist?9:14),ticksLeft:16};
        e.emote={emoji:isFist?'👊':'💥',expiresAt:now+650};
        const id=window.OfficeCombat.predictImpact(e,angle);
        previews.push([e,id]);
        if(typeof e.hp==='number'){
          if(isFist){
            e.fistHits=(e.fistHits||0)+1;
            if(e.fistHits>=10){e.fistHits=0;e.hp=0;}
            else{e.hp=Math.max(0.1,e.hp-(e.maxHp||2)/10);}
          }else{
            e.hp=Math.max(0,e.hp-1);
          }
          if(e.hp<=0&&!e.combatDown){
            if (e.isGhost || e.id === 'npc_night_ghost') {
              network.transformRedGhost?.(e);
              showCombatToast('👻 幽靈遭到擊倒，狂暴化為【恐怖紅色幽靈】並召喚兩隻小幽靈！', 'error');
            } else {
              e.combatDown=true;
              e.combatDownAt=Date.now();
              e.actionState='sleep_bed';
              e.isMoving=false;
              showCombatToast(`${escapeHtml(e.name||'目標')} 被擊倒！`);
              setTimeout(()=>{
                if(typeof ecosystem !== 'undefined' && ecosystem.mobs){
                  ecosystem.mobs=ecosystem.mobs.filter(m=>m!==e&&(m.uid||m.id)!==(e.uid||e.id));
                }
              }, 650);
            }
          }
        }
      }
      seasonSend('attack').finally(()=>{season.attacking=false;});
      return;
    }
    if(gameNow()<(localPlayer.stunnedUntil||0)) return;
    if(window.OfficeHunt?.clock?.()?.active && window.OfficeHunt?.safe?.(localPlayer)) return;
    if (gameNow() < (localPlayer.ghostSleepUntil || 0)) return;
    if (localPlayer.isInjured && gameNow() < (localPlayer.injuredUntil || 0)) {
      showCombatToast('🚑 身受重傷休養中，無法揮動裝備攻擊！', 'error');
      return;
    }
    const now = gameNow();
    const curWeapon = getActiveEquippedItem() || FIST_WEAPON;
    const isFist = !!curWeapon.isFist;
    const atkCd = isFist ? 1000 : (window.GATHER_CONFIG?.security?.attackCooldownMs || 250);
    if (now - lastWeaponAttackAt < atkCd) {
      if (isFist) showCombatToast(`👊 徒手揮拳冷卻中（剩餘 ${((atkCd - (now - lastWeaponAttackAt)) / 1000).toFixed(1)} 秒）`);
      return;
    }
    lastWeaponAttackAt = now;

    const activeSlotIdx = localPlayer.activeEquipIndex;
    const wpnEmoji = curWeapon.emoji || '🪑';
    const wpnName = curWeapon.name || '折疊板凳';
    const wpnPower = curWeapon.power || 26;
    const itemKnockbackExp = curWeapon.knockbackExp || 25;

    // 播放揮砍半月斬動畫
    localPlayer.weaponSwing = {
      emoji: wpnEmoji,
      isFist,
      ticksLeft: 18,
      totalTicks: 18,
      startedAt: gameNow(), duration: 300,
    };
    network.broadcastPacket('weapon_swing',{emoji:wpnEmoji});
    localPlayer.jumpOffset = 10;

    vfxList.push({
      type: 'click_ring',
      x: localPlayer.x,
      y: localPlayer.y - 10,
      radius: 14,
      maxRadius: 115,
      alpha: 0.95,
      color: '#facc15',
    });

    const attackRadius = 135;
    let hitCount = 0;

    for (const enemy of [...(ecosystem.mobs || []), ...network.npcPlayers.values()]) {
      if (enemy.combatDown || Math.hypot(enemy.x-localPlayer.x,enemy.y-localPlayer.y)>attackRadius) continue;
      hitCount++;

      // 🥊 還原：攻擊 VP 大老闆、PP00 處長、打掃阿姨時，有 50% 機率被抓去專屬辦公室或廁所連續毆打；攻擊警衛時 80% 機率被拉到茶水間痛毆造成輕微挫傷
      const isVp = enemy.id === 'npc_vp_boss' || enemy.avatarId === 'npc_vp_uncle';
      const isDir = enemy.id === 'npc_dir_pp00' || enemy.avatarId === 'npc_dir_pp00_slim';
      const isAuntie = enemy.id === 'npc_auntie_meifeng' || enemy.id === 'npc_auntie_shufen' || enemy.isSweeper;
      const isGuard = enemy.id === 'npc_security_guard' || enemy.avatarId === 'npc_security_guard' || enemy.role === 'guard' || (enemy.name && enemy.name.includes('警衛'));

      if (isGuard && Math.random() < 0.80) {
        triggerBossOrAuntieBeating(enemy, 'guard');
        return;
      }
      if ((isVp || isDir || isAuntie) && Math.random() < 0.50) {
        triggerBossOrAuntieBeating(enemy, isVp ? 'vp' : isDir ? 'dir' : 'auntie');
        return;
      }

      if(now-(enemy.lastCombatLogAt||0)>600){enemy.lastCombatLogAt=now;appendCombatText(`攻擊【${escapeHtml(enemy.name)}】`);}
      window.OfficeCombat.send(network,'combat_strike',{targetId:enemy.uid||enemy.id});

    }

    // 3. 檢查並打飛附近的線上同事 (Remote Players)，5% 機率造成重傷臥床 5 分鐘
    network.remotePlayers.forEach((colleague) => {
      const d = Math.hypot(colleague.x - localPlayer.x, colleague.y - localPlayer.y);
      if (d <= attackRadius) {
        hitCount++;
        let dx = colleague.x - localPlayer.x;
        let dy = colleague.y - localPlayer.y;
        if (Math.hypot(dx, dy) < 1) {
          dx = 1;
          dy = 0;
        }
        const ang = Math.atan2(dy, dx);
        colleague.jumpOffset = 32;
        colleague.emote = { emoji: '💫', expiresAt: now + 3000 };
        colleague.x = Math.max(180, Math.min(window.WORLD_MAP.width - 150, colleague.x + Math.cos(ang) * 95));
        colleague.y = Math.max(100, Math.min(window.WORLD_MAP.height - 120, colleague.y + Math.sin(ang) * 95));

        // 🚑 規則 3：攻擊線上使用者，5% 機率躺在會議室因重傷休息無法動彈 5 分鐘
        const critChance = window.GATHER_CONFIG?.security?.userCritInjuryChance ?? 0.05;
        const isCriticalInjury = Math.random() < critChance;

        network.broadcastPacket('weapon_attack', {
          targetId: colleague.id,
          senderName: localPlayer.name,
          weaponEmoji: wpnEmoji,
          weaponName: wpnName,
          power: wpnPower,
          fromX: localPlayer.x,
          fromY: localPlayer.y,
          isCriticalInjury,
        });

        const gainedExp = addExp(itemKnockbackExp, `打飛同事 ${colleague.name}`);
        if (isCriticalInjury) {
          pushCombatLog(
            '你',
            `💥 觸發 5% 致命重擊！把同事【${colleague.name}】打成重傷，送往會議室休養 5 分鐘無法動彈！（+${gainedExp} EXP）`
          );
          showCombatToast(`💥 致命重擊！【${colleague.name}】身受重傷送入會議室休養 5 分鐘！`, 'security');
        } else {
          pushCombatLog('你', `⚔️ 把同事【${colleague.name}】打飛了出去（+${gainedExp} EXP）`);
        }
      }
    });

    // 4. 耐久度扣減：命中累積滿 3 次固定損毀消失
    if (hitCount > 0 && !isFist) {
      curWeapon.durability = (curWeapon.durability || 3) - 1;
      if (curWeapon.durability <= 0) {
        if (season.manualEmptySlots) season.manualEmptySlots.delete(activeSlotIdx);
        localPlayer.equippedSlots[activeSlotIdx] = null;
        pushCombatLog('系統', `💔 裝備【${wpnEmoji} ${wpnName}】揮擊命中滿 3 次，耐久度歸零損毀消失！`);
        // 🎒 裝備損壞後，自動為玩家裝備儲物欄 (背包) 內現有的物品
        const nextBagIndex = localPlayer.inventory.findIndex(i=>i.category!=='outfit');
        if (nextBagIndex >= 0) {
          const nextItem = localPlayer.inventory[nextBagIndex];
          equipFromBag(nextBagIndex);
          showCombatToast(`🎒 裝備損毀，已自動為您換上儲物欄中的【${nextItem.emoji} ${nextItem.name}】！`, 'info');
          pushCombatLog('系統', `🎒 裝備【${wpnEmoji} ${wpnName}】損毀，已自動為您換上儲物欄中的【${nextItem.emoji} ${nextItem.name}】！`);
        } else {
          const nextEquippedIdx = localPlayer.equippedSlots.findIndex((s) => s !== null);
          if (nextEquippedIdx !== -1) {
            localPlayer.activeEquipIndex = nextEquippedIdx;
          }
        }
      } else {
        pushCombatLog('系統', `🔧 【${wpnEmoji} ${wpnName}】剩餘耐久：${curWeapon.durability}/${curWeapon.maxDurability || 3} 次（命中滿 3 次損毀）`);
      }
      syncPlayerActiveWeaponState();
    } else {
      // 規則 10：F 攻擊鍵除了正確擊中目標，揮空不顯示在訊息上
    }
  }

  function handleIncomingWeaponAttack(pkt) {
    if (!pkt || pkt.targetId !== network.clientId) return;
    if (localPlayer.isInjured || localPlayer.isRestrained) return;

    // 💥 遭受武器攻擊時，立即強制中斷任何進行中的互動狀態（坐下寫 code、上廁所、修機台、祈福等）
    cancelContextualAction();
    localPlayer.actionState = null;
    localPlayer.occupiedSpotId = null;
    localPlayer.autoWalkTarget = null;
    updatePoseLabelUI();

    if (!season.enabled && !pkt.hunt) window.OfficeCombat?.send(network, 'combat_hurt', { targetId: network.clientId, npc: false });
    if (!season.enabled && !pkt.isCriticalInjury && Math.random() < 0.20 && gameNow() >= (localPlayer.lightInjuredUntil || 0) && !localPlayer.isInjured) {
      localPlayer.lightInjuredUntil = gameNow() + 60000;
      showCombatToast('🩹 輕微挫傷：移速降低 30% (持續 60 秒)', 'error');
      pushCombatLog('系統', `🩹 遭同事【${pkt.senderName || '同事'}】揮舞武器擊中造成輕微挫傷！移速降低 30%（持續 60 秒）`);
    }

    if (!season.enabled && pkt.isCriticalInjury) {
      // 🚑 遭受 5% 致命重傷：原地倒地休養無法動彈 5 分鐘，鏡頭停留在事發現場等待急救
      const lockMs = window.GATHER_CONFIG?.security?.userInjuryLockMs || 300000;
      localPlayer.isInjured = true;
      localPlayer.injuredUntil = gameNow() + lockMs;
      cancelContextualAction();
      window.OfficeCombat?.send?.(network,'recovery_request',{until:localPlayer.injuredUntil});
      localPlayer.actionState = 'sleep_bed';
      localPlayer.autoWalkTarget = null;
      localPlayer.knockback = null;
      savePersistentState();
      updatePoseLabelUI();
      updateInjuryCountdownHUD();

      pushCombatLog(
        '系統',
        pkt.hunt ? '🚑 鳥人追殺中累計受擊三次，已重傷退出本場，等待急救或休養恢復。' : `🚑 遭受同事【${pkt.senderName || '同事'}】揮舞【${pkt.weaponEmoji || '🪑'}】致命重擊！你身受重傷，在會議室 B 躺平休養 5 分鐘無法動彈！`
      );
      showCombatToast(pkt.hunt ? '🚑 累計受擊三次，重傷退出本場！' : '🚑 遭受致命重擊！身受重傷，在會議室 B 休養 5 分鐘（無法動彈）', 'error');
      if (network) {
        network.broadcastPacket('state_sync', { player: network.getPublicState() });
      }
      return;
    }
    let dx = localPlayer.x - (pkt.fromX || localPlayer.x - 20);
    let dy = localPlayer.y - (pkt.fromY || localPlayer.y);
    if (Math.hypot(dx, dy) < 1) {
      dx = Math.random() - 0.5;
      dy = Math.random() - 0.5;
    }
    const angle = Math.atan2(dy, dx);
    const power = pkt.power || 26;
    const totalTicks = 26;

    localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
    updatePoseLabelUI();
    localPlayer.autoWalkTarget = null;
    localPlayer.knockback = {
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power,
      ticksLeft: totalTicks,
      totalTicks,
    };
    localPlayer.jumpOffset = 44;
    localPlayer.emote = { emoji: '💫', expiresAt: gameNow() + 3000 };
    spawnConfetti(localPlayer.x, localPlayer.y - 20);

    pushCombatLog(
      '系統',
      `💥 被同事【${pkt.senderName || '同事'}】揮舞【${pkt.weaponEmoji || '🪑'} ${pkt.weaponName || '武器'}】打飛出去！`
    );
  }

  function handleIncomingSkillEffect(pkt) {
    if(season.enabled)return;
    const now = gameNow();
    if (pkt.skill === 'wave') {
      pushStatusLog(pkt.senderName, '👋 向你熱情揮手！');
    } else if (pkt.skill === 'zap' && pkt.targetId === network.clientId) {
      localPlayer.jumpOffset = 18;
      localPlayer.emote = { emoji: '⚡', expiresAt: now + 3000 };
      vfxList.push({
        type: 'lightning',
        x1: pkt.fromX,
        y1: pkt.fromY - 18,
        x2: localPlayer.x,
        y2: localPlayer.y - 18,
        ticksLeft: 24,
      });
      pushStatusLog(pkt.senderName, '⚡ 對你發動了靜電戳！');
    } else if (pkt.skill === 'exchange' && pkt.targetId === network.clientId) {
      ecosystem.addThrownItem(pkt.fromX, pkt.fromY - 20, localPlayer.x, localPlayer.y - 20, pkt.itemGiven);
      const added = addItemToInventory(pkt.itemGiven || '🟢', true);
      updateSelfHudCard();
      pushStatusLog(pkt.senderName, `🎁 與你交換了 ${added.emoji} ${added.name}！`);
    } else if (pkt.skill === 'cheer') {
      localPlayer.jumpOffset = 15;
      localPlayer.emote = { emoji: '🍻', expiresAt: now + 4000 };
      spawnConfetti(localPlayer.x, localPlayer.y - 25);
    }
  }

  function spawnConfetti(cx, cy) {
    const colors = ['#f43f5e', '#38bdf8', '#facc15', '#4ade80', '#a855f7'];
    for (let i = 0; i < 18; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 3.8;
      vfxList.push({
        type: 'confetti',
        x: cx,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2,
        color: colors[i % colors.length],
        alpha: 1,
      });
    }
  }

  function walkToPlayer(targetId, keepFollowing = false) {
    const target = network.getAllOtherPlayers().find((p) => p.id === targetId);
    if (!target) return;
    selectedTargetId = target.id;
    localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
    updatePoseLabelUI();
    camera.overviewMode = false;
    document.getElementById('toggleOverviewBtn').classList.remove('active');
    handleResize();
    localPlayer.autoWalkTarget = {
      x: target.x - 45,
      y: target.y + 12,
      followId: keepFollowing ? target.id : null,
    };
  }

  /**
   * 辦公室所有獨立椅子與互動點清單 (規則 3 & 9：所有椅子皆為獨立互動點，只允許單人入座佔領)
   */
  function getOfficeInteractiveSpots() {
    const spots = [];

    // 1. VP 獨立辦公室位置 (5 個獨立互動位：推桿區 + 主管主座 + 訪客A + 訪客B + 接待皮沙發)
    spots.push({
      id: 'spot_vp_golf',
      name: 'VP 高爾夫推桿練習區',
      shortHint: '[按 E] ⛳ 練習高爾夫推桿',
      label: '⛳ 在 VP 獨立室練習高爾夫推桿 [按E]',
      actionId: 'golf_putt',
      standX: 535,
      standY: 335,
      dir: 'up',
      triggerDist: 38,
    });
    spots.push({
      id: 'seat_vp_exec',
      name: 'VP 大老闆決策主座',
      shortHint: '[按 E] 💻 坐上 VP 決策主座',
      label: '💻 入座【VP 大老闆決策主座】使用旗艦電腦 [按E]',
      actionId: 'sit_code',
      standX: 355,
      standY: 135,
      dir: 'down',
      triggerDist: 34,
    });
    spots.push({
      id: 'seat_vp_guest_1',
      name: 'VP 室訪客座 A',
      shortHint: '[按 E] 🪑 入座訪客座 A',
      label: '🪑 入座【VP 室 訪客椅 A】進行匯報 [按E]',
      actionId: 'sit_code',
      standX: 308,
      standY: 260,
      dir: 'up',
      triggerDist: 34,
    });
    spots.push({
      id: 'seat_vp_guest_2',
      name: 'VP 室訪客座 B',
      shortHint: '[按 E] 🪑 入座訪客座 B',
      label: '🪑 入座【VP 室 訪客椅 B】進行匯報 [按E]',
      actionId: 'sit_code',
      standX: 403,
      standY: 260,
      dir: 'up',
      triggerDist: 34,
    });
    spots.push({
      id: 'seat_vp_sofa',
      name: 'VP 接待皮沙發',
      shortHint: '[按 E] 🛋️ 沙發閉目養神',
      label: '🛋️ 入座【VP 室 高級皮沙發】閉目養神 [按E]',
      actionId: 'slack_nap',
      standX: 265,
      standY: 340,
      dir: 'up',
      triggerDist: 36,
    });

    // 2. 六間主管獨立辦公室/會議室 (各 3 張獨立椅子：主座 + 訪客 A + 訪客 B)
    window.WORLD_MAP.directorBlocks.forEach((blk) => {
      if(blk.unit!=="PP00")return;
      const roomLabel = blk.title;
      spots.push({
        id: `seat_dir_${blk.unit}_main`,
        name: `${roomLabel} 主座`,
        shortHint: `[按 E] 💻 入座${roomLabel}轉椅`,
        label: `💻 入座【${roomLabel} 轉椅】辦公寫 Code [按E]`,
        actionId: 'sit_code',
        standX: blk.x + 112,
        standY: blk.y + 86,
        dir: 'down',
        triggerDist: 34,
      });
      spots.push({
        id: `seat_dir_${blk.unit}_g1`,
        name: `${blk.unit} 訪客座 A`,
        shortHint: `[按 E] 🪑 入座訪客座 A`,
        label: `🪑 入座【${roomLabel} 訪客座 A】[按E]`,
        actionId: 'sit_code',
        standX: blk.x + 84,
        standY: blk.y + 205,
        dir: 'up',
        triggerDist: 32,
      });
      spots.push({
        id: `seat_dir_${blk.unit}_g2`,
        name: `${blk.unit} 訪客座 B`,
        shortHint: `[按 E] 🪑 入座訪客座 B`,
        label: `🪑 入座【${roomLabel} 訪客座 B】[按E]`,
        actionId: 'sit_code',
        standX: blk.x + 140,
        standY: blk.y + 205,
        dir: 'up',
        triggerDist: 32,
      });
    });

    // 3. 會議室 A (戰情看盤室) - 8 張精確對齊獨立會議椅 + 1 個台股大螢幕看盤點
    const meetAChairs = [
      { id: 'seat_meet_a_t1', name: '會議室A-席位1', x: 322, y: 1418, dir: 'down' },
      { id: 'seat_meet_a_t2', name: '會議室A-席位2', x: 382, y: 1418, dir: 'down' },
      { id: 'seat_meet_a_t3', name: '會議室A-席位3', x: 442, y: 1418, dir: 'down' },
      { id: 'seat_meet_a_t4', name: '會議室A-席位4', x: 502, y: 1418, dir: 'down' },
      { id: 'seat_meet_a_b1', name: '會議室A-席位5', x: 322, y: 1611, dir: 'up' },
      { id: 'seat_meet_a_b2', name: '會議室A-席位6', x: 382, y: 1611, dir: 'up' },
      { id: 'seat_meet_a_b3', name: '會議室A-席位7', x: 442, y: 1611, dir: 'up' },
      { id: 'seat_meet_a_b4', name: '會議室A-席位8', x: 502, y: 1611, dir: 'up' },
    ];
    meetAChairs.forEach((c) => {
      spots.push({
        id: c.id,
        name: c.name,
        shortHint: `[按 E] 📑 入座${c.name}`,
        label: `📑 入座【${c.name}】開會研討 [按E]`,
        actionId: 'meeting_discuss',
        standX: c.x,
        standY: c.y,
        dir: c.dir,
        triggerDist: 32,
      });
    });
    spots.push({
      id: 'spot_meet_a_stock',
      name: '會議室 A 台股大螢幕',
      shortHint: '[按 E] 📈 緊盯台股看盤',
      label: '📈 會議室A台股大螢幕：看盤 & 互動行情情緒 [按E]',
      actionId: 'watch_stock',
      standX: 410,
      standY: 1612,
      dir: 'up',
      triggerDist: 36,
      isStockScreen: true,
    });

    // 4. 會議室 B (專案審查室) - 8 張精確對齊獨立會議椅
    const meetBChairs = [
      { id: 'seat_meet_b_t1', name: '會議室B-席位1', x: 852, y: 1418, dir: 'down' },
      { id: 'seat_meet_b_t2', name: '會議室B-席位2', x: 912, y: 1418, dir: 'down' },
      { id: 'seat_meet_b_t3', name: '會議室B-席位3', x: 972, y: 1418, dir: 'down' },
      { id: 'seat_meet_b_t4', name: '會議室B-席位4', x: 1032, y: 1418, dir: 'down' },
      { id: 'seat_meet_b_b1', name: '會議室B-席位5', x: 852, y: 1611, dir: 'up' },
      { id: 'seat_meet_b_b2', name: '會議室B-席位6', x: 912, y: 1611, dir: 'up' },
      { id: 'seat_meet_b_b3', name: '會議室B-席位7', x: 972, y: 1611, dir: 'up' },
      { id: 'seat_meet_b_b4', name: '會議室B-席位8', x: 1032, y: 1611, dir: 'up' },
    ];
    meetBChairs.forEach((c) => {
      spots.push({
        id: c.id,
        name: c.name,
        shortHint: `[按 E] 📑 入座${c.name}`,
        label: `📑 入座【${c.name}】專案審查 [按E]`,
        actionId: 'meeting_discuss',
        standX: c.x,
        standY: c.y,
        dir: c.dir,
        triggerDist: 32,
      });
    });

    // 5. PE / TE / Lab 電腦工作站椅子 (各為獨立座位)
    window.WORLD_MAP.workstations.forEach((ws) => {
      spots.push({
        id: `seat_${ws.id}`,
        name: `${ws.owner} 座位`,
        shortHint: `[按 E] 💻 坐下寫 Code`,
        label: `💻 坐下使用【${ws.owner}】電腦寫 Code [按E]`,
        actionId: 'sit_code',
        standX: ws.x + ws.w / 2,
        standY: ws.y + ws.h + 18,
        dir: 'up',
        triggerDist: 36,
      });
    });

    for (const [i,x,dir] of [[1,2278,'right'],[2,2488,'left']]) spots.push({
      id:`seat_pantry_chair_${i}`,name:`茶水間餐椅 ${i}`,
      shortHint:'[按 E] 坐下休息',label:'坐下休息',actionId:'meeting_discuss',
      standX:x,standY:302,dir,triggerDist:32,
    });
    // 6. 茶水間預設 3 個獨立預定互動位置 (規則 9)
    spots.push({
      id: 'spot_pantry_1',
      name: '茶水間 1號手沖咖啡吧',
      shortHint: '[按 E] ☕ 喝手沖熱咖啡',
      label: '☕ 在【1號義式手沖咖啡吧台】喝咖啡提神 [按E]',
      actionId: 'drink_coffee',
      standX: 2280,
      standY: 195,
      dir: 'up',
      triggerDist: 36,
    });
    spots.push({
      id: 'spot_pantry_2',
      name: '茶水間 2號零食茶飲吧',
      shortHint: '[按 E] 🍵 享用茶飲零食',
      label: '🍵 在【2號零食茶飲補給吧】吃點心補充體力 [按E]',
      actionId: 'drink_coffee',
      standX: 2420,
      standY: 195,
      dir: 'up',
      triggerDist: 36,
    });
    spots.push({
      id: 'spot_pantry_3',
      name: '茶水間 3號懶人沙發摸魚位',
      shortHint: '[按 E] 🐟 沙發摸魚打瞌睡',
      label: '🐟 入座【3號懶人沙發位】摸魚打瞌睡 [按E]',
      actionId: 'slack_nap',
      standX: 2380,
      standY: 345,
      dir: 'up',
      triggerDist: 36,
    });

    // 7. 洗手間台預設 3 個獨立預定位置 (規則 9)
    spots.push({
      id: 'spot_sink_1',
      name: '洗手間 1號感應泡沫洗手台',
      shortHint: '[按 E] 🧼 1號感應洗手',
      label: '🧼 在【1號感應泡沫洗手台】搓泡泡洗手 [按E]',
      actionId: 'wash_hands',
      standX: 2240,
      standY: 675,
      dir: 'up',
      triggerDist: 36,
      isSink: true,
    });
    spots.push({
      id: 'spot_sink_2',
      name: '洗手間 2號潔淨溫水洗手台',
      shortHint: '[按 E] 🧼 2號溫水洗手',
      label: '🧼 在【2號潔淨溫水洗手台】洗手清涼一下 [按E]',
      actionId: 'wash_hands',
      standX: 2300,
      standY: 675,
      dir: 'up',
      triggerDist: 36,
      isSink: true,
    });
    spots.push({
      id: 'spot_sink_3',
      name: '洗手間 3號消毒烘手機台',
      shortHint: '[按 E] 💨 3號熱風烘手',
      label: '💨 在【3號熱風消毒烘手機】烘乾雙手 [按E]',
      actionId: 'wash_hands',
      standX: 2360,
      standY: 675,
      dir: 'up',
      triggerDist: 36,
      isSink: true,
    });

    // 8. 實驗室機台拜拜祈福點
    window.WORLD_MAP.labEquipments.forEach((eq) => {
      spots.push({
        id: `spot_eq_${eq.id}`,
        name: `${eq.name} 機台`,
        shortHint: '[按 E] 🟢 拜綠乖乖鎮機台',
        label: `🟢 對【${eq.name}】拜綠乖乖鎮機台 [按E]`,
        actionId: 'pray_kuaikuai',
        standX: eq.x + eq.w / 2,
        standY: eq.y + eq.h + 18,
        dir: 'up',
        triggerDist: 48,
      });
    });

    return spots;
  }

  /**
   * 檢查該位置是否已被其他線上同仁或 NPC 入座佔用 (規則 9：一處僅限一人佔用，不因路過而誤鎖)
   */
  function isSpotOccupiedByOther(spot) {
    if (!spot) return false;
    const allOthers = [
      ...Array.from(network.remotePlayers.values()),
      ...Array.from(network.npcPlayers.values()),
    ];
    return allOthers.some((other) => {
      if (!other || other.id === localPlayer.id) return false;
      // 1. 他人已明確佔用該互動點 ID
      if (other.occupiedSpotId && other.occupiedSpotId === spot.id) return true;
      // 2. 他人處於就座情境動作且確實停留在該座位中心
      const isSeatedAction =
        other.actionState &&
        ['sit_code', 'slack_nap', 'meeting_discuss', 'golf_putt', 'watch_stock', 'wash_hands'].includes(
          other.actionState
        );
      if (isSeatedAction && !other.isMoving && Math.hypot(other.x - spot.standX, other.y - spot.standY) < 24) {
        return true;
      }
      return false;
    });
  }

  /**
   * 偵測玩家靠近哪種辦公室設備或獨立座椅 (規則 3 & 9)
   */
  function detectNearbyFacility() {
    if(season.enabled){const d=nearbySeasonDrop();if(d)return {label:'拾取 '+d.name,shortHint:'[E / 互動] 拾取 '+d.name,seasonDrop:true};}
    if(season.enabled){const f=window.OfficeFacilities?.nearby?.(localPlayer,season.client?.snapshot);if(f)return {label:f.label,shortHint:"[E] "+f.label,seasonFacility:true,...f};}
    else {
      const f=window.OfficeFacilities?.nearby(localPlayer);
      if(f)return {label:f.label,shortHint:"[E] "+f.label,nonSeasonFacility:true,...f};
    }
    const px = localPlayer.x;
    const py = localPlayer.y;

    // 0. 最高優先級：若靠近身受重傷的同仁，提示醫療急救
    if (!localPlayer.isInjured && nearbyInjuredColleague) {
      const isHealingSelf = activeHealingSession && activeHealingSession.targetId === nearbyInjuredColleague.id;
      return {
        label: isHealingSelf ? `🩹 急救醫療中... [請維持原地]` : `🩹 為【${nearbyInjuredColleague.name}】進行緊急醫療 (5秒) [按E]`,
        shortHint: isHealingSelf ? `[🩹 急救中... 保持靠近]` : `[按 E] 🩹 為【${nearbyInjuredColleague.name}】急救醫療`,
        isHealColleague: true,
        targetColleague: nearbyInjuredColleague,
      };
    }

    // 0. 優先檢查遭破壞設備（修復立即升一級）
    for (const ws of window.WORLD_MAP.workstations) {
      const seatX = ws.x + ws.w / 2;
      const seatY = ws.y + ws.h + 18;
      const ncx = Math.max(ws.x, Math.min(px, ws.x + ws.w));
      const ncy = Math.max(ws.y, Math.min(py, ws.y + ws.h));
      if (ws.isBroken && (Math.hypot(px - ncx, py - ncy) <= 95 || Math.hypot(px - seatX, py - seatY) < 125)) {
        return {
          label: `🔧 修復遭【${ws.brokenBy || '怪物'}】破壞的【${ws.owner}】電腦 (完成獲得經驗) [按E]`,
          shortHint: `[按 E] 🔧 修復電腦`,
          actionId: 'sit_code',
          targetX: seatX,
          targetY: seatY,
          targetDir: 'up',
          repairTarget: ws,
          repairName: ws.owner,
        };
      }
    }

    for (const eq of window.WORLD_MAP.labEquipments) {
      const cx = eq.x + eq.w / 2;
      const cy = eq.y + eq.h + 18;
      const necx = Math.max(eq.x, Math.min(px, eq.x + eq.w));
      const necy = Math.max(eq.y, Math.min(py, eq.y + eq.h));
      if (eq.isBroken && (Math.hypot(px - necx, py - necy) <= 100 || Math.hypot(px - cx, py - cy) < 135)) {
        return {
          label: `🔧 修復遭【${eq.brokenBy || '怪物'}】破壞的【${eq.name}】機台 (完成獲得經驗) [按E]`,
          shortHint: `[按 E] 🔧 修復機台`,
          actionId: 'pray_kuaikuai',
          targetX: cx,
          targetY: cy,
          targetDir: 'up',
          repairTarget: eq,
          repairName: eq.name,
        };
      }
    }

    // 1. 廁所馬桶隔間：若有人在內無法進入，但可於門外按 [E]「踹門」
    for (const stall of window.WORLD_MAP.toiletStalls) {
      const distToSeat = Math.hypot(px - stall.seatX, py - stall.seatY);
      const distToDoor = Math.hypot(px - stall.x, py - (stall.y + 48));
      if (distToSeat < 92 || distToDoor < 88) {
        const isAlreadyUsing =
          localPlayer.actionState === 'toilet' &&
          distToSeat < 25;

        // 若隔間已被其他人佔用，不可進入，但可在門外按 [E] 踹門！
        if (stall.occupiedBy && stall.occupiedBy !== localPlayer.id) {
          return {
            label: `🦵 隔間內有人！在門外猛踹【${stall.name}】隔間門催促 [按E]`,
            shortHint: `[按 E] 🦵 猛踹廁所門催促`,
            actionId: 'kick_toilet_door',
            targetX: stall.x - 24,
            targetY: stall.y + 48,
            targetDir: 'right',
            stall,
            isKickDoor: true,
          };
        }

        return {
          label: isAlreadyUsing
            ? `🚽 沖水開門離開【${stall.name}】 [按E]`
            : `🚽 開門進入【${stall.name}】蹲馬桶 [按E]`,
          shortHint: isAlreadyUsing ? `[按 E] 🌊 沖水開門離開` : `[按 E] 🚽 開門上廁所`,
          actionId: 'toilet',
          targetX: isAlreadyUsing ? stall.x - 28 : stall.seatX,
          targetY: isAlreadyUsing ? stall.y + 48 : stall.seatY,
          targetDir: isAlreadyUsing ? 'left' : 'down',
          stall,
          isExitToilet: isAlreadyUsing,
        };
      }
    }

    // 2. 檢索全部獨立椅子與互動點 (規則 3 & 9)
    const allSpots = getOfficeInteractiveSpots();

    // 優先檢查：若玩家目前已佔用某個位置，靠近或在其上按 E 優先觸發站起離開
    if (localPlayer.occupiedSpotId) {
      const curOccupied = allSpots.find((s) => s.id === localPlayer.occupiedSpotId);
      if (curOccupied) {
        return {
          ...curOccupied,
          label: `🚶 離開【${curOccupied.name}】站起 [按E]`,
          shortHint: `[按 E] 🚶 起身離開`,
          isLeaving: true,
          targetX: curOccupied.standX,
          targetY: curOccupied.standY,
          targetDir: curOccupied.dir || 'down',
        };
      }
    }

    let closestSpot = null;
    let minD = Infinity;

    for (const spot of allSpots) {
      const d = Math.hypot(px - spot.standX, py - spot.standY);
      const threshold = spot.triggerDist || 36;
      if (d < threshold && d < minD) {
        minD = d;
        closestSpot = spot;
      }
    }

    if (closestSpot) {
      // 檢查是否已被其他人入座
      if (isSpotOccupiedByOther(closestSpot)) {
        return {
          isOccupied: true,
          name: closestSpot.name,
          label: `⚠️【${closestSpot.name}】已被他人佔用 [無法入座]`,
          shortHint: '⚠️ 已被他人佔用',
          targetX: closestSpot.standX,
          targetY: closestSpot.standY,
        };
      }

      return {
        ...closestSpot,
        targetX: closestSpot.standX,
        targetY: closestSpot.standY,
        targetDir: closestSpot.dir || 'up',
      };
    }

    // 3. 身旁若無設備，檢查是否有可交談的 NPC (距離 <= 62px)
    if (network && network.npcPlayers) {
      let nearestNpc = null;
      let minNpcD = Infinity;
      for (const npc of network.npcPlayers.values()) {
        if(npc.combatDown)continue;
        const d = Math.hypot(px - npc.x, py - npc.y);
        if (d < 62 && d < minNpcD) {
          minNpcD = d;
          nearestNpc = npc;
        }
      }
      if (nearestNpc) {
        return {
          isNpcTalk: true,
          npcTarget: nearestNpc,
          name: nearestNpc.name,
          label: `💬 與【${nearestNpc.name}】交談 [按E]`,
          shortHint: `[按 E] 💬 與【${nearestNpc.name}】交談`,
          targetX: px,
          targetY: py,
        };
      }
    }

    return null;
  }

  function startHealingInjuredColleague(target) {
    if (!target || localPlayer.isInjured) return;
    if (activeHealingSession) return;
    activeHealingSession = {
      targetId: target.id,
      targetName: target.name,
      targetX: target.x,
      targetY: target.y,
      startTime: gameNow(),
      duration: 5000,
    };
    localPlayer.actionState = 'wash_hands'; // 包紮搓手動作
    localPlayer.isMoving = false;
    localPlayer.autoWalkTarget = null;
    if (network) {
      network.broadcastPacket('heal_start', {
        healerId: network.clientId,
        healerName: localPlayer.name,
        targetId: target.id,
        targetName: target.name,
      });
    }
    showToast(`🩹 正在對【${target.name}】進行 5 秒急救包紮！請保持靠近！`, 'join');
    pushStatusLog(localPlayer.name, `🩹 開始對【${target.name}】進行 5 秒緊急醫療！`);
  }

  async function tryInteractWithEnvironment() {
    if(season.enabled){if(season.busy)return;season.busy=true;try{if(await seasonInteract())return;}finally{season.busy=false;}}
    if (localPlayer.isInjured && gameNow() < (localPlayer.injuredUntil || 0)) {
      showToast('🚑 身受重傷休養中，無法進行設施互動！', 'error');
      return;
    }
    // 0. 醫療重傷同仁互動 (優先於一般設備)
    if (nearbyInjuredColleague && !activeHealingSession) {
      startHealingInjuredColleague(nearbyInjuredColleague);
      return;
    }
    // 1. 掉落物撿拾
    for (let i = season.enabled ? -1 : ecosystem.groundItems.length - 1; i >= 0; i--) {
      const item = ecosystem.groundItems[i];
      if (Math.hypot(localPlayer.x - item.x, localPlayer.y - item.y) < 68) {
        if(!window.OfficeWardrobe.canAdd(localPlayer,item,true)){showCombatToast('背包或服裝已滿');return;}
        if(item.combatDrop){window.OfficeCombat.send(network,'combat_claim',{uid:item.uid});return;}
        const added = addItemToInventory(item, true);
        const removed = ecosystem.groundItems.splice(i, 1)[0];
        if (removed) {
          network.broadcastPacket('item_collected', { itemId: removed.uid || removed.id });
        }
        const gained = addExp(15);
        updateSelfHudCard();
        network.broadcastPacket('state_sync', { player: network.getPublicState() });
        pushStatusLog('你', `🎒 撿起掉落物 ${added.emoji} ${added.name}（+${gained} EXP）`);
        return;
      }
    }

    // 2. 觸發設備或座椅互動
    const fac = detectNearbyFacility();
    if (fac) {
      if (fac.nonSeasonFacility) {
        window.OfficeFacilities.use(fac, null, () => ({ x: localPlayer.x, y: localPlayer.y }));
        return;
      }
      // 佔用阻擋提示
      if (fac.isOccupied) {
        pushStatusLog('系統', `⚠️【${fac.name}】目前已有其他同仁使用中，一個位置僅供一人入座佔領！`);
        return;
      }

      localPlayer.x = fac.targetX;
      localPlayer.y = fac.targetY;
      if (fac.targetDir) localPlayer.dir = fac.targetDir;
      localPlayer.autoWalkTarget = null;

      // 踹門互動
      if (fac.isKickDoor && fac.stall) {
        fac.stall.kickShakeTicks = 28;
        const kickPool = window.GATHER_CONFIG?.toiletKickMurmurs || [
          '不要再屎遁',
          '老闆在找你',
          '拉完了沒換我了',
        ];
        const kickText = kickPool[Math.floor(Math.random() * kickPool.length)];
        localPlayer.jumpOffset = 14;
        localPlayer.emote = { emoji: '🦵', expiresAt: gameNow() + 3500 };
        localPlayer.murmur = {
          text: kickText,
          mood: 'fire',
          createdAt: gameNow(),
          expiresAt: gameNow() + 5000,
        };
        network.broadcastPacket('toilet_kick', {
          senderName: localPlayer.name,
          text: kickText,
        });
        network.broadcastPacket('murmur', { text: kickText, mood: 'fire' });
        pushStatusLog('你', `🦵 在【${fac.stall.name}】門外猛踹門大喊：「${kickText}」！`);
        return;
      }

      // 修復設備
      if (fac.repairTarget && fac.repairTarget.isBroken) {
        if(season.enabled){showCombatToast("設備故障正在同步，請稍後再按 E");return;}
        fac.repairTarget.isBroken = false;
        fac.repairTarget.brokenBy = null;
        if (fac.repairTarget.kind) {
          fac.repairTarget.status = 'PASS 99.9%';
          fac.repairTarget.statusColor = '#22c55e';
          const eqIdx = window.WORLD_MAP.labEquipments.indexOf(fac.repairTarget);
          if (eqIdx !== -1) network.broadcastPacket('device_repair', { type: 'lab', idx: eqIdx });
        } else {
          fac.repairTarget.screenState = 'pass';
          fac.repairTarget.leftScreen = 'Pass';
          fac.repairTarget.rightScreen = 'Good';
          const wsIdx = window.WORLD_MAP.workstations.indexOf(fac.repairTarget);
          if (wsIdx !== -1) network.broadcastPacket('device_repair', { type: 'ws', idx: wsIdx });
        }
        forceLevelUp(fac.repairName || '設備');
        localPlayer.actionState = fac.actionId;
        updatePoseLabelUI();
        network.broadcastPacket('state_sync', { player: network.getPublicState() });
        return;
      }

      // 廁所隔間使用
      if (fac.stall) {
        if (fac.isExitToilet) {
          fac.stall.doorOpen = 1;
          fac.stall.occupiedBy = null;
          localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
          localPlayer.occupiedSpotId = null;
          updatePoseLabelUI();
          spawnConfetti(fac.stall.seatX, fac.stall.seatY - 10);
          pushStatusLog('你', `🌊 【${fac.stall.name}】沖水完畢離開隔間`);
          network.broadcastPacket('toilet_state', { stallId: fac.stall.id, occupiedBy: null, doorOpen: 0 });
          network.broadcastPacket('state_sync', { player: network.getPublicState() });
          setTimeout(() => {
            fac.stall.doorOpen = 0;
            network.broadcastPacket('toilet_state', { stallId: fac.stall.id, occupiedBy: null, doorOpen: 0 });
          }, 420);
          return;
        } else {
          fac.stall.doorOpen = 0;
          fac.stall.occupiedBy = localPlayer.id;
          localPlayer.occupiedSpotId = fac.stall.id;
          network.broadcastPacket('toilet_state', { stallId: fac.stall.id, occupiedBy: localPlayer.id, doorOpen: 0 });
          startContextualAction('toilet');
          pushStatusLog('你', `🚪 進入【${fac.stall.name}】關上隔間門鎖上，開始順暢排解壓力...`);
          network.broadcastPacket('murmur', { text: '💩 呼... 終於輪到我了', mood: 'sweat' });
          return;
        }
      }

      // 洗手台流水動畫
      if (fac.isSink || fac.sink) {
        if (window.WORLD_MAP.restroomSinks) {
          window.WORLD_MAP.restroomSinks.forEach((s) => (s.waterActive = true));
        }
      }

      // 📈 規則 11：股市會議室大螢幕互動 (根據漲跌觸發大哭或慶祝，不放入預設動作選單)
      if (fac.isStockScreen) {
        updateMarket();
        const st = window.TAIWAN_STOCK_STATE;
        if (st.direction < 0 || String(st.changeText).startsWith('▼') || String(st.changeText).startsWith('-')) {
          localPlayer.actionState = 'cry';
          localPlayer.emote = { emoji: '😭', expiresAt: gameNow() + 6000 };
          pushStatusLog('你', `😭 看到加權指數今日下跌 ${st.changeText}，抱頭崩潰大哭！`);
        } else if (st.direction > 0 || String(st.changeText).startsWith('▲') || String(st.changeText).startsWith('+')) {
          localPlayer.actionState = 'cheer_stock';
          localPlayer.emote = { emoji: '🎉', expiresAt: gameNow() + 6000 };
          pushStatusLog('你', `🚀 看到加權指數今日強勢大漲 ${st.changeText}，狂歡慶祝！`);
        } else {
          localPlayer.actionState = 'watch_stock';
          pushStatusLog('你', `📈 緊盯台股看盤（${st.valueText}）`);
        }
        localPlayer.occupiedSpotId = fac.id;
        updatePoseLabelUI();
        network.broadcastPacket('state_sync', { player: network.getPublicState() });
        return;
      }

      // 🚶 起身離開目前佔用位置
      if (fac.isLeaving) {
        localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
        localPlayer.occupiedSpotId = null;
        updatePoseLabelUI();
        network.broadcastPacket('state_sync', { player: network.getPublicState() });
        pushStatusLog('你', `🚶 起身離開【${fac.name}】`);
        return;
      }

      // 💬 NPC 攀談交談互動：直接觸發 NPC 碎念並跳出頭頂卡片
      if (fac.isNpcTalk && fac.npcTarget) {
        const npc = fac.npcTarget;
        if (npc.murmurs && npc.murmurs.length > 0) {
          const line = npc.murmurs[Math.floor(Math.random() * npc.murmurs.length)];
          let mood = 'normal';
          if (npc.id === 'npc_bird_commander') mood = 'fire';
          else if (npc.id === 'npc_vp_boss') mood = 'idea';
          else if (npc.id === 'npc_dir_pp00') mood = 'normal';
          else if (npc.isSecurityGuard) mood = 'fire';

          const duration = Math.min(7500, Math.max(4500, line.length * 150));
          npc.jumpOffset = 10;
          npc.murmur = {
            text: line,
            mood,
            createdAt: gameNow(),
            expiresAt: gameNow() + duration,
          };
          if (network) {
            network.broadcastPacket('murmur', {
              senderId: npc.id,
              senderName: npc.name,
              senderUnit: npc.unit,
              text: line,
              mood,
              avatarId: npc.avatarId,
            });
          }
          pushStatusLog(npc.name, `💬 「${line}」`);
          showToast(`💬【${npc.name}】：${line}`, 'info');
        }
        return;
      }

      // ⛳ 規則 3：VP 高爾夫推桿練習
      if (fac.actionId === 'golf_putt') {
        localPlayer.actionState = 'golf_putt';
        localPlayer.occupiedSpotId = fac.id;
        pushStatusLog('你', '⛳ 在 VP 大老闆獨立室揮桿練習高爾夫推桿！');
        updatePoseLabelUI();
        network.broadcastPacket('state_sync', { player: network.getPublicState() });
        return;
      }

      localPlayer.actionState = fac.actionId;
      localPlayer.occupiedSpotId = fac.id;
      updatePoseLabelUI();
      network.broadcastPacket('state_sync', { player: network.getPublicState() });
      pushStatusLog('你', fac.label.replace(' [按E]', ''));
    }
  }

  // =========================================================================
  // 6. 左下角獨立深色聊天室、狀態佇列與浮動置頂子視窗 (PiP) 摸魚防查崗模組
  //    - 真實使用者對談上限 20 行（自動洗掉舊訊息）
  //    - NPC 與狀態動作紀錄上限 10 行（自動洗掉舊訊息）
  //    - 支援勾選「只看聊天訊息」過濾器
  //    - 支援 Document Picture-in-Picture / 獨立彈跳視窗「永遠置頂」
  //    - 支援原生桌面通知 Web Notifications API（背景視窗自動推播）
  // =========================================================================
  function pushUserChat(senderName, senderUnit, text, isSelf = false, isPrivate = false, targetName = '') {
    const chatItem = {
      id: 'chat_' + gameNow() + '_' + Math.random().toString(36).slice(2, 6),
      senderName,
      senderUnit,
      text,
      timeStr: getFormatTime(),
      isSelf,
      isPrivate,
      targetName,
      kind: 'chat',
      createdAt: gameNow(),
    };
    userChatHistory.push(chatItem);
    const maxChatLines = window.GATHER_CONFIG?.security?.maxUserChatLines || 20;
    while (userChatHistory.length > maxChatLines) {
      userChatHistory.shift();
    }
    renderUnifiedChatAndStatus();

    // 1. 同步即時輸出至獨立浮動置頂子視窗 (PiP)
    if (activePipWindow && !activePipWindow.closed) {
      renderPipChatMessage(activePipWindow, chatItem);
    }

    // 2. 視窗隱藏或縮小時觸發桌面原生推播（僅限真實同事，排除 NPC 與怪物動態）
    if (!isSelf && (document.hidden || !document.hasFocus())) {
      const titlePrefix = isPrivate ? '🔒 [私訊] ' : '';
      triggerDesktopNotification(titlePrefix + senderName, senderUnit, text);
    }
  }

  const systemLogCooldowns = new Map();
  function normalizeSystemFeedbackKey(text) {
    return String(text || '')
      .replace(/（[^）]*\d+[^）]*）/g, '')
      .replace(/\([^)]*\d+[^)]*\)/g, '')
      .replace(/\d+:\d+/g, '')
      .replace(/\d+\s*(?:秒|分鐘|min|sec)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function pushStatusLog(senderName, text) {
    if (senderName === '系統') {
      const normKey = normalizeSystemFeedbackKey(text);
      const now = gameNow();
      const lastTime = systemLogCooldowns.get(normKey) || 0;
      if (now - lastTime < 3000) return; // 3 秒冷卻防洗版
      systemLogCooldowns.set(normKey, now);
    }

    statusLogHistory.push({
      id: 'stat_' + gameNow() + '_' + Math.random().toString(36).slice(2, 6),
      senderName,
      text,
      timeStr: getFormatTime(),
      kind: 'status',
      createdAt: gameNow(),
    });
    const maxStatLines = window.GATHER_CONFIG?.security?.maxStatusLogLines || 10;
    while (statusLogHistory.length > maxStatLines) {
      statusLogHistory.shift();
    }
    renderUnifiedChatAndStatus();
  }

  function renderUnifiedChatAndStatus() {
    const container = document.getElementById('proxChatMessages');
    if (!container) return;

    let itemsToRender = [];
    if (chatOnlyFilter) {
      itemsToRender = [...userChatHistory];
    } else {
      itemsToRender = [...userChatHistory, ...statusLogHistory].sort(
        (a, b) => a.createdAt - b.createdAt
      );
    }

    if (itemsToRender.length === 0) {
      container.innerHTML = `
        <div class="prox-chat-empty">
          🔒 對談上限20行 · 狀態/NPC上限10行 · 記憶體瞬時廣播不留存
        </div>
      `;
      return;
    }

    container.innerHTML = itemsToRender
      .map((item) => {
        if (item.kind === 'chat') {
          // 🔒 私人對談專屬醒目標籤與樣式 (明確標示只對特定人物聊天)
          if (item.isPrivate) {
            if (item.isSelf) {
              return `
                <div class="prox-chat-item whisper self">
                  <span class="prox-chat-time">[${item.timeStr}]</span>
                  <span class="whisper-badge to">🔒 密語</span>
                  <span class="whisper-target-label">對【${escapeHtml(item.targetName)}】:</span>
                  <span class="prox-chat-text">${escapeHtml(item.text)}</span>
                </div>
              `;
            } else {
              return `
                <div class="prox-chat-item whisper from">
                  <span class="prox-chat-time">[${item.timeStr}]</span>
                  <span class="whisper-badge from">🔒 私訊</span>
                  <span class="whisper-target-label">來自【${escapeHtml(item.senderName)}】:</span>
                  <span class="prox-chat-text">${escapeHtml(item.text)}</span>
                </div>
              `;
            }
          }
          return `
            <div class="prox-chat-item ${item.isSelf ? 'self' : 'other'}">
              <span class="prox-chat-time">[${item.timeStr}]</span>
              <span class="prox-chat-author">${escapeHtml(item.senderName)}${item.isSelf ? ' (你)' : ''}:</span>
              <span class="prox-chat-text">${escapeHtml(item.text)}</span>
            </div>
          `;
        } else {
          return `
            <div class="prox-chat-item kind-status">
              <span class="prox-chat-time">[${item.timeStr}]</span>
              <span class="prox-chat-author">【${escapeHtml(item.senderName)}】</span>
              <span class="prox-chat-text">${escapeHtml(item.text)}</span>
            </div>
          `;
        }
      })
      .join('');

    container.scrollTop = container.scrollHeight;
  }

  /**
   * 發送本機聊天訊息（主畫面與浮動子視窗共用邏輯）
   */
  function sendLocalChatMessage(text) {
    const cleanText = network.sanitizeText(text, 100);
    if (!cleanText) return false;

    const now = gameNow();
    if (now - network.lastChatAt < window.GATHER_CONFIG.security.chatCooldownMs) return false;
    network.lastChatAt = now;
    lastUserActionAt = now;

    pushUserChat(localPlayer.name, localPlayer.unit, cleanText, true);
    addExp(8);

    network.broadcastPacket('proximity_chat', {
      senderName: localPlayer.name,
      senderUnit: localPlayer.unit,
      text: cleanText,
      x: Math.round(localPlayer.x),
      y: Math.round(localPlayer.y),
    });

    // 附近 NPC 隨機精簡回應
    const nearNpc = nearbyPlayers.find((p) => p.isNpc);
    if (nearNpc && nearNpc.murmurs) {
      setTimeout(() => {
        const line = nearNpc.murmurs[Math.floor(Math.random() * nearNpc.murmurs.length)];
        pushStatusLog(nearNpc.name, `💬 「${line}」`);
      }, 550);
    }

    return true;
  }

  /**
   * 🔒 發送私人對談訊息（僅限真實線上使用者接收，NPC 無法進行私人對談）
   */
  function sendPrivateChatMessage(target, text) {
    if (!target) return false;

    // 檢查是否為 NPC：私人對談僅限真實使用者
    const isNpc =
      target.isNpc ||
      network.npcPlayers.has(target.id) ||
      String(target.id).startsWith('npc_');
    if (isNpc) {
      pushStatusLog('系統', `⚠️【${target.name}】為辦公室 NPC，私人對談僅開放對真實線上同仁使用！`);
      showToast(`⚠️【${target.name}】是 NPC，私人對談僅限對真實線上使用者發送！`, 'error');
      return false;
    }

    const cleanText = network.sanitizeText(text, 100);
    if (!cleanText) return false;

    const now = gameNow();
    if (now - network.lastChatAt < window.GATHER_CONFIG.security.chatCooldownMs) return false;
    network.lastChatAt = now;
    lastUserActionAt = now;

    // 本機顯示對真實目標的私人對談紀錄
    pushUserChat(localPlayer.name, localPlayer.unit, cleanText, true, true, target.name);
    addExp(8);

    // 遠端真實玩家私訊廣播 (僅 targetId 接收)
    network.broadcastPacket('private_chat', {
      targetId: target.id,
      targetName: target.name,
      senderName: localPlayer.name,
      senderUnit: localPlayer.unit,
      text: cleanText,
    });

    return true;
  }

  /**
   * 觸發原生桌面系統通知 (Notification API)
   * 當瀏覽器縮小或切換至其他視窗時發送，點擊直接拉起焦點
   */
  function triggerDesktopNotification(senderName, senderUnit, text) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const title = `💬 PP00 虛擬辦公室 · ${senderName}${senderUnit ? ` (${senderUnit})` : ''}`;
      const notif = new Notification(title, {
        body: text,
        tag: 'pp00_chat_' + gameNow(),
        renotify: true,
        silent: false,
      });

      notif.onclick = () => {
        window.focus();
        if (activePipWindow && !activePipWindow.closed) {
          try {
            activePipWindow.focus();
          } catch (_) {}
        }
        notif.close();
      };

      setTimeout(() => {
        try {
          notif.close();
        } catch (_) {}
      }, 5000);
    } catch (e) {
      console.warn('[Notification] 桌面通知發送異常:', e);
    }
  }

  /**
   * 更新浮動置頂按鈕的視覺狀態
   */
  function updatePipButtonState() {
    const btn = document.getElementById('togglePipChatBtn');
    if (!btn) return;
    const isOpen = activePipWindow && !activePipWindow.closed;
    btn.classList.toggle('active', !!isOpen);
    btn.textContent = isOpen ? '📌 浮動中 (開啟)' : '📌 浮動置頂';
  }

  /**
   * 開啟永遠置頂的浮動 Document Picture-in-Picture 摸魚子視窗
   */
  async function openPipChatWindow() {
    if (activePipWindow && !activePipWindow.closed) {
      try {
        activePipWindow.focus();
      } catch (_) {}
      return;
    }

    // 優先使用 Chromium 111+ Document Picture-in-Picture API（系統層級永遠置頂）
    if ('documentPictureInPicture' in window) {
      try {
        const pipWin = await window.documentPictureInPicture.requestWindow({
          width: 360,
          height: 300,
        });
        activePipWindow = pipWin;
        setupPipDom(pipWin);
        updatePipButtonState();
        return;
      } catch (err) {
        console.warn('[PiP] Document PiP 建立失敗，改用 window.open 彈出模式:', err);
      }
    }

    // Fallback: 獨立無邊框彈出式視窗
    const left = Math.max(20, (window.screen?.availWidth || 1200) - 400);
    const top = Math.max(20, (window.screen?.availHeight || 800) - 360);
    const pipWin = window.open(
      '',
      'PP00_PipChat',
      `width=360,height=300,left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );

    if (pipWin) {
      activePipWindow = pipWin;
      setupPipDom(pipWin);
      updatePipButtonState();
    } else {
      alert('⚠️ 瀏覽器阻擋了彈跳視窗，請點選網址列允許彈跳視窗以啟用浮動畫中畫！');
    }
  }

  /**
   * 初始化 PiP 視窗 DOM 與極簡低調終端機風格（摸魚防查崗·偽裝成後端監控 Log）
   */
  function setupPipDom(pipWin) {
    const pipDoc = pipWin.document;
    pipDoc.title = 'PP00 Terminal Chat (Standby)';

    const style = pipDoc.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background: #0b0f19;
        color: #e2e8f0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 11.5px;
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
        user-select: text;
      }
      .pip-header {
        background: #0f172a;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 700;
        color: #38bdf8;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      }
      .pip-badge {
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.4);
        color: #34d399;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 10px;
      }
      .pip-messages {
        flex: 1;
        overflow-y: auto;
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        gap: 5px;
        background: #070a13;
      }
      .pip-msg {
        line-height: 1.45;
        word-break: break-all;
      }
      .pip-time {
        color: #64748b;
        font-size: 10px;
        margin-right: 4px;
      }
      .pip-author {
        color: #38bdf8;
        font-weight: 700;
        margin-right: 4px;
      }
      .pip-msg.self .pip-author {
        color: #34d399;
      }
      .pip-text {
        color: #f1f5f9;
      }
      .pip-empty {
        color: #475569;
        font-size: 11px;
        text-align: center;
        margin-top: 40px;
      }
      .pip-form {
        display: flex;
        padding: 6px 8px;
        background: #0f172a;
        border-top: 1px solid rgba(148, 163, 184, 0.2);
        gap: 6px;
      }
      .pip-input {
        flex: 1;
        background: #090d16;
        border: 1px solid #334155;
        border-radius: 4px;
        color: #fff;
        padding: 5px 8px;
        font-family: inherit;
        font-size: 11.5px;
        outline: none;
      }
      .pip-input:focus {
        border-color: #38bdf8;
      }
      .pip-send-btn {
        background: #0284c7;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 0 10px;
        font-size: 11px;
        cursor: pointer;
        font-weight: 700;
      }
      .pip-send-btn:hover {
        background: #0369a1;
      }
    `;

    pipDoc.head.appendChild(style);
    pipDoc.body.innerHTML = `
      <div class="pip-header">
        <span>💻 PP00 Terminal (同事直通)</span>
        <span class="pip-badge">🔒 僅限真人對話</span>
      </div>
      <div id="pipMessages" class="pip-messages"></div>
      <form id="pipForm" class="pip-form">
        <input type="text" id="pipInput" class="pip-input" placeholder="按 Enter 快速回覆..." maxlength="100" autocomplete="off" />
        <button type="submit" class="pip-send-btn">發送</button>
      </form>
    `;

    syncPipAllMessages(pipWin);

    const form = pipDoc.getElementById('pipForm');
    const input = pipDoc.getElementById('pipInput');
    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value;
        if (!text || !text.trim()) return;
        const sent = sendLocalChatMessage(text);
        if (sent) {
          input.value = '';
        }
      });
    }

    const handleClose = () => {
      if (activePipWindow === pipWin) {
        activePipWindow = null;
        updatePipButtonState();
      }
    };
    pipWin.addEventListener('pagehide', handleClose);
    pipWin.addEventListener('unload', handleClose);
  }

  function syncPipAllMessages(pipWin) {
    try {
      const box = pipWin.document.getElementById('pipMessages');
      if (!box) return;
      box.innerHTML = '';
      if (userChatHistory.length === 0) {
        box.innerHTML = '<div class="pip-empty">暫無同事訊息 · 已過濾 NPC 碎碎念</div>';
        return;
      }
      userChatHistory.forEach((item) => {
        renderPipChatMessage(pipWin, item);
      });
      box.scrollTop = box.scrollHeight;
    } catch (e) {
      console.warn('[PiP] 同步訊息至子視窗失敗:', e);
    }
  }

  function renderPipChatMessage(pipWin, item) {
    try {
      const doc = pipWin.document;
      const box = doc.getElementById('pipMessages');
      if (!box) return;

      const empty = box.querySelector('.pip-empty');
      if (empty) empty.remove();

      const div = doc.createElement('div');
      div.className = 'pip-msg' + (item.isSelf ? ' self' : '') + (item.isPrivate ? ' whisper' : '');
      const authorLabel = item.isPrivate
        ? (item.isSelf ? `🔒 [密語 ➔ ${escapeHtml(item.targetName)}]` : `🔒 [私訊 ➔ 來自 ${escapeHtml(item.senderName)}]`)
        : `${escapeHtml(item.senderName)}${item.senderUnit ? ` (${escapeHtml(item.senderUnit)})` : ''}:`;
      div.innerHTML = `
        <span class="pip-time">[${escapeHtml(item.timeStr)}]</span>
        <span class="pip-author" style="${item.isPrivate ? 'color:#c084fc;font-weight:700;' : ''}">${authorLabel}</span>
        <span class="pip-text">${escapeHtml(item.text)}</span>
      `;
      box.appendChild(div);

      const maxLines = window.GATHER_CONFIG?.security?.maxUserChatLines || 20;
      while (box.children.length > maxLines) {
        box.removeChild(box.firstChild);
      }
      box.scrollTop = box.scrollHeight;
    } catch (e) {
      console.warn('[PiP] 子視窗訊息渲染異常:', e);
    }
  }

  function setupUnifiedChatUI() {
    const filterCb = document.getElementById('chatFilterOnlyChat');
    if (filterCb) {
      filterCb.addEventListener('change', (e) => {
        chatOnlyFilter = e.target.checked;
        renderUnifiedChatAndStatus();
      });
    }

    const burnBtn = document.getElementById('burnAllMsgBtn');
    if (burnBtn) {
      burnBtn.addEventListener('click', () => {
        userChatHistory.length = 0;
        statusLogHistory.length = 0;
        delete localPlayer.murmur;
        localPlayer.murmur = null;
        renderUnifiedChatAndStatus();
        if (activePipWindow && !activePipWindow.closed) {
          syncPipAllMessages(activePipWindow);
        }
        pushStatusLog('系統', '已清空聊天視窗所有對話與狀態紀錄');
      });
    }

    // 浮動置頂子視窗開關
    const togglePipBtn = document.getElementById('togglePipChatBtn');
    if (togglePipBtn) {
      togglePipBtn.addEventListener('click', () => {
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
        if (activePipWindow && !activePipWindow.closed) {
          try {
            activePipWindow.close();
          } catch (_) {}
          activePipWindow = null;
          updatePipButtonState();
        } else {
          openPipChatWindow();
        }
      });
    }

    const sendModeSel = document.getElementById('chatSendModeSelect');
    const chatInput = document.getElementById('proxChatInput');
    if (sendModeSel && chatInput) {
      sendModeSel.addEventListener('change', () => {
        const mode = sendModeSel.value;
        if (mode === 'chat') {
          chatInput.placeholder = '輸入對談訊息 (按 Enter 發送)...';
        } else if (mode === 'private') {
          const rawTarget = (selectedTargetId
            ? network.getAllOtherPlayers().find((p) => p.id === selectedTargetId)
            : null) || (nearbyPlayers.find((p) => !p.isNpc && !String(p.id).startsWith('npc_')) || null);
          const isNpc =
            rawTarget &&
            (rawTarget.isNpc ||
              network.npcPlayers.has(rawTarget.id) ||
              String(rawTarget.id).startsWith('npc_'));
          if (isNpc) {
            chatInput.placeholder = '🔒 NPC 無法進行私人對談，請點選真實線上同事...';
          } else {
            chatInput.placeholder = rawTarget
              ? `🔒 私聊 @${rawTarget.name} (僅對方可見)...`
              : '🔒 請先在名單或地圖中點選真實線上同事開啟私人對談...';
          }
        } else {
          chatInput.placeholder = '輸入 MURMUR (僅顯示在頭頂卡片，維持20秒)...';
        }
      });
    }

    const proxForm = document.getElementById('proxChatForm');
    if (proxForm) {
      proxForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const rawText = chatInput ? chatInput.value : '';
        const text = network.sanitizeText(rawText, 100);
        if (!text) return;

        const mode = sendModeSel ? sendModeSel.value : 'chat';
        if (mode === 'chat') {
          const sent = sendLocalChatMessage(text);
          if (sent && chatInput) chatInput.value = '';
        } else if (mode === 'private') {
          // 🔒 私人對談：僅指定的真實線上使用者可見
          const target = (selectedTargetId
            ? network.getAllOtherPlayers().find((p) => p.id === selectedTargetId)
            : null) || (nearbyPlayers.find((p) => !p.isNpc && !String(p.id).startsWith('npc_')) || null);
          if (!target) {
            pushStatusLog('系統', '⚠️ 請先在地圖或名單中點選一位真實線上同仁，再發送私人對談訊息！');
            showToast('⚠️ 請先點選一位真實線上同仁！', 'error');
            return;
          }
          const isNpc =
            target.isNpc ||
            network.npcPlayers.has(target.id) ||
            String(target.id).startsWith('npc_');
          if (isNpc) {
            pushStatusLog('系統', `⚠️【${target.name}】為辦公室 NPC，私人對談僅開放對真實線上同仁使用！`);
            showToast(`⚠️【${target.name}】是 NPC，私人對談僅限對真實線上使用者發送！`, 'error');
            return;
          }
          const sent = sendPrivateChatMessage(target, text);
          if (sent && chatInput) chatInput.value = '';
        } else {
          // 💭 MURMUR 模式：只會顯示在頭上，維持20秒，有卡片效果，重複MURMUR會蓋掉原本的
          const mood = 'normal';
          const now = gameNow();
          const ttl = window.GATHER_CONFIG?.security?.murmurTtlMs || 20000;
          localPlayer.murmur = {
            text,
            mood,
            createdAt: now,
            expiresAt: now + ttl,
          };
          network.broadcastPacket('player_murmur', { text, mood });
          // 注意：MURMUR 只會顯示在頭上，重複發送會蓋掉原本的，不寫入聊天記錄
          lastUserActionAt = now;
          if (chatInput) chatInput.value = '';
        }
      });
    }

    // 線上狀態下拉選單 (🟢 上線 / 🟡 閒置 / 🟠 離開 / 🔴 忙碌)
    const statusSel = document.getElementById('selfStatusSelect');
    if (statusSel) {
      statusSel.addEventListener('change', (e) => {
        const newStatus = e.target.value;
        localPlayer.status = newStatus;
        isAutoIdled = false;
        lastUserActionAt = gameNow();
        network.broadcastPacket('state_sync', { player: network.getPublicState() });
        const stMeta = window.GATHER_CONFIG.statuses.find((s) => s.id === newStatus);
        pushStatusLog('你', `線上狀態切換為：${stMeta ? stMeta.icon + ' ' + stMeta.label : newStatus}`);
        renderSidebarRoster();
      });
    }
  }

  const welcomeQueue = [];
  let welcomePlaying = false;

  function showWelcome(player) {
    if (!isLoggedIn) { welcomeQueue.length = 0; return; }
    // 登入歡迎動畫只顯示給「已經在線上」，看到新使用者登入時的提示（剛登入 3 秒內既有玩家不彈出）
    if (loginTimestamp && gameNow() - loginTimestamp <= 3000) return;
    if (player && (player.id === network?.clientId || (player.name === localPlayer.name && player.unit === localPlayer.unit))) return;
    welcomeQueue.push({ name: String(player.name || '同事'), unit: String(player.unit || '') });
    playNextWelcome();
  }

  function playNextWelcome() {
    if (welcomePlaying) return;
    if (!isLoggedIn) { welcomeQueue.length = 0; return; }
    const player = welcomeQueue.shift();
    if (!player) return;
    welcomePlaying = true;
    const overlay = document.createElement('div');
    overlay.className = 'gather-welcome';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = `<div class="welcome-card">
      <div class="welcome-spark" aria-hidden="true">✦</div>
      <div class="welcome-heading">歡迎加入辦公室</div>
      <div class="welcome-name"></div><div class="welcome-unit"></div>
      <div class="welcome-caption">很高興見到你！</div>
    </div>`;
    overlay.querySelector('.welcome-name').textContent = player.name;
    overlay.querySelector('.welcome-unit').textContent = player.unit;
    for (let i = 0; i < 18; i++) {
      const particle = document.createElement('i');
      particle.className = 'welcome-confetti';
      particle.setAttribute('aria-hidden', 'true');
      const angle = (i / 18) * Math.PI * 2;
      particle.style.setProperty('--dx', `${Math.cos(angle) * (100 + i % 3 * 30)}px`);
      particle.style.setProperty('--dy', `${Math.sin(angle) * (90 + i % 4 * 20)}px`);
      particle.style.setProperty('--delay', `${i % 4 * 60}ms`);
      particle.style.setProperty('--color', ['#67e8f9', '#fcd34d', '#c4b5fd'][i % 3]);
      overlay.appendChild(particle);
    }
    document.body.appendChild(overlay);
    setTimeout(() => {
      overlay.classList.add('welcome-leaving');
      setTimeout(() => {
        overlay.remove();
        welcomePlaying = false;
        playNextWelcome();
      }, 300);
    }, 3000);
  }

  const combatToastCooldowns = new Map();

  function appendCombatText(htmlText) {
    if (typeof document === 'undefined') return false;
    let feed = document.getElementById('mobileCombatFeed');
    if (!feed) {
      feed = document.createElement('div');
      feed.id = 'mobileCombatFeed';
      feed.setAttribute('role', 'log');
      feed.setAttribute('aria-live', 'polite');
      document.body.appendChild(feed);
    }
    const parsed = document.createElement('template');
    parsed.innerHTML = String(htmlText);
    const text = parsed.content.textContent || '';
    if (!text) return false;

    // 所有提醒訊息 3 秒冷卻防刷屏 (正規化去除動態倒數數字)
    const normKey = typeof normalizeSystemFeedbackKey === 'function' ? normalizeSystemFeedbackKey(text) : text;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const lastTime = combatToastCooldowns.get(normKey) || 0;
    if (now - lastTime < 3000) return false;
    combatToastCooldowns.set(normKey, now);

    const line = document.createElement('div');
    line.textContent = text;
    feed.appendChild(line);
    setTimeout(() => {
      line.remove();
    }, 3000);
    while (feed.children.length > 10) feed.firstElementChild.remove();
    return true;
  }

  function pushCombatLog(sender, text) {
    pushStatusLog(sender, text);
    appendCombatText(text);
  }

  function showCombatToast(htmlText, type = 'info') {
    if (appendCombatText(htmlText)) {
      pushStatusLog('系統', String(htmlText).replace(/<[^>]*>/g, ''));
    }
  }

  function showToast(htmlText, type = 'info', onAction = null) {
    if (appendCombatText(htmlText)) {
      pushStatusLog('系統', String(htmlText).replace(/<[^>]*>/g, ''));
    }
  }

  window.isChatPanelCollapsed = isChatPanelCollapsed;
  window.showCenterPrivateChatBox = showCenterPrivateChatBox;
  window.dismissCenterPrivateChatBox = dismissCenterPrivateChatBox;
  window.openChatToReply = openChatToReply;
  window.openColleagueProfileCard = openColleagueProfileCard;

  let officeLogoutPromise = null;
  window.logoutAndLeaveOffice = function () {
    if (officeLogoutPromise) return officeLogoutPromise;
    officeLogoutPromise = (async () => {
    if(season.enabled&&season.client){try{await season.client.flush();await season.client.send("logout");season.client.clear();}catch(e){officeLogoutPromise=null;seasonError(e);return;}}
    savePersistentState();
    saveLoginSession(false);
    isLoggedIn = false;
    loginTimestamp = 0;
    welcomeQueue.length = 0;
    if (localPlayer.actionState === 'toilet') {
      const activeStall = window.WORLD_MAP.toiletStalls.find((s) => s.occupiedBy === localPlayer.id);
      if (activeStall) {
        activeStall.occupiedBy = null;
        activeStall.doorOpen = 0;
      }
    }
    window.WORLD_MAP.toiletStalls.forEach((s) => {
      if (s.occupiedBy === localPlayer.id) s.occupiedBy = null;
    });
    localPlayer.occupiedSpotId = null;
    localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;

    if (window.gatherSupabase) {
      await window.gatherSupabase.logoutUser();
    }
    if (network && typeof network.disconnect === 'function') {
      await network.disconnect();
    }
    isLoggedIn = false;
    loginTimestamp = 0;
    welcomeQueue.length = 0;

    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'close_gather_office' }, window.location.origin);
      } catch (_) {}
    } else {
      window.location.href = '../../index.html';
    }
    })();
    return officeLogoutPromise;
  };

  function updateSelfHudCard() {
    const av = window.getAvatarMetaById
      ? window.getAvatarMetaById(localPlayer.avatarId)
      : (window.AVATAR_CATALOG || []).find((a) => a.id === localPlayer.avatarId) || window.AVATAR_CATALOG[0];

    // 在左下聊天視窗頂部畫布繪製玩家 32x32 像素頭像
    const hudCanvas = document.getElementById('hudSelfAvatarCanvas');
    if (hudCanvas) {
      const hCtx = hudCanvas.getContext('2d');
      hCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
      window.drawWackyAvatar(hCtx, {
        avatarId: localPlayer.avatarId,
        outfitAvatarId: localPlayer.outfitAvatarId,
        x: 16,
        y: 28,
        dir: 'down',
        isMoving: false,
        tick: 0,
        scale: 0.52,
      });
    }

    const nameEl = document.getElementById('hudSelfName');
    if (nameEl) nameEl.textContent = `${localPlayer.name} (${localPlayer.unit})`;

    const itemEl = document.getElementById('hudSelfHeldItem');
    const active = getActiveEquippedItem();
    if (itemEl) itemEl.textContent = active ? active.emoji : '🚫';

    const expEl = document.getElementById('hudExpBadge');
    if (expEl) {
      const equipExpPct = getTotalEquippedExpBonusPct();
      expEl.textContent = `${progression.title} · ${progression.exp} EXP (+${progression.speedBonusPct}%速|+${equipExpPct}%裝)`;
    }

    const sel = document.getElementById('selfStatusSelect');
    if (sel && sel.value !== localPlayer.status) {
      sel.value = localPlayer.status;
    }
  }

  /**
   * 繪製左側「PP00 虛擬辦公室」人物清單（僅保留使用者、NPC 與怪物，使用頭像 Canvas，刪去文字敘述）
   */
  function renderSidebarRoster() {
    const listEl = document.getElementById('onlineRosterList');
    if (!listEl) return;
    const others = network.getAllOtherPlayers();
    const mobs = (ecosystem && ecosystem.mobs) || [];
    const totalCount = 1 + others.length + mobs.length;
    const countBadge = document.getElementById('onlineCountBadge');
    if (countBadge) countBadge.textContent = String(totalCount);
    const mobileCountBadge = document.getElementById('mobileOnlineCountBadge');
    if (mobileCountBadge) mobileCountBadge.textContent = String(totalCount);

    const all = [
      { ...localPlayer, isSelf: true },
      ...others,
      ...mobs.map((m) => ({
        id: m.id,
        name: `👾 ${m.name} (HP:${m.hp})`,
        unit: '怪物',
        status: m.isBerserk ? 'busy' : 'active',
        isMob: true,
        mob: m,
      })),
    ];

    listEl.innerHTML = '';
    all.forEach((p) => {
      const itemEl = document.createElement('div');
      itemEl.className = `roster-item ${p.isSelf ? 'is-self' : ''}`;
      itemEl.dataset.pid = p.id;

      // 28x28 像素獨立頭像 Canvas
      const cv = document.createElement('canvas');
      cv.className = 'roster-avatar-canvas';
      cv.width = 28;
      cv.height = 28;
      const cctx = cv.getContext('2d');
      if (p.isMob) {
        cctx.fillStyle = p.mob.color || '#ef4444';
        cctx.fillRect(4, 4, 20, 20);
        cctx.fillStyle = '#0f172a';
        cctx.fillRect(8, 8, 4, 4);
        cctx.fillRect(16, 8, 4, 4);
      } else {
        window.drawWackyAvatar(cctx, {
          avatarId: p.avatarId,
        outfitAvatarId: p.outfitAvatarId,
          x: 14,
          y: 24,
          dir: 'down',
          isMoving: false,
          tick: 0,
          scale: 0.44,
        });
      }

      const st =
        window.GATHER_CONFIG.statuses.find((s) => s.id === p.status) ||
        window.GATHER_CONFIG.statuses[0];

      const infoEl = document.createElement('div');
      infoEl.className = 'roster-info';
      infoEl.innerHTML = `
        <div class="roster-name-row">
          <span class="status-dot-mini" style="background:${st ? st.dot : '#22c55e'}"></span>
          <span class="roster-name">${escapeHtml(p.name)}</span>
          <span class="roster-unit">${escapeHtml(p.unit)}</span>
          <span>${escapeHtml(p.heldItem || '')}</span>
        </div>
      `;

      itemEl.appendChild(cv);
      itemEl.appendChild(infoEl);

      if (!p.isSelf && !p.isMob) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'roster-join-btn';
        btn.textContent = '走向他';
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          walkToPlayer(p.id);
        });
        itemEl.appendChild(btn);
      } else if (p.isSelf) {
        const youTag = document.createElement('span');
        youTag.className = 'roster-you-tag';
        youTag.textContent = 'You';
        itemEl.appendChild(youTag);
      }

      if (!p.isMob) {
        itemEl.addEventListener('click', () => {
          const found = others.find((o) => o.id === p.id);
          if (found) {
            selectedTargetId = found.id;
            openColleagueProfileCard(found);
          }
        });
      }

      listEl.appendChild(itemEl);
    });
  }

  function openColleagueProfileCard(colleague) {
    const card = document.getElementById('colleagueProfileCard');
    if (!card) return;
    const av = window.getAvatarMetaById
      ? window.getAvatarMetaById(colleague.avatarId)
      : window.AVATAR_CATALOG.find((a) => a.id === colleague.avatarId) || window.AVATAR_CATALOG[0];
    const st =
      window.GATHER_CONFIG.statuses.find((s) => s.id === colleague.status) ||
      window.GATHER_CONFIG.statuses[0];

    const badgeEl = document.getElementById('profileCardBadge');
    if (badgeEl) badgeEl.textContent = av.badge;
    const nameEl = document.getElementById('profileCardName');
    if (nameEl) nameEl.textContent = `${colleague.name} (${colleague.unit})`;
    const statusEl = document.getElementById('profileCardStatus');
    if (statusEl) {
      statusEl.innerHTML = `<span class="status-dot-mini" style="background:${st.dot}"></span> ${st.label} · 手持 ${colleague.heldItem || '無裝備'}`;
    }
    const roleEl = document.getElementById('profileCardRole');
    if (roleEl) roleEl.textContent = `${av.name} — ${av.tag}`;

    card.classList.remove('hidden');

    const waveBtn = document.getElementById('profileWaveBtn');
    if (waveBtn) waveBtn.onclick = () => triggerProximitySkill('wave', true);
    const walkBtn = document.getElementById('profileWalkBtn');
    if (walkBtn) walkBtn.onclick = () => walkToPlayer(colleague.id);

    const isNpc =
      colleague.isNpc ||
      (network && network.npcPlayers ? network.npcPlayers.has(colleague.id) : false) ||
      String(colleague.id).startsWith('npc_');

    const privateBtn = document.getElementById('profilePrivateChatBtn');
    if (privateBtn) {
      privateBtn.classList.remove('active');
      if (isNpc) {
        // NPC 無法開啟私人對談，設為禁用狀態並明確提示
        privateBtn.disabled = true;
        privateBtn.classList.add('disabled');
        privateBtn.title = 'NPC 無法私人對談（私人對談功能僅開放對真實線上同仁使用）';
        privateBtn.onclick = (e) => {
          e.preventDefault();
          showToast(`⚠️【${colleague.name}】是辦公室 NPC，私人對談僅開放對真實線上同仁使用！`, 'error');
          pushStatusLog('系統', `⚠️【${colleague.name}】為 NPC，私人對談功能僅限對真實線上使用者開放！`);
        };
        // 若聊天模式目前剛好在 private，自動退回一般對談模式
        const sendModeSel = document.getElementById('chatSendModeSelect');
        if (sendModeSel && sendModeSel.value === 'private') {
          sendModeSel.value = 'chat';
          dispatchChangeEvent(sendModeSel);
        }
      } else {
        // 真實線上使用者：點選後聊天模式直接預設為「私訊」
        privateBtn.disabled = false;
        privateBtn.classList.remove('disabled');
        privateBtn.classList.add('active');
        privateBtn.title = '點擊切換私人對談/公開對談模式';

        const sendModeSel = document.getElementById('chatSendModeSelect');
        const chatInput = document.getElementById('proxChatInput');
        if (sendModeSel) {
          sendModeSel.value = 'private';
          dispatchChangeEvent(sendModeSel);
        }
        if (chatInput && window.innerWidth > 900) {
          chatInput.focus();
        }
        pushStatusLog('系統', `🔒 已選定【${colleague.name}】，聊天模式已自動預設為「私訊」（僅對方可見）`);

        privateBtn.onclick = () => {
          if (window.innerWidth <= 900) {
            const chatPanel = document.getElementById('proxChatPanel');
            if (chatPanel) {
              chatPanel.classList.add('mobile-open');
              chatPanel.classList.remove('collapsed');
            }
          }
          const isCurrentlyPrivate = sendModeSel && sendModeSel.value === 'private';
          if (sendModeSel) {
            sendModeSel.value = isCurrentlyPrivate ? 'chat' : 'private';
            dispatchChangeEvent(sendModeSel);
          }
          if (!isCurrentlyPrivate) {
            privateBtn.classList.add('active');
            if (chatInput && window.innerWidth > 900) chatInput.focus();
            pushStatusLog('系統', `🔒 已切換至與【${colleague.name}】的私人密語通道（僅對方可見）`);
          } else {
            privateBtn.classList.remove('active');
            pushStatusLog('系統', `💬 已切換回公開辦公室對談`);
          }
        };
      }
    }
  }

  // =========================================================================
  // 7. 主遊戲更新與渲染迴圈
  // =========================================================================
  function fitOverviewCamera() {
    const compact = window.innerWidth <= 900 || window.matchMedia('(pointer: coarse)').matches;
    const hud = compact ? document.querySelector('.mobile-hud-stack')?.getBoundingClientRect() : null;
    const dock = compact ? document.querySelector('.bottom-hud-dock')?.getBoundingClientRect() : null;
    const left = 8;
    const top = Math.max(8, (hud?.bottom || 0) + 8);
    const bottom = Math.max(top + 1, Math.min(canvas.height - 8, (dock?.top ?? canvas.height) - 8));
    const width = Math.max(1, canvas.width - 16);
    const height = bottom - top;
    camera.zoom = Math.min(width / window.WORLD_MAP.width, height / window.WORLD_MAP.height);
    // Camera coordinates are world units. Negative offsets place the map inside
    // the visible play area and preserve the existing click-to-world conversion.
    camera.x = -(left + (width - window.WORLD_MAP.width * camera.zoom) / 2) / camera.zoom;
    camera.y = -(top + (height - window.WORLD_MAP.height * camera.zoom) / 2) / camera.zoom;
  }

  function handleResize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (window.visualViewport) {
      const kbOffset = Math.max(0, window.innerHeight - window.visualViewport.height);
      document.documentElement.style.setProperty('--keyboard-offset', `${kbOffset}px`);
    }
    if (camera.overviewMode) {
      fitOverviewCamera();
    } else {
      camera.zoom = window.innerWidth <= 900
        ? Math.max(0.62, Math.min(0.9, Math.min(canvas.width, canvas.height) / 550))
        : Math.max(0.82, Math.min(1.12, window.innerWidth / 1440));
    }
  }

  function ensurePlayerNotStuck() {
    if (!window.isPositionBlocked(localPlayer.x, localPlayer.y, 14, localPlayer.id)) return;
    for (let r = 16; r <= 220; r += 16) {
      for (let deg = 0; deg < 360; deg += 30) {
        const rad = (deg * Math.PI) / 180;
        const cx = Math.round(localPlayer.x + Math.cos(rad) * r);
        const cy = Math.round(localPlayer.y + Math.sin(rad) * r);
        if (!window.isPositionBlocked(cx, cy, 14, localPlayer.id)) {
          localPlayer.x = cx;
          localPlayer.y = cy;
          return;
        }
      }
    }
  }

  function updateLocalPlayerMovement() {
    if (!isLoggedIn) return;

    // 🚑 檢查重傷休養狀態：重傷躺平無法動彈，即時動態更新倒數並提供緊急甦醒按鈕
    if (localPlayer.isInjured) {
      if (gameNow() < (localPlayer.injuredUntil || 0)) {
        if (Number.isFinite(localPlayer.injuredX) && Number.isFinite(localPlayer.injuredY)) {
          localPlayer.x = localPlayer.injuredX;
          localPlayer.y = localPlayer.injuredY;
        } else {
          localPlayer.injuredX = localPlayer.x;
          localPlayer.injuredY = localPlayer.y;
        }
        localPlayer.actionState = 'sleep_bed';
        localPlayer.isMoving = false;
        localPlayer.autoWalkTarget = null;
        localPlayer.knockback = null;
        updateInjuryCountdownHUD();
        if (tick % 6 === 0 && network) {
          network.broadcastPacket('move', { player: network.getPublicState() });
        }
        return;
      } else {
        // 休養期滿，傷勢痊癒！
        localPlayer.isInjured = false;
        localPlayer.injuredUntil = 0;
        localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
        savePersistentState();
        updatePoseLabelUI();
        updateInjuryCountdownHUD();
        pushStatusLog('系統', '✨ 傷勢完全痊癒！你已完成休養，恢復自由行動！');
        showToast('✨ 傷勢完全痊癒！恢復自由走動能力！', 'join');
        if (network) {
          network.broadcastPacket('state_sync', { player: network.getPublicState() });
          window.OfficeCombat?.send(network, 'recovery_release');
        }
      }
    } else {
      updateInjuryCountdownHUD();
    }

    if(season.enabled&&isLoggedIn){localPlayer.speed=(window.OfficeProgression?.speed ? window.OfficeProgression.speed(localPlayer.baseSpeed,progression.level,season.effects,gameNow()) : localPlayer.baseSpeed);if(localPlayer.speed===0&&!localPlayer.beatingSession){localPlayer.isMoving=false;return;}if((keys.w||keys.a||keys.s||keys.d||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight||touchMove.x||touchMove.y||localPlayer.autoWalkTarget||localPlayer.isMoving)&&season.client?.snapshot?.player?.channel){
      const ch = season.client.snapshot.player.channel;
      if(Math.hypot(localPlayer.x - ch.x, localPlayer.y - ch.y) > 20){
        season.client.snapshot.player.channel = null;
        if(!season.cancelling){season.cancelling=true;seasonSend("cancel").finally(()=>season.cancelling=false);}
        if(['sit_code', 'pray_kuaikuai', 'play_arcade'].includes(localPlayer.actionState)){
          localPlayer.actionState=null;
        }
      }
    }}
    else if(!season.enabled&&isLoggedIn){
      const shrineSpeedBoost = (gameNow() < (localPlayer.shrineSpeedUntil || 0) ? 0.35 : 0);
      localPlayer.speed = (localPlayer.baseSpeed * (1 + (progression.speedBonusPct || 0) / 100 + shrineSpeedBoost)) * (gameNow() < (localPlayer.lightInjuredUntil || 0) ? 0.7 : 1);
    }
    if(gameNow()<(localPlayer.stunnedUntil||0)){localPlayer.isMoving=false;localPlayer.knockback=null;return;}
    if (gameNow() < (localPlayer.ghostSleepUntil || 0)) {
      localPlayer.actionState = 'scared_faint'; localPlayer.isMoving = false; return;
    }
    if (localPlayer.ghostSleepUntil) {
      localPlayer.ghostSleepUntil = 0;
      if (localPlayer.actionState === 'scared_faint' || localPlayer.actionState === 'slack_nap') localPlayer.actionState = null;
      updatePoseLabelUI();
    }

    // 0. 檢查鳥人指揮官 10 秒會議室鎖定是否已到期：到期自動開門並解除動作，確保絕不卡住！
    if (
      window.MEETING_LOCK_STATE &&
      window.MEETING_LOCK_STATE.lockedUntil > 0 &&
      gameNow() >= window.MEETING_LOCK_STATE.lockedUntil
    ) {
      window.MEETING_LOCK_STATE.lockedUntil = 0;
      window.MEETING_LOCK_STATE.roomId = null;
      localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
      updatePoseLabelUI();
      ensurePlayerNotStuck();
      showToast('🔓 10 秒閉門會議結束！會議室大門已自動開啟，你已自由脫困！', 'join');
    }

    // 防卡死安全機制：若玩家座標意外重疊於會議桌或牆壁碰撞區，立即自動彈出至最近空地
    ensurePlayerNotStuck();

    // 1. 處理被暴走 NPC 攻擊後的「自動被打飛」拋物線物理位移（絕不定身，玩家仍可隨時移動！）
    if (localPlayer.knockback && localPlayer.knockback.ticksLeft > 0) {
      const kb = localPlayer.knockback;
      const mapW = window.WORLD_MAP.width;
      const mapH = window.WORLD_MAP.height;

      const nextKbX = Math.max(175, Math.min(mapW - 145, localPlayer.x + kb.vx));
      const nextKbY = Math.max(92, Math.min(mapH - 110, localPlayer.y + kb.vy));
      if (!window.isPositionBlocked(nextKbX, localPlayer.y, 14, localPlayer.id)) {
        localPlayer.x = nextKbX;
      }
      if (!window.isPositionBlocked(localPlayer.x, nextKbY, 14, localPlayer.id)) {
        localPlayer.y = nextKbY;
      }

      // 拋物線騰空高度與摩擦力衰減
      const progress = 1 - kb.ticksLeft / kb.totalTicks;
      localPlayer.jumpOffset = Math.sin(progress * Math.PI) * 52;
      kb.vx *= 0.89;
      kb.vy *= 0.89;
      kb.ticksLeft--;

      if (kb.ticksLeft <= 0) {
        localPlayer.knockback = null;
        localPlayer.jumpOffset = 0;
        ensurePlayerNotStuck();
      }
      if (tick % 3 === 0) {
        network.broadcastPacket('move', { player: network.getPublicState() });
      }
    }

    // 🥊 檢查受 VP / PP00 處長 / 打掃阿姨連續毆打管教狀態
    if (localPlayer.beatingSession) {
      const sess = localPlayer.beatingSession;
      if (gameNow() < sess.until) {
        localPlayer.isMoving = false;
        localPlayer.autoWalkTarget = null;
        localPlayer.knockback = null;
        localPlayer.actionState = 'cry';
        if (tick % 10 === 0) {
          sess.npc.weaponSwing = {
            emoji: sess.weaponEmoji,
            ticksLeft: 10,
            totalTicks: 10,
            startedAt: gameNow(),
            duration: 180,
          };
          sess.npc.jumpOffset = 8 + Math.random() * 8;
          localPlayer.jumpOffset = Math.sin(tick * 0.9) * 4;
          localPlayer.emote = {
            emoji: ['💥', '💫', '😭', '🤕'][Math.floor(Math.random() * 4)],
            expiresAt: gameNow() + 450,
          };
          vfxList.push({
            type: 'click_ring',
            x: localPlayer.x + (Math.random() * 16 - 8),
            y: localPlayer.y - 10 + (Math.random() * 16 - 8),
            radius: 8,
            maxRadius: 40,
            alpha: 0.9,
            color: '#facc15',
          });
          spawnConfetti(localPlayer.x, localPlayer.y - 12);
        }
        if (tick % 80 === 0) {
          const hurtLines = [
            '哎唷！長官別打了！我錯了！',
            '疼疼疼！阿姨手下留情！',
            '嗚嗚嗚再也不敢動手了！',
            '好痛！考績我不要了，別打了！',
          ];
          localPlayer.murmur = {
            text: hurtLines[Math.floor(Math.random() * hurtLines.length)],
            mood: 'cry',
            createdAt: gameNow(),
            expiresAt: gameNow() + 1600,
          };
        }
        return;
      } else {
        const npcName = sess.npc.name;
        sess.npc.isBerserk = false;
        localPlayer.beatingSession = null;
        localPlayer.isRestrained = false;
        localPlayer.restrainedUntil = 0;
        localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
        cancelContextualAction();
        ensurePlayerNotStuck();
        pushStatusLog('系統', `✨ 【${npcName}】連續毆打懲戒結束，消氣放你一馬！`);
        showToast(`✨ 【${npcName}】管教結束，恢復行動自由！`, 'success');
        if (network) {
          network.broadcastPacket('state_sync', { player: network.getPublicState() });
        }
        return;
      }
    }

    // 🚨 檢查受夜間警衛管教拘禁狀態：在廁所被管教 10 秒無法動彈與反擊
    if (localPlayer.isRestrained) {
      if (gameNow() < (localPlayer.restrainedUntil || 0)) {
        localPlayer.isMoving = false;
        localPlayer.autoWalkTarget = null;
        localPlayer.knockback = null;
        if (tick % 20 === 0) {
          spawnConfetti(localPlayer.x, localPlayer.y - 12);
        }
        return;
      } else {
        localPlayer.isRestrained = false;
        localPlayer.restrainedUntil = 0;
        // Exit while action/occupancy still identify the stall; clearing them first
        // strands the player behind its closed, collidable door.
        cancelContextualAction();
        ensurePlayerNotStuck();
        pushStatusLog('系統', '👮 警衛管教結束！反省完畢，恢復行動與反擊自由！');
        showToast('👮 警衛管教結束，恢復行動與反擊自由！', 'success');
        if (network) {
          network.broadcastPacket('state_sync', { player: network.getPublicState() });
        }
      }
    }

    // 🩹 偵測是否靠近身受重傷的同仁 (距離 <= 75px)
    nearbyInjuredColleague = null;
    if (!localPlayer.isInjured && network && network.remotePlayers) {
      for (const p of network.remotePlayers.values()) {
        if (p && p.isInjured && p.id !== localPlayer.id) {
          const dist = Math.hypot(p.x - localPlayer.x, p.y - localPlayer.y);
          if (dist <= 75) {
            nearbyInjuredColleague = p;
            break;
          }
        }
      }
    }

    // 🩹 推進正在進行中的 5 秒緊急醫療會話
    if (!season.enabled && activeHealingSession) {
      const elapsed = gameNow() - activeHealingSession.startTime;
      const progress = Math.min(1, elapsed / activeHealingSession.duration);
      const targetP = network.remotePlayers.get(activeHealingSession.targetId);

      // 中斷條件：若傷者離開或距離大於 95px、或醫護者遭擊退
      if (!targetP || Math.hypot(targetP.x - localPlayer.x, targetP.y - localPlayer.y) > 95 || (localPlayer.knockback && localPlayer.knockback.ticksLeft > 0)) {
        showToast('⚠️ 距離過遠或遭受干擾，急救醫療中斷！', 'error');
        pushStatusLog('系統', `⚠️ 【${localPlayer.name}】對【${activeHealingSession.targetName}】的急救醫療中斷！`);
        if (network) {
          network.broadcastPacket('heal_cancel', {
            healerId: network.clientId,
            targetId: activeHealingSession.targetId,
          });
        }
        activeHealingSession = null;
        localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
      } else if (elapsed >= activeHealingSession.duration) {
        // 滿 5 秒：急救圓滿大成功！傷者立即恢復！
        if (network) {
          network.broadcastPacket('heal_complete', {
            healerId: network.clientId,
            healerName: localPlayer.name,
            targetId: activeHealingSession.targetId,
            targetName: activeHealingSession.targetName,
          });
        }
        targetP.isInjured = false;
        targetP.beingHealed = false;
        targetP.actionState = null;
        spawnConfetti(localPlayer.x, localPlayer.y - 20);
        spawnConfetti(targetP.x, targetP.y - 20);
        const gained = addExp(50);
        updateSelfHudCard();
        showToast(`🎉 成功治癒【${activeHealingSession.targetName}】！獲得 ${gained} EXP 急救獎勵！`, 'join');
        pushStatusLog('系統', `💖 同仁【${localPlayer.name}】完成 5 秒精湛急救，成功治癒【${activeHealingSession.targetName}】！`);
        activeHealingSession = null;
        localPlayer.actionState = null; localPlayer.injuredX = null; localPlayer.injuredY = null;
      } else {
        // 每 10 tick 廣播一次醫療進度
        if (tick % 10 === 0 && network) {
          network.broadcastPacket('heal_progress', {
            healerId: network.clientId,
            targetId: activeHealingSession.targetId,
            progress,
          });
        }
      }
    }

    // 🚑 重傷休養狀態已於 updateLocalPlayerMovement 開頭優先檢測並即時更新

    let dx = 0;
    let dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    dx += touchMove.x;
    dy += touchMove.y;

    if (dx !== 0 || dy !== 0) {
      lastUserActionAt = gameNow();
      localPlayer.autoWalkTarget = null;
      cancelContextualAction();
      const len = Math.hypot(dx, dy);
      dx = (dx / len) * localPlayer.speed;
      dy = (dy / len) * localPlayer.speed;
    } else if (!localPlayer.actionState && localPlayer.autoWalkTarget) {
      if (localPlayer.autoWalkTarget.followId) {
        const followTarget = network
          .getAllOtherPlayers()
          .find((p) => p.id === localPlayer.autoWalkTarget.followId);
        if (followTarget) {
          localPlayer.autoWalkTarget.x = followTarget.x - 45;
          localPlayer.autoWalkTarget.y = followTarget.y + 12;
        }
      }
      const tx = localPlayer.autoWalkTarget.x - localPlayer.x;
      const ty = localPlayer.autoWalkTarget.y - localPlayer.y;
      const dist = Math.hypot(tx, ty);
      if (dist > 5) {
        dx = (tx / dist) * (localPlayer.speed * 1.15);
        dy = (ty / dist) * (localPlayer.speed * 1.15);
      } else {
        if (!localPlayer.autoWalkTarget.followId) {
          localPlayer.autoWalkTarget = null;
        }
      }
    }

    if (dx !== 0 || dy !== 0) {
      localPlayer.isMoving = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        localPlayer.dir = dx > 0 ? 'right' : 'left';
      } else {
        localPlayer.dir = dy > 0 ? 'down' : 'up';
      }

      const nextX = localPlayer.x + dx;
      const nextY = localPlayer.y + dy;

      if (!window.isPositionBlocked(nextX, localPlayer.y, 14, localPlayer.id)) {
        localPlayer.x = nextX;
      }
      if (!window.isPositionBlocked(localPlayer.x, nextY, 14, localPlayer.id)) {
        localPlayer.y = nextY;
      }

      for (let i = season.enabled ? -1 : ecosystem.groundItems.length - 1; i >= 0; i--) {
        const gItem = ecosystem.groundItems[i];
        if (gItem.dropY <= 5 && Math.hypot(localPlayer.x - gItem.x, localPlayer.y - gItem.y) < 30) {
          if(!window.OfficeWardrobe.canAdd(localPlayer,gItem,true))continue;
          if(gItem.combatDrop){if(tick%30===0)window.OfficeCombat.send(network,'combat_claim',{uid:gItem.uid});continue;}
          const added = addItemToInventory(gItem, true);
          const removedG = ecosystem.groundItems.splice(i, 1)[0];
          if (removedG) {
            network.broadcastPacket('item_collected', { itemId: removedG.uid || removedG.id });
          }
          const gained = addExp(15);
          updateSelfHudCard();
          showCombatToast(
            `🎒 走過撿起隨機掉落物 ${added.emoji} ${escapeHtml(added.name)}（經驗加成 +${
              added.expBonusPct
            }%｜獲得 +${gained} EXP）！`,
            'join'
          );
        }
      }

      if (tick % 4 === 0) {
        network.broadcastPacket('move', { player: network.getPublicState() });
      }
    } else {
      if (localPlayer.isMoving) {
        localPlayer.isMoving = false;
        network.broadcastPacket('move', { player: network.getPublicState() });
      }
    }

    // 遞減揮武器動畫計時
    if (localPlayer.weaponSwing && localPlayer.weaponSwing.ticksLeft > 0) {
      localPlayer.weaponSwing.ticksLeft--;
      if (localPlayer.weaponSwing.ticksLeft <= 0) {
        localPlayer.weaponSwing = null;
      }
    }
  }

  function updateProximityState() {
    const others = network.getAllOtherPlayers();
    const radius = window.GATHER_CONFIG.security.proximityRadiusPx;
    nearbyPlayers = others
      .map((p) => ({
        player: p,
        dist: Math.hypot(p.x - localPlayer.x, p.y - localPlayer.y),
      }))
      .filter((item) => !item.player.combatDown && item.dist <= radius)
      .sort((a, b) => a.dist - b.dist)
      .map((item) => item.player);

    const dock = document.getElementById('proximitySkillDock');
    const targetLabel = document.getElementById('proxTargetName');
    if (nearbyPlayers.length > 0) {
      const closest = nearbyPlayers[0];
      dock.classList.add('nearby-active');
      targetLabel.innerHTML = `🟢 已感應靠近：<b>${escapeHtml(closest.name)}</b>（按數字鍵 <kbd>1</kbd>～<kbd>6</kbd> 互動）`;
    } else {
      dock.classList.remove('nearby-active');
      targetLabel.innerHTML = '📡 靠近人物啟動互動技能（支援數字熱鍵 <kbd>1</kbd>～<kbd>6</kbd>｜靠近設備按 <kbd>E</kbd>）';
    }

    // 更新靠近辦公室設備（電腦、馬桶、洗手台、茶水間、機台、台股大螢幕）的情境互動提示按鈕
    nearbyFacilityAction = detectNearbyFacility();
    const facBtn = document.getElementById('facilityTriggerBtn');
    if (facBtn) facBtn.style.display = 'none';
  }

  function getCurrentHourFloat() {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  }

  function getMinimapRect() {
    if (window.innerWidth <= 900 || window.matchMedia('(pointer: coarse)').matches) {
      return { x: -1000, y: -1000, w: 0, h: 0 };
    }
    const w = 195;
    const h = Math.round(w * 132 / 195);
    return {
      x: canvas.width - w - 16,
      y: 58,
      w,
      h,
    };
  }

  function renderMinimapRadar(ctx, allPlayers) {
    if (camera.minimapHidden) return;
    const mm = getMinimapRect();
    if (!mm.w) return;
    const scaleX = mm.w / window.WORLD_MAP.width;
    const scaleY = mm.h / window.WORLD_MAP.height;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') { ctx.roundRect(mm.x, mm.y, mm.w, mm.h, 12); } else { ctx.rect(mm.x, mm.y, mm.w, mm.h); }
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    window.WORLD_MAP.zones.forEach((z) => {
      ctx.fillStyle = z.color;
      ctx.beginPath();
      ctx.arc(mm.x + z.spawnX * scaleX, mm.y + z.spawnY * scaleY, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    const camW = (canvas.width / camera.zoom) * scaleX;
    const camH = (canvas.height / camera.zoom) * scaleY;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(
      mm.x + camera.x * scaleX,
      mm.y + camera.y * scaleY,
      Math.min(mm.w, camW),
      Math.min(mm.h, camH)
    );

    allPlayers.forEach((p) => {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      const px = mm.x + p.x * scaleX;
      const py = mm.y + p.y * scaleY;
      ctx.fillStyle =
        p.id === localPlayer.id ? '#22c55e' : p.isBerserk ? '#ef4444' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, p.id === localPlayer.id ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 10px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🗺️ 園區雷達 (點擊瞬移導航)', mm.x + 8, mm.y + mm.h - 6);

    // 右上角小巧關閉按鈕 ✕
    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.beginPath();
    ctx.arc(mm.x + mm.w - 11, mm.y + 11, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', mm.x + mm.w - 11, mm.y + 11);

    ctx.restore();
  }

  function gameLoop() {
    tick++;

    if (!isLoggedIn) {
      const pCanvas = document.getElementById('loginAvatarCanvas');
      if (pCanvas) {
        const pCtx = pCanvas.getContext('2d');
        pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
        const chosen = window.AVATAR_CATALOG[selectedAvatarIndex];
        const g = pCtx.createRadialGradient(70, 75, 5, 70, 75, 60);
        g.addColorStop(0, chosen.primary + '55');
        g.addColorStop(1, 'transparent');
        pCtx.fillStyle = g;
        pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);

        window.drawWackyAvatar(pCtx, {
          avatarId: chosen.id,
          x: 70,
          y: 92,
          dir: 'down',
          isMoving: true,
          tick,
          scale: 1.85,
        });
      }
      requestAnimationFrame(gameLoop);
      return;
    }

    // 1. 遊戲邏輯與網路模擬階段（獨立捕捉異常，避免中斷 Canvas 畫面渲染）
    try {
      seasonPoll();
      updateLocalPlayerMovement();
      updateInjuryCountdownHUD();
      if (network && typeof network.update === 'function') {
        network.update(tick);
      }
      const allPlayers = [localPlayer, ...(network ? network.getAllOtherPlayers() : [])];
      if (ecosystem && typeof ecosystem.update === 'function') {
        ecosystem.update(tick, allPlayers);
      }
      updateProximityState();

      // 檢查無動作 30 秒自動切換為「🟡 閒置」狀態
      if (
        localPlayer.status === 'active' &&
        gameNow() - lastUserActionAt > (window.GATHER_CONFIG?.security?.idleTimeoutMs || 30000)
      ) {
        localPlayer.status = 'idle';
        isAutoIdled = true;
        const sel = document.getElementById('selfStatusSelect');
        if (sel) sel.value = 'idle';
        if (network && typeof network.broadcastPacket === 'function') {
          network.broadcastPacket('state_sync', { player: network.getPublicState() });
        }
        pushStatusLog('系統', '30 秒無操作，自動切換為「🟡 閒置」狀態');
        renderSidebarRoster();
      }
    } catch (simErr) {
      console.warn('Simulation tick error (isolated):', simErr);
    }

    // 2. Canvas 畫面渲染階段（保證每幀繪製世界地圖、人物、光影與雷達）
    try {
      if (!canvas || !ctx) {
        requestAnimationFrame(gameLoop);
        return;
      }

      if (camera.overviewMode) {
        fitOverviewCamera();
      } else {
        const zoom = (Number.isFinite(camera.zoom) && camera.zoom > 0) ? camera.zoom : 1;
        camera.zoom = zoom;
        const viewW = canvas.width / zoom;
        const viewH = canvas.height / zoom;
        const px = Number.isFinite(localPlayer.x) ? localPlayer.x : 880;
        const py = Number.isFinite(localPlayer.y) ? localPlayer.y : 525;
        localPlayer.x = px;
        localPlayer.y = py;

        const mapW = window.WORLD_MAP?.width || 2800;
        const mapH = window.WORLD_MAP?.height || 1800;
        const maxCamX = Math.max(0, mapW - viewW);
        const maxCamY = Math.max(0, mapH - viewH);
        const targetCamX = Math.max(0, Math.min(maxCamX, px - viewW / 2));
        const targetCamY = Math.max(0, Math.min(maxCamY, py - viewH / 2));

        if (!Number.isFinite(camera.x)) camera.x = targetCamX;
        if (!Number.isFinite(camera.y)) camera.y = targetCamY;

        camera.x += (targetCamX - camera.x) * 0.14;
        camera.y += (targetCamY - camera.y) * 0.14;
      }

      if (!Number.isFinite(camera.x)) camera.x = 300;
      if (!Number.isFinite(camera.y)) camera.y = 120;
      if (!Number.isFinite(camera.zoom) || camera.zoom <= 0) camera.zoom = 1;

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      try {
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        if (typeof window.renderOfficeWorld === 'function') {
          window.renderOfficeWorld(ctx, ecosystem, tick);
        }

        if (season.enabled) {
          const snap = season.client?.snapshot, task = snap?.task;
          if (task?.claimer && Number.isFinite(task.x) && Number.isFinite(task.y)) {
            ctx.save();
            const isReporting = task.stage === 'reporting';
            ctx.strokeStyle = isReporting ? '#22c55e' : '#f87171';
            ctx.setLineDash([8, 8]);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(localPlayer.x, localPlayer.y);
            ctx.lineTo(task.x, task.y);
            ctx.stroke();
            ctx.fillStyle = isReporting ? '#22c55e' : '#ef4444';
            ctx.fillRect(task.x - 30, task.y - 38, 60, 8);
            ctx.restore();
          }
          const c = snap?.player?.channel;
          if (c) {
            ctx.save();
            const textScale = camera.overviewMode ? 1 : Math.max(1, 1 / camera.zoom);
            ctx.translate(localPlayer.x, localPlayer.y);
            ctx.scale(textScale, textScale);
            ctx.translate(-localPlayer.x, -localPlayer.y);
            ctx.textAlign = 'center';
            ctx.font = '800 16px "PingFang TC", "Microsoft JhengHei", sans-serif';
            ctx.fillStyle = '#fef08a';
            ctx.strokeStyle = '#020617';
            ctx.lineWidth = 4;
            ctx.lineJoin = 'round';
            const duration = c.kind === 'lounge' ? 5000 : c.kind === 'heal' ? c.duration : 3000;
            const text = `互動中 ${Math.min(100, Math.floor((gameNow() - c.at) / duration * 100))}%`;
            ctx.strokeText(text, localPlayer.x, localPlayer.y - 120);
            ctx.fillText(text, localPlayer.x, localPlayer.y - 120);
            ctx.restore();
          }
        }

        if (nearbyPlayers && nearbyPlayers.length > 0) {
          const radius = window.GATHER_CONFIG?.security?.proximityRadiusPx || 120;
          ctx.save();
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
          ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.arc(localPlayer.x, localPlayer.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          nearbyPlayers.forEach((np) => {
            if (!np) return;
            ctx.strokeStyle = np.isBerserk ? '#ef4444' : 'rgba(56, 189, 248, 0.78)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(localPlayer.x, localPlayer.y + 6);
            ctx.lineTo(np.x, np.y + 6);
            ctx.stroke();
          });
          ctx.restore();
        }

        const allPlayers = [localPlayer, ...(network ? network.getAllOtherPlayers() : [])];
        const sortedPlayers = allPlayers
          .filter(p => p && (p.isMob ? (window.OfficeCombat?.defeatVisible ? window.OfficeCombat.defeatVisible(p) : true) : true))
          .sort((a, b) => (a.y || 0) - (b.y || 0));

        sortedPlayers.forEach((p) => {
          if (!p) return;
          ctx.save();
          const reaction = window.OfficeCombat?.reactionPose ? window.OfficeCombat.reactionPose(p) : { x: 0, y: 0, jump: 0, active: false };
          ctx.translate(reaction.x || 0, (reaction.y || 0) - (reaction.jump || 0));
          if ((network?.hunt?.protectedUntil?.[p.id] || 0) > gameNow()) ctx.globalAlpha = tick % 12 < 6 ? 0.35 : 1;
          if (typeof window.drawWackyAvatar === 'function') {
            window.drawWackyAvatar(ctx, {
              avatarId: p.avatarId,
              outfitAvatarId: p.outfitAvatarId,
              combatDown: !!p.combatDown,
              scareUntil: p.scareUntil || 0,
              x: p.x,
              y: p.y,
              dir: p.dir,
              isMoving: p.isMoving,
              tick,
              scale: p.id === 'npc_vp_boss' ? 1.16 : 1.05,
              jumpOffset: p.jumpOffset || 0,
              actionState: p.actionState || null,
              isBerserk: !!p.isBerserk,
              isSweeper: !!p.isSweeper,
              isKnockedBack: (reaction.active && reaction.kind !== 'dodge') || !!(p.knockback && p.knockback.ticksLeft > 0),
              heldItem: p.isNpc ? '' : p.heldItem,
              weaponSwing: p.weaponSwing ? {
                ...p.weaponSwing,
                progress: p.id === localPlayer.id ? 1 - p.weaponSwing.ticksLeft / p.weaponSwing.totalTicks : (gameNow() - p.weaponSwing.startedAt) / 300
              } : null,
              isInjured: p.id === localPlayer.id ? !!localPlayer.isInjured : !!p.isInjured,
              beingHealed: p.id === localPlayer.id ? !!localPlayer.beingHealed : !!p.beingHealed,
              healProgress: p.id === localPlayer.id ? (localPlayer.healProgress || 0) : (p.healProgress || 0),
              isFleeing: !!p.isFleeing,
              isGhostFainted: p.actionState === 'scared_faint' || (p.id === localPlayer.id ? (localPlayer.ghostSleepUntil || 0) : (p.ghostSleepUntil || 0)) > gameNow(),
            });
          }
          const isLightInjured = season.enabled && !p.isNpc
            ? ((p.id === localPlayer.id ? season.effects?.lightUntil : season.client?.snapshot?.players?.find(q => q.clientId === p.id)?.effects?.lightUntil) > gameNow())
            : ((p.id === localPlayer.id ? localPlayer.lightInjuredUntil : p.lightInjuredUntil) > gameNow());
          if (season.enabled && !p.isNpc) {
            const e = p.id === localPlayer.id ? season.effects : season.client?.snapshot?.players?.find(q => q.clientId === p.id)?.effects;
            const now = gameNow();
            if (e?.shieldUntil > now) {
              ctx.strokeStyle = '#86efac';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.ellipse(p.x, p.y - 28, 34, 45, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
          if (isLightInjured) {
            ctx.font = '18px sans-serif';
            ctx.fillText('🩹', p.x - 10, p.y - 80);
          }
          ctx.restore();
        });

        if (window.OfficeHunt?.clock?.()?.active) {
          ctx.save();
          ctx.fillStyle = 'rgba(52,211,153,.15)';
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 3;
          ctx.fillRect(2220, 160, 280, 300);
          ctx.strokeRect(2220, 160, 280, 300);
          ctx.fillStyle = '#d1fae5';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText('安全區 SAFE', 2280, 205);
          ctx.restore();
        }

        const hourFloat = getCurrentHourFloat();
        if (typeof window.renderRealTimeLighting === 'function') {
          window.renderRealTimeLighting(ctx, hourFloat, allPlayers, tick);
        }

        sortedPlayers.forEach((p) => {
          if (!p) return;
          const hp = network?.combat?.enemies?.[p.uid || p.id];
          if (hp) {
            ctx.save();
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(p.x - 22, p.y - 72, 44, 5);
            ctx.fillStyle = hp.hp > 0 ? '#34d399' : '#ef4444';
            ctx.fillRect(p.x - 22, p.y - 72, 44 * Math.max(0, hp.hp / hp.maxHp), 5);
            ctx.restore();
          }
          if (typeof drawPlayerNameplateAndBubbles === 'function') {
            drawPlayerNameplateAndBubbles(ctx, p, p.id === localPlayer.id);
          }
        });

        if (nearbyFacilityAction && !localPlayer.knockback) {
          ctx.save();
          const textScale = camera.overviewMode ? 1 : Math.max(1, 1 / camera.zoom);
          ctx.translate(localPlayer.x, localPlayer.y);
          ctx.scale(textScale, textScale);
          ctx.translate(-localPlayer.x, -localPlayer.y);
          const hintText = nearbyFacilityAction.shortHint || '[按 E] 啟動設備互動';
          ctx.font = '900 16px "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif';
          const hw = ctx.measureText(hintText).width + 28;
          const hx = localPlayer.x - hw / 2;
          const hy = localPlayer.y - 106 - (localPlayer.jumpOffset || 0) + Math.sin(tick * 0.2) * 2.5;
          ctx.fillStyle = 'rgba(8, 16, 32, 0.97)';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(hx, hy, hw, 30, 10);
          } else {
            ctx.rect(hx, hy, hw, 30);
          }
          ctx.fill();
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#fef08a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 3;
          ctx.lineJoin = 'round';
          ctx.strokeText(hintText, localPlayer.x, hy + 15.5);
          ctx.fillText(hintText, localPlayer.x, hy + 15.5);
          ctx.restore();
        }

        if (typeof renderMedicalHealingAnimations === 'function') {
          renderMedicalHealingAnimations(ctx, tick);
        }
        if (typeof renderVfxList === 'function') {
          renderVfxList(ctx);
        }
      } finally {
        ctx.restore();
      }

      const allPlayersForRadar = [localPlayer, ...(network ? network.getAllOtherPlayers() : [])];
      if (typeof renderMinimapRadar === 'function') {
        renderMinimapRadar(ctx, allPlayersForRadar);
      }
    } catch (loopErr) {
      console.error('gameLoop caught error:', loopErr);
    } finally {
      requestAnimationFrame(gameLoop);
    }
  }

  /**
   * 繪製 5 秒緊急醫療急救動畫（醫療光束、治癒光環、心跳脈衝線、飛舞愛心粒子與科技感進度 HUD）
   */
  function renderMedicalHealingAnimations(ctx, tick) {
    if (!network) return;

    // 收集所有正在進行的急救事件 (本地醫護 或 遠端醫護)
    const healSessions = [];
    if (!season.enabled && activeHealingSession) {
      const targetP = network.remotePlayers.get(activeHealingSession.targetId);
      if (targetP) {
        const elapsed = gameNow() - activeHealingSession.startTime;
        healSessions.push({
          healer: localPlayer,
          injured: targetP,
          progress: Math.min(1, elapsed / activeHealingSession.duration),
          elapsed,
          isSelfHealer: true,
        });
      }
    }

    // 檢查遠端玩家間是否有進行中的急救
    network.remotePlayers.forEach((rp) => {
      if (rp.beingHealed && rp.beingHealedBy && (!activeHealingSession || activeHealingSession.targetId !== rp.id)) {
        let healer = null;
        for (const hp of network.remotePlayers.values()) {
          if (hp.name === rp.beingHealedBy) {
            healer = hp;
            break;
          }
        }
        if (healer) {
          healSessions.push({
            healer,
            injured: rp,
            progress: rp.healProgress || 0.5,
            elapsed: 2500,
            isSelfHealer: false,
          });
        }
      }
    });

    healSessions.forEach((s) => {
      const { healer, injured, progress, elapsed } = s;
      ctx.save();

      // 1. 醫護者與傷者之間的翡翠綠急救脈衝光束
      const wave = Math.sin(tick * 0.4) * 4;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.lineDashOffset = -tick * 1.5;
      ctx.beginPath();
      ctx.moveTo(healer.x, healer.y - 12);
      const midCtrlX = (healer.x + injured.x) / 2;
      const midCtrlY = (healer.y + injured.y) / 2 - 20 + wave;
      ctx.quadraticCurveTo(midCtrlX, midCtrlY, injured.x, injured.y - 10);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. 傷者地面急救旋轉光環
      const haloR = 26 + Math.sin(tick * 0.25) * 6;
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(injured.x, injured.y + 6, haloR, haloR * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 3. 空中飄浮的急救愛心與創口貼粒子 (向上升騰)
      for (let i = 0; i < 4; i++) {
        const t = ((tick * 0.08) + i / 4) % 1;
        const px = injured.x + Math.sin(t * Math.PI * 2 + i) * 16;
        const py = injured.y - 15 - t * 40;
        ctx.save();
        ctx.globalAlpha = Math.sin(t * Math.PI) * 0.95;
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(i % 2 === 0 ? '💚' : '🩹', px, py);
        ctx.restore();
      }

      // 4. 懸浮 5 秒急救進度條卡片
      const remSec = Math.max(0, (5 - (elapsed / 1000))).toFixed(1);
      const cardW = 160;
      const cardH = 36;
      const cardX = (healer.x + injured.x) / 2 - cardW / 2;
      const cardY = Math.min(healer.y, injured.y) - 62;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 8);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // 文字標題與剩餘秒數
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 11px "Outfit", "Microsoft JhengHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`🩹 急救醫療中... ${remSec}s`, cardX + 10, cardY + 14);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(progress * 100)}%`, cardX + cardW - 10, cardY + 14);

      // 進度條槽與翡翠綠填充
      const barX = cardX + 10;
      const barY = cardY + 22;
      const barW = cardW - 20;
      const barH = 6;
      ctx.fillStyle = 'rgba(51, 65, 85, 0.9)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 3);
      ctx.fill();

      if (progress > 0) {
        const fillW = Math.max(4, barW * progress);
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(barX, barY, fillW, barH, 3);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  function drawPlayerNameplateAndBubbles(ctx, p, isSelf) {
    const now = gameNow();
    const st =
      window.GATHER_CONFIG.statuses.find((s) => s.id === p.status) ||
      window.GATHER_CONFIG.statuses[0];
    const displayLabel = isSelf
      ? `${p.name} [${progression.title}]`
      : `${p.name} [${p.unit}]`;
    const itemEmoji = p.heldItem || '';

    ctx.save();
    // Keep labels readable in screen pixels when the phone camera zooms out.
    const textScale = camera.overviewMode ? 1 : Math.max(1, 1 / camera.zoom);
    ctx.translate(p.x, p.y);
    ctx.scale(textScale, textScale);
    ctx.translate(-p.x, -p.y);
    ctx.font = '800 14px "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif';
    const textWidth = ctx.measureText(displayLabel).width;
    const pillW = Math.max(84, textWidth + 48);
    const pillH = 28;
    const pillX = p.x - pillW / 2;
    // 💬 名牌與文字對話框絕對錨定於角色地面高度 (p.y - 68)，絕不隨受擊跳躍 (jumpOffset) 震動抖動！
    const pillY = p.y - 68;

    const isInteracting = !isSelf && (
      (typeof selectedTargetId !== 'undefined' && selectedTargetId && (p.id === selectedTargetId || p.uid === selectedTargetId)) ||
      (typeof nearbyPlayers !== 'undefined' && nearbyPlayers && nearbyPlayers[0] && (nearbyPlayers[0].id === p.id || nearbyPlayers[0].uid === p.id))
    );

    if (isInteracting) {
      ctx.fillStyle = p.isBerserk ? 'rgba(185, 28, 28, 0.96)' : 'rgba(15, 23, 42, 0.96)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 12);
      ctx.fill();
      ctx.strokeStyle = p.isBerserk ? '#facc15' : '#38bdf8';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      ctx.fillStyle = p.isBerserk ? '#ef4444' : st.dot;
      ctx.beginPath();
      ctx.arc(pillX + 12, pillY + pillH / 2, 4.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayLabel, pillX + 21, pillY + pillH / 2 + 0.5);
      if (itemEmoji) ctx.fillText(itemEmoji, pillX + pillW - 21, pillY + pillH / 2 + 0.5);
    } else {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.92)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillStyle = p.isBerserk ? '#ef4444' : st.dot;
      ctx.beginPath();
      ctx.arc(p.x - textWidth / 2 - 8, pillY + pillH / 2, 4.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = p.isBerserk ? '#fca5a5' : '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayLabel, p.x - textWidth / 2, pillY + pillH / 2 + 0.5);
      if (itemEmoji) ctx.fillText(itemEmoji, p.x + textWidth / 2 + 6, pillY + pillH / 2 + 0.5);
      ctx.restore();
    }

    // 💬 文字氣泡自動換行演算法 (支援 CJK、Emoji 與多行折返，絕不超出卡片)
    function wrapMurmurLines(renderCtx, text, maxTextWidth) {
      if (!text) return [];
      const paragraphs = String(text).split(/\r?\n/);
      const lines = [];
      for (const para of paragraphs) {
        if (!para) {
          lines.push('');
          continue;
        }
        let curLine = '';
        const chars = Array.from(para);
        for (let i = 0; i < chars.length; i++) {
          const ch = chars[i];
          const testLine = curLine + ch;
          const testWidth = renderCtx.measureText ? renderCtx.measureText(testLine).width : testLine.length * 12;
          if (testWidth > maxTextWidth && curLine.length > 0) {
            lines.push(curLine);
            curLine = ch;
          } else {
            curLine = testLine;
          }
        }
        if (curLine.length > 0) {
          lines.push(curLine);
        }
      }
      return lines.length ? lines : [''];
    }
    window.wrapMurmurLines = wrapMurmurLines;

    const hasMurmur = p.murmur && now < p.murmur.expiresAt;
    let cardTopY = pillY - 9;

    if (hasMurmur) {
      const elapsed = now - p.murmur.createdAt;
      const totalTtl = p.murmur.expiresAt - p.murmur.createdAt;
      const remainRatio = Math.max(0, 1 - elapsed / totalTtl);

      ctx.font = '800 15px "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif';
      const maxTextWidth = 224; // 文字卡片最大內文字寬度，超過自動多行換行
      const fullLines = wrapMurmurLines(ctx, p.murmur.text, maxTextWidth);

      // 計算卡片最寬行與自適應寬度
      let maxLineWidth = 0;
      for (let i = 0; i < fullLines.length; i++) {
        const lw = ctx.measureText ? ctx.measureText(fullLines[i]).width : fullLines[i].length * 12;
        if (lw > maxLineWidth) maxLineWidth = lw;
      }
      const msgW = Math.max(90, Math.min(264, Math.ceil(maxLineWidth + 24)));
      const lineH = 22;
      const padY = 8;
      const msgH = Math.max(32, fullLines.length * lineH + padY * 2);

      // 💬 文字氣泡平穩呈現於名牌頂部上方且置中，絕不晃動，高度隨行數自適應展開
      const bx = p.x - msgW / 2;
      const by = pillY - msgH - 9;
      cardTopY = by;

      let borderCol = '#38bdf8';
      let bgCol = 'rgba(8, 16, 32, 0.97)';
      if (p.murmur.mood === 'fire') {
        borderCol = '#ef4444';
        bgCol = 'rgba(69, 10, 10, 0.98)';
      } else if (p.murmur.mood === 'idea') {
        borderCol = '#f59e0b';
        bgCol = 'rgba(49, 33, 8, 0.98)';
      }

      const charCount = Math.min(p.murmur.text.length, Math.ceil(elapsed / 22));
      const shownText = p.murmur.text.slice(0, charCount);
      const shownLines = wrapMurmurLines(ctx, shownText, maxTextWidth);

      // MURMUR 始終以精美圓角卡片與進度條呈現，不受 isInteracting 限制
      ctx.fillStyle = bgCol;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bx, by, msgW, msgH, 9);
      } else {
        ctx.rect(bx, by, msgW, msgH);
      }
      ctx.fill();
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 指向角色頭頂的對話三角形尾巴
      ctx.fillStyle = bgCol;
      ctx.beginPath();
      ctx.moveTo(p.x - 4, by + msgH);
      ctx.lineTo(p.x + 4, by + msgH);
      ctx.lineTo(p.x, by + msgH + 5);
      ctx.closePath();
      ctx.fill();

      // 卡片文字內容
      ctx.fillStyle = p.murmur.mood === 'idea' ? '#fef08a' : '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < shownLines.length; i++) {
        const lineText = shownLines[i];
        const ly = by + padY + i * lineH + lineH / 2;
        ctx.fillText(lineText, bx + 12, ly);
      }

      // 卡片底部 20 秒倒數進度條
      ctx.fillStyle = borderCol;
      ctx.beginPath();
      const progressW = Math.max(0, (msgW - 12) * remainRatio);
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bx + 6, by + msgH - 4, progressW, 2.5, 1.2);
      } else {
        ctx.rect(bx + 6, by + msgH - 4, progressW, 2.5);
      }
      ctx.fill();
    }

    if (p.emote && now < p.emote.expiresAt) {
      // 💬 表情符號平穩懸浮於對話卡片或名牌上方，無振幅抖動
      const floatY = hasMurmur
        ? cardTopY - 16
        : pillY - 22;
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.emote.emoji, p.x, floatY);
    }

    ctx.restore();
  }

  function renderVfxList(ctx) {
    for (let i = vfxList.length - 1; i >= 0; i--) {
      const v = vfxList[i];
      if (v.type === 'click_ring') {
        v.radius += 2.2;
        v.alpha -= 0.032;
        if (v.alpha <= 0 || v.radius >= v.maxRadius) {
          vfxList.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = v.color;
        ctx.globalAlpha = Math.max(0, v.alpha);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (v.type === 'lightning') {
        v.ticksLeft--;
        if (v.ticksLeft <= 0) {
          vfxList.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(v.x1, v.y1);
        const midX = (v.x1 + v.x2) / 2 + (Math.random() - 0.5) * 24;
        const midY = (v.y1 + v.y2) / 2 + (Math.random() - 0.5) * 24;
        ctx.lineTo(midX, midY);
        ctx.lineTo(v.x2, v.y2);
        ctx.stroke();
      } else if (v.type === 'confetti') {
        v.x += v.vx;
        v.y += v.vy;
        v.vy += 0.14;
        v.alpha -= 0.022;
        if (v.alpha <= 0) {
          vfxList.splice(i, 1);
          continue;
        }
        ctx.fillStyle = v.color;
        ctx.globalAlpha = Math.max(0, v.alpha);
        ctx.fillRect(v.x, v.y, 5, 5);
        ctx.globalAlpha = 1;
      }
    }
  }

  window.__PP00_TEST__ = {
    triggerGameReload,
    saveLoginSession,
    loadLoginSession,
    executeOfficeLogin,
    getLocalPlayer: () => localPlayer,
    detectNearbyFacility,
    tryInteractWithEnvironment,
    getOfficeInteractiveSpots,
  };
  window.addEventListener('DOMContentLoaded', init);
})();
