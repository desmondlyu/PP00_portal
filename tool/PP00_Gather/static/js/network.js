// PP00 Gather Office — 100% 閱後即焚網路引擎 + 4 大專屬 NPC (VP、PP00處長、2位打掃阿姨) 巡視與隨機暴走攻擊系統

class EphemeralOfficeNetwork {
  constructor(callbacks) {
    this.callbacks = callbacks || {};
    this.clientId = 'usr_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
    this.sessionToken = this.generateSessionSign(this.clientId);
    this.roomCode = 'PP00';
    this.localPlayer = null;

    this.remotePlayers = new Map();
    this.npcPlayers = new Map();

    this.supabaseClient = null;
    this.realtimeChannel = null;
    this.broadcastChannel = null;
    this.isCloudConnected = false;

    this.lastChatAt = 0;
    this.lastSkillAt = 0;
    this.seenNonces = new Set();
    this.departedPlayers = new Set();
    this.disconnectPromise = null;

    this.initNPCs();

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.disconnect());
      window.addEventListener('pagehide', () => this.disconnect());
    }
  }

  markPlayerLeft(id, permanent = true) {
    const player = this.remotePlayers.get(id);
    if (permanent) this.departedPlayers.add(id);
    if (this.departedPlayers.size > 1000) this.departedPlayers.delete(this.departedPlayers.values().next().value);
    this.remotePlayers.delete(id);
    if (player && this.callbacks.onPlayerLeave) this.callbacks.onPlayerLeave(player);
  }

  disconnect() {
    if (this.disconnectPromise) return this.disconnectPromise;
    const bounded = async (work) => {
      let timer;
      try { await Promise.race([Promise.resolve().then(work), new Promise((resolve) => { timer = setTimeout(resolve, 500); })]); }
      catch (_) { /* Presence expiry remains the fallback for interrupted connections. */ }
      finally { clearTimeout(timer); }
    };
    this.disconnectPromise = (async () => {
      if (this.localPlayer) await bounded(() => this.broadcastPacket('leave_announce', { player: this.getPublicState() }));
      if (this.realtimeChannel) {
        await bounded(() => this.realtimeChannel.untrack());
        await bounded(() => this.supabaseClient.removeChannel(this.realtimeChannel));
      }
      this.broadcastChannel?.close();
      this.isCloudConnected = false;
      this.localPlayer = null;
      this.realtimeChannel = null;
      this.broadcastChannel = null;
    })();
    return this.disconnectPromise;
  }

  generateSessionSign(id) {
    let hash = 2166136261;
    for (let i = 0; i < id.length; i++) {
      hash ^= id.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  sanitizeText(raw, maxLen = 100) {
    if (typeof raw !== 'string') return '';
    return raw
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .trim()
      .slice(0, maxLen);
  }

  /**
   * 僅保留 VP 大老闆、PP00 處長，並新增兩位打掃阿姨 (美鳳姐、淑芬姐)
   * 每位皆綁定符合身分的專屬語錄與巡視路線，並支援隨機暴走追擊使用者
   */
  initNPCs() {
    const dlg = window.GATHER_CONFIG.npcDialogues || {};
    const randomItems = window.GATHER_CONFIG.items || [];
    const pickRandomEmoji = () =>
      randomItems.length ? randomItems[Math.floor(Math.random() * randomItems.length)].emoji : '🟢';

    const isNight = this.isNightTime();

    // 白天 4 位 NPC (17:00 前上班)
    const dayTemplates = [
      {
        id: 'npc_vp_boss',
        name: 'NPC:VP大老闆',
        unit: 'VP室',
        avatarId: 'npc_vp_uncle',
        status: 'active',
        heldItem: pickRandomEmoji(),
        x: 380,
        y: 310,
        waypoints: [
          { x: 380, y: 310 }, // VP 大老闆辦公桌
          { x: 395, y: 430 }, // VP 室門口 (出門門檻)
          { x: 395, y: 520 }, // 北側主走廊
          { x: 760, y: 520 }, // 處長室前主走廊
          { x: 1060, y: 520 }, // 中央南北大道北口
          { x: 1060, y: 820 }, // 中央南北大道中段 (PE/TE 之間)
          { x: 1060, y: 1180 }, // 南側會議室前走廊
          { x: 395, y: 1180 }, // 戰情看盤室 (Meeting A) 門口外
          { x: 395, y: 1260 }, // 進入 Meeting A 門檻
          { x: 395, y: 1380 }, // Meeting A 內巡視大螢幕
          { x: 395, y: 1260 }, // 出 Meeting A 門檻
          { x: 395, y: 1180 }, // 南側走廊
          { x: 1060, y: 1180 }, // 中央南北大道南口
          { x: 1060, y: 520 }, // 中央南北大道北口
          { x: 395, y: 520 }, // VP 室門口外走廊
          { x: 395, y: 430 }, // 進入 VP 室門檻
        ],
        isSweeper: false,
        shift: 'day',
        murmurs: dlg.vp || ['下半年產量目標翻倍！'],
        berserkCries: [
          '💢 VP暴走：良率沒達標，吃我霸氣衝擊波！',
          '💢 VP暴走：偷看盤沒交報告？震飛回座位！',
        ],
      },
      {
        id: 'npc_dir_pp00',
        name: 'NPC:PP00處長',
        unit: 'PP00',
        avatarId: 'npc_dir_pp00_slim',
        status: 'busy',
        heldItem: pickRandomEmoji(),
        x: 760,
        y: 330,
        waypoints: [
          { x: 760, y: 330 }, // PP00 處長辦公桌
          { x: 755, y: 430 }, // PP00 處長室門口 (出門門檻)
          { x: 755, y: 520 }, // 北側主走廊
          { x: 1060, y: 520 }, // 中央南北大道北口
          { x: 1060, y: 820 }, // 中央南北大道中段
          { x: 1680, y: 820 }, // TE 測試工程區中走道
          { x: 1800, y: 820 }, // 東側走道
          { x: 1800, y: 1205 }, // Lab 實驗室大門外
          { x: 1800, y: 1260 }, // 進入 Lab 門檻
          { x: 1695, y: 1450 }, // Lab 實驗室中央走道巡視設備
          { x: 1800, y: 1260 }, // 出 Lab 門檻
          { x: 1800, y: 1205 }, // 南側走道
          { x: 1060, y: 1180 }, // 中央南北大道南口
          { x: 1060, y: 520 }, // 中央南北大道北口
          { x: 755, y: 520 }, // 處長室外走廊
          { x: 755, y: 430 }, // 進入處長室門檻
        ],
        isSweeper: false,
        shift: 'day',
        murmurs: dlg.director_pp00 || ['FT良率特性報告下班前要繳！'],
        berserkCries: [
          '💢 PP00處長暴走：沒填借機單就用機台？飛出去重填！',
          '💢 PP00處長暴走：FT報告遲交，吃我處長疾風擊飛！',
        ],
      },
      {
        id: 'npc_auntie_meifeng',
        name: 'NPC:打掃阿姨美鳳',
        unit: '清潔部',
        avatarId: 'npc_auntie_meifeng',
        status: 'active',
        heldItem: '🧹',
        x: 1060,
        y: 520,
        waypoints: [
          { x: 1060, y: 520 },
          { x: 2120, y: 520 },
          { x: 2360, y: 520 },
          { x: 2360, y: 430 },
          { x: 2360, y: 350 },
          { x: 2360, y: 430 },
          { x: 2360, y: 520 },
          { x: 2120, y: 820 },
          { x: 2255, y: 682 }, // 進入廁所洗手台搓泡洗手
          { x: 2120, y: 820 }, // 走回走廊
          { x: 1060, y: 820 },
          { x: 640, y: 820 },
          { x: 200, y: 820 },
          { x: 200, y: 520 },
          { x: 1060, y: 520 },
        ],
        isSweeper: true,
        shift: 'day',
        murmurs: dlg.auntie_meifeng || ['走廊剛拖好地，小心慢走！'],
        berserkCries: [
          '💢 美鳳阿姨暴走：剛拖好地又踩黑腳印！黃金掃把擊飛！',
          '💢 美鳳阿姨暴走：地毯掉餅乾屑？一掃把送你起飛！',
        ],
      },
      {
        id: 'npc_auntie_shufen',
        name: 'NPC:打掃阿姨淑芬',
        unit: '清潔部',
        avatarId: 'npc_auntie_shufen',
        status: 'active',
        heldItem: '🧽',
        x: 2120,
        y: 820,
        waypoints: [
          { x: 2120, y: 820 },
          { x: 2255, y: 682 }, // 進入廁所搓泡洗手
          { x: 2120, y: 820 },
          { x: 2120, y: 520 },
          { x: 1060, y: 520 },
          { x: 1060, y: 1180 },
          { x: 1800, y: 1205 },
          { x: 1695, y: 1360 },
          { x: 1800, y: 1205 },
          { x: 925, y: 1180 },
          { x: 395, y: 1180 },
          { x: 1060, y: 1180 },
          { x: 2120, y: 1180 },
          { x: 2120, y: 820 },
        ],
        isSweeper: true,
        shift: 'day',
        murmurs: dlg.auntie_shufen || ['茶水間咖啡機剛洗好！'],
        berserkCries: [
          '💢 淑芬阿姨暴走：上廁所沒洗手？泡沫無影腳踢飛！',
          '💢 淑芬阿姨暴走：咖啡滴滿桌沒擦！旋風海綿擊飛！',
        ],
      },
    ];

    // 夜間警衛 (17:00 後值勤巡邏並打怪)
    const nightTemplates = [
      {
        id: 'npc_security_guard',
        name: 'NPC:夜間巡邏警衛',
        unit: '總務安保',
        avatarId: 'npc_security_guard',
        status: 'active',
        heldItem: '🏏',
        x: 1060,
        y: 520,
        waypoints: [
          { x: 1060, y: 520 }, // 中央安保崗哨
          { x: 395, y: 520 }, // 西側走廊 (VP 室外)
          { x: 200, y: 520 }, // 西南通道口
          { x: 200, y: 820 }, // PE 西側外走道
          { x: 200, y: 1180 }, // 南側會議室西通道
          { x: 395, y: 1180 }, // Meeting A 門口外
          { x: 395, y: 1260 }, // 門口探頭巡視
          { x: 395, y: 1180 }, // 返回走廊
          { x: 925, y: 1180 }, // Meeting B 門口外
          { x: 925, y: 1260 }, // 門口探頭巡視
          { x: 925, y: 1180 }, // 返回走廊
          { x: 1060, y: 1180 }, // 中央南北大道南口
          { x: 1800, y: 1205 }, // Lab 門口外
          { x: 1695, y: 1360 }, // Lab 巡邏抓怪
          { x: 1800, y: 1205 }, // 出 Lab
          { x: 2120, y: 1180 }, // 東南轉角
          { x: 2120, y: 850 }, // 盥洗室外走道
          { x: 2120, y: 520 }, // 東北轉角
          { x: 2360, y: 520 }, // 茶水間門外
          { x: 2360, y: 430 }, // 進入茶水間門檻
          { x: 2360, y: 320 }, // 茶水間巡查
          { x: 2360, y: 430 }, // 出茶水間
          { x: 2360, y: 520 }, // 茶水間外走廊
          { x: 1060, y: 520 }, // 返回中央安保崗哨
        ],
        isSweeper: false,
        isSecurityGuard: true,
        shift: 'night',
        murmurs: dlg.security_guard || [
          '🏏 夜間安保巡邏中，閒雜人等勿靠近！',
          '🏏 發現方塊怪出沒！看我警棍伺候！',
          '🏏 傍晚加班請注意安全，門禁請刷卡！',
          '🏏 巡邏全區守護夜間工程師！',
        ],
        berserkCries: [
          '💢 敢襲警妨礙公務？抓去廁所管教10秒！',
          '💢 拿武器敲警衛？進廁所好好反省10秒！',
        ],
      },
    ];

    // 鳥人指揮官 (隨機 20% 機率出現)
    const birdTemplates = [
      {
        id: 'npc_bird_commander',
        name: 'NPC:鳥人指揮官',
        unit: '指揮部',
        avatarId: 'npc_flamingo_cmd',
        status: 'busy',
        heldItem: '📋',
        x: 1060,
        y: 520,
        waypoints: [
          { x: 1060, y: 520 }, // 中央十字路口
          { x: 640, y: 520 }, // 北側西走廊
          { x: 395, y: 520 }, // VP 門外盯梢
          { x: 200, y: 520 }, // 西側大道
          { x: 200, y: 820 }, // PE 外側走道
          { x: 640, y: 820 }, // PE 中走道
          { x: 1060, y: 820 }, // 中央交叉道
          { x: 1680, y: 820 }, // TE 中走道
          { x: 2120, y: 820 }, // 東側走道
          { x: 2120, y: 520 }, // 茶水間轉角
          { x: 2360, y: 520 }, // 茶水間門外
          { x: 2360, y: 350 }, // 茶水間內催促喝咖啡進度
          { x: 2360, y: 520 }, // 出茶水間
          { x: 2120, y: 520 }, // 東北大道
          { x: 2120, y: 1180 }, // 東南走道
          { x: 1800, y: 1205 }, // Lab 門口
          { x: 1695, y: 1360 }, // Lab 催促機台進度 (走道順暢點)
          { x: 1800, y: 1205 }, // 出 Lab
          { x: 1060, y: 1180 }, // 南側大道
          { x: 925, y: 1180 }, // Meeting B 門口
          { x: 395, y: 1180 }, // Meeting A 門口
          { x: 200, y: 1180 }, // 西南走道
          { x: 200, y: 520 }, // 西側大道
          { x: 1060, y: 520 }, // 返回中央十字路口
        ],
        isSweeper: false,
        isBirdCommander: true,
        isRunner: true,
        shift: 'all',
        murmurs: dlg.bird_commander || ['🦩 紅鶴奔跑巡視中，進度抓緊！'],
        berserkCries: [
          '💢 鳥人指揮官暴走：Action Item沒寫完，飛去改報告！',
          '💢 鳥人指揮官暴走：吃我一記紅鶴雙翼擊飛術！',
        ],
      },
    ];

    // 檢查持久化狀態：自動清除舊版 10% 永久放逐與過期休養標記，確保鳥人指揮官正常出勤
    let birdResting = false;
    try {
      const raw = localStorage.getItem('PP00_GATHER_PERSISTENCE_v1');
      if (raw) {
        const persisted = JSON.parse(raw);
        let changed = false;
        if (persisted.birdCommanderExiled) {
          delete persisted.birdCommanderExiled;
          changed = true;
        }
        if (persisted.birdCommanderRestUntil) {
          if (Date.now() < persisted.birdCommanderRestUntil) {
            birdResting = true;
          } else {
            delete persisted.birdCommanderRestUntil;
            changed = true;
          }
        }
        if (changed) {
          localStorage.setItem('PP00_GATHER_PERSISTENCE_v1', JSON.stringify(persisted));
        }
      }
    } catch (e) {}

    // 鳥人指揮官常駐於辦公室巡視（預設 100% 出現率）
    const birdSpawnRoll = Math.random();
    const birdSpawnRate = window.GATHER_CONFIG?.security?.birdSpawnRate ?? 1.0;
    const birdSpawns = !birdResting && birdSpawnRoll < birdSpawnRate;

    const activeTemplates = [];
    if (isNight) {
      // 傍晚 17:00 ~ 清晨 05:00：VP、處長、打掃阿姨不在，警衛登場！
      activeTemplates.push(...nightTemplates);
    } else {
      // 白天 05:00 ~ 17:00：VP、處長、阿姨在場，警衛不在
      activeTemplates.push(...dayTemplates);
    }

    if (birdSpawns) {
      activeTemplates.push(...birdTemplates);
    }

    this.npcPlayers.clear();
    activeTemplates.forEach((tpl) => {
      this.npcPlayers.set(tpl.id, {
        ...tpl,
        isNpc: true,
        isMoving: false,
        waypointIdx: 0,
        targetX: tpl.x,
        targetY: tpl.y,
        dir: 'down',
        jumpOffset: 0,
        actionState: tpl.isSweeper ? 'sweep_floor' : null,
        actionUntil: 0,
        isBerserk: false,
        berserkUntil: 0,
        berserkCooldownUntil: Date.now() + 18000,
        followPlayerUntil: 0,
        meetingLockCooldownUntil: 0,
        meetingPullCount: 0,
        knockback: null,
        murmur: null,
        emote: null,
      });
    });
  }

  spawnBirdCommander() {
    if (this.npcPlayers.has('npc_bird_commander')) return;
    const dlg = (window.GATHER_CONFIG && window.GATHER_CONFIG.npcDialogues) || {};
    this.npcPlayers.set('npc_bird_commander', {
      id: 'npc_bird_commander',
      name: 'NPC:鳥人指揮官',
      unit: '指揮部',
      avatarId: 'npc_flamingo_cmd',
      status: 'busy',
      heldItem: '📋',
      x: 1060,
      y: 520,
      waypoints: [
        { x: 1060, y: 520 }, // 中央十字路口
        { x: 640, y: 520 }, // 北側西走廊
        { x: 395, y: 520 }, // VP 門外盯梢
        { x: 200, y: 520 }, // 西側大道
        { x: 200, y: 820 }, // PE 外側走道
        { x: 640, y: 820 }, // PE 中走道
        { x: 1060, y: 820 }, // 中央交叉道
        { x: 1680, y: 820 }, // TE 中走道
        { x: 2120, y: 820 }, // 東側走道
        { x: 2120, y: 520 }, // 茶水間轉角
        { x: 2360, y: 520 }, // 茶水間門外
        { x: 2360, y: 350 }, // 茶水間內催促喝咖啡進度
        { x: 2360, y: 520 }, // 出茶水間
        { x: 2120, y: 520 }, // 東北大道
        { x: 2120, y: 1180 }, // 東南走道
        { x: 1800, y: 1205 }, // Lab 門口
        { x: 1695, y: 1360 }, // Lab 催促機台進度 (走道順暢點)
        { x: 1800, y: 1205 }, // 出 Lab
        { x: 1060, y: 1180 }, // 南側大道
        { x: 925, y: 1180 }, // Meeting B 門口
        { x: 395, y: 1180 }, // Meeting A 門口
        { x: 200, y: 1180 }, // 西南走道
        { x: 200, y: 520 }, // 西側大道
        { x: 1060, y: 520 }, // 返回中央十字路口
      ],
      isSweeper: false,
      isBirdCommander: true,
      isRunner: true,
      shift: 'all',
      murmurs: dlg.bird_commander || ['🦩 紅鶴奔跑巡視中，進度抓緊！'],
      berserkCries: [
        '💢 鳥人指揮官暴走：Action Item沒寫完，飛去改報告！',
        '💢 鳥人指揮官暴走：吃我一記紅鶴雙翼擊飛術！',
      ],
      isNpc: true,
      isMoving: false,
      waypointIdx: 0,
      targetX: 1060,
      targetY: 520,
      dir: 'down',
      jumpOffset: 0,
      actionState: null,
      actionUntil: 0,
      isBerserk: false,
      berserkUntil: 0,
      berserkCooldownUntil: Date.now() + 18000,
      followPlayerUntil: 0,
      meetingLockCooldownUntil: 0,
      meetingPullCount: 0,
      knockback: null,
      murmur: null,
      emote: null,
    });
  }

  isNightTime() {
    const d = new Date();
    const h = d.getHours() + d.getMinutes() / 60;
    return h >= 17 || h < 5;
  }

  isPlayerInSight(npc, player) {
    if (!npc || !player) return false;
    const vx = player.x - npc.x;
    const vy = player.y - npc.y;
    const dist = Math.hypot(vx, vy);
    if (dist > 145 || dist < 4) return false;

    const nx = vx / dist;
    const ny = vy / dist;
    let fx = 0,
      fy = 1;
    if (npc.dir === 'right') {
      fx = 1;
      fy = 0;
    } else if (npc.dir === 'left') {
      fx = -1;
      fy = 0;
    } else if (npc.dir === 'up') {
      fx = 0;
      fy = -1;
    }

    // 視線夾角需在前方約 120 度扇形內 (dot > 0.25)
    const dot = nx * fx + ny * fy;
    if (dot < 0.25) return false;

    // 檢查中間點是否被牆壁阻擋
    const midX = (npc.x + player.x) / 2;
    const midY = (npc.y + player.y) / 2;
    if (window.isPositionBlocked(midX, midY, 8)) return false;

    return true;
  }

  connect(playerProfile, roomCode = 'PP00') {
    this.localPlayer = playerProfile;
    if (this.localPlayer) {
      this.localPlayer.id = this.clientId;
    }
    this.connectTimestamp = Date.now();
    this.roomCode = this.sanitizeText(roomCode || 'PP00', 16).toUpperCase() || 'PP00';
    const channelTopic = `pp00_ephemeral_office_${this.roomCode}`;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        if (this.broadcastChannel) this.broadcastChannel.close();
        this.broadcastChannel = new BroadcastChannel(channelTopic);
        this.broadcastChannel.onmessage = (ev) => {
          if (ev.data && ev.data.senderId !== this.clientId) {
            this.handleIncomingPacket(ev.data);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel 略過：', err);
      }
    }

    const cfg = window.GATHER_CONFIG;
    if (window.supabase && cfg.supabaseUrl && cfg.supabaseAnonKey) {
      try {
        this.supabaseClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        this.realtimeChannel = this.supabaseClient.channel(channelTopic, {
          config: {
            broadcast: { self: false, ack: false },
            presence: { key: this.clientId },
          },
        });

        this.realtimeChannel
          .on('broadcast', { event: 'ephemeral_pkt' }, ({ payload }) => {
            if (payload && payload.senderId !== this.clientId) {
              this.handleIncomingPacket(payload);
            }
          })
          .on('presence', { event: 'sync' }, () => {
            try {
              if (!this.realtimeChannel) return;
              const state = this.realtimeChannel.presenceState();
              Object.values(state).forEach((presences) => {
                if (Array.isArray(presences)) {
                  presences.forEach((p) => {
                    if (p && p.id && p.id !== this.clientId) {
                      this.upsertRemotePlayer(p, false);
                    }
                  });
                }
              });
            } catch (_) {}
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            if (key === this.clientId || !newPresences || !newPresences[0]) return;
            // 剛登入連線時（前 3.5 秒）收到的 presence.join 屬於頻道既有在線成員，不可視為新加入
            const isInitialSync = Date.now() - (this.connectTimestamp || 0) < 3500;
            this.upsertRemotePlayer(newPresences[0], !isInitialSync);
          })
          .on('presence', { event: 'leave' }, ({ key }) => {
            if (key === this.clientId) return;
            this.markPlayerLeft(key, false);
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && !this.disconnectPromise) {
              this.isCloudConnected = true;
              if (this.callbacks.onConnectionChange) {
                this.callbacks.onConnectionChange(true, 'Supabase Realtime 連線中');
              }
              await this.realtimeChannel.track(this.getPublicState());
              this.broadcastPacket('join_announce', { player: this.getPublicState() });
            } else if (status !== 'SUBSCRIBED') {
              this.isCloudConnected = false;
              if (this.callbacks.onConnectionChange) {
                this.callbacks.onConnectionChange(false, '連線已中斷，正在重連');
              }
            }
          });

        if (typeof window !== 'undefined') {
          window.addEventListener('offline', () => {
            this.isCloudConnected = false;
            if (this.callbacks.onConnectionChange) {
              this.callbacks.onConnectionChange(false, '網路連線已中斷');
            }
          });
          window.addEventListener('online', () => {
            if (this.callbacks.onConnectionChange) {
              this.callbacks.onConnectionChange(this.isCloudConnected, this.isCloudConnected ? 'Supabase Realtime 連線中' : '本地瞬時頻道');
            }
          });
        }
      } catch (e) {
        console.warn('切換本地頻道：', e);
      }
    }

    this.broadcastPacket('join_announce', { player: this.getPublicState() });
  }

  getPublicState() {
    if (!this.localPlayer) return {};
    return {
      id: this.clientId,
      name: this.localPlayer.name,
      unit: this.localPlayer.unit,
      avatarId: this.localPlayer.avatarId,
      status: this.localPlayer.status,
      heldItem: this.localPlayer.heldItem,
      actionState: this.localPlayer.actionState || null,
      occupiedSpotId: this.localPlayer.occupiedSpotId || null,
      x: Math.round(this.localPlayer.x),
      y: Math.round(this.localPlayer.y),
      dir: this.localPlayer.dir,
      isMoving: this.localPlayer.isMoving,
      isInjured: !!this.localPlayer.isInjured,
      injuredUntil: this.localPlayer.injuredUntil || 0,
      beingHealed: !!this.localPlayer.beingHealed,
      beingHealedBy: this.localPlayer.beingHealedBy || null,
      healProgress: this.localPlayer.healProgress || 0,
    };
  }

  /**
   * 判定當前連線客戶端是否為房長 (Room Master)：
   * 採用確定性最小 ID 演算法，若無遠端玩家則本地即為房長；
   * 若有多人連線，由所有真實使用者 ID 排序後最小者擔任權威主機，負責運算 NPC AI、怪物、掉落物與螢幕狀態。
   */
  isRoomMaster() {
    if (!this.clientId) return true;
    if (!this.remotePlayers || this.remotePlayers.size === 0) return true;
    const realIds = [this.clientId];
    for (const [id, player] of this.remotePlayers.entries()) {
      if (player && id && !player.isNpc && !player.isMob) {
        realIds.push(id);
      }
    }
    realIds.sort();
    return realIds[0] === this.clientId;
  }

  broadcastPacket(type, data = {}) {
    const nonce = Math.random().toString(36).slice(2, 10) + '_' + Date.now();
    const packet = {
      type,
      senderId: this.clientId,
      token: this.sessionToken,
      nonce,
      timestamp: Date.now(),
      ...data,
    };

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(packet);
      } catch (_) {}
    }

    if (this.realtimeChannel && this.isCloudConnected) {
      try {
        return this.realtimeChannel.send({
          type: 'broadcast',
          event: 'ephemeral_pkt',
          payload: packet,
        });
      } catch (_) {}
    }
  }

  upsertRemotePlayer(pData, notifyJoin = false) {
    if (!pData || !pData.id || pData.id === this.clientId || this.departedPlayers.has(pData.id)) return;
    const existing = this.remotePlayers.get(pData.id) || {};
    // 確保線上使用者僅能使用 10 款使用者專屬造型，禁止與 NPC 獨立造型衝突
    const validUserAvatar =
      window.AVATAR_CATALOG && window.AVATAR_CATALOG.some((a) => a.id === pData.avatarId)
        ? pData.avatarId
        : 'frog_eng';

    const targetX = Number(pData.x) || 850;
    const targetY = Number(pData.y) || 520;
    const isFirstTime = typeof existing.x !== 'number';
    const isFarTeleport = !isFirstTime && Math.hypot(targetX - existing.x, targetY - existing.y) > 280;
    const currentX = (isFirstTime || isFarTeleport) ? targetX : existing.x;
    const currentY = (isFirstTime || isFarTeleport) ? targetY : existing.y;

    const merged = Object.assign(existing, {
      id: pData.id,
      name: this.sanitizeText(pData.name || '同事', 16),
      unit: this.sanitizeText(pData.unit || 'PP00', 8),
      avatarId: validUserAvatar,
      status: pData.status || 'active',
      heldItem: pData.heldItem || '🟢',
      actionState: pData.actionState || null,
      occupiedSpotId: pData.occupiedSpotId || null,
      x: currentX,
      y: currentY,
      targetX,
      targetY,
      dir: pData.dir || 'down',
      isMoving: !!pData.isMoving,
      isInjured: pData.isInjured !== undefined ? !!pData.isInjured : !!existing.isInjured,
      injuredUntil: pData.injuredUntil !== undefined ? pData.injuredUntil : (existing.injuredUntil || 0),
      beingHealed: pData.beingHealed !== undefined ? !!pData.beingHealed : !!existing.beingHealed,
      beingHealedBy: pData.beingHealedBy !== undefined ? pData.beingHealedBy : (existing.beingHealedBy || null),
      healProgress: pData.healProgress !== undefined ? pData.healProgress : (existing.healProgress || 0),
      jumpOffset: existing.jumpOffset || 0,
      murmur: existing.murmur || null,
      emote: existing.emote || null,
      lastSeen: Date.now(),
    });
    this.remotePlayers.set(pData.id, merged);

    if (notifyJoin && !existing.joinNotified && this.callbacks.onPlayerJoin) {
      merged.joinNotified = true;
      this.callbacks.onPlayerJoin(merged);
    }
  }

  handleIncomingPacket(pkt) {
    if (!pkt || !pkt.nonce || this.seenNonces.has(pkt.nonce)) return;
    this.seenNonces.add(pkt.nonce);
    if (this.seenNonces.size > 300) {
      const firstKey = this.seenNonces.values().next().value;
      this.seenNonces.delete(firstKey);
    }

    switch (pkt.type) {
      case 'heal_start': {
        if (this.localPlayer && this.localPlayer.id === pkt.targetId) {
          this.localPlayer.beingHealed = true;
          this.localPlayer.beingHealedBy = pkt.healerName;
        }
        const target = this.remotePlayers.get(pkt.targetId);
        if (target) {
          target.beingHealed = true;
          target.beingHealedBy = pkt.healerName;
        }
        if (this.callbacks.onRemoteHealStart) {
          this.callbacks.onRemoteHealStart(pkt);
        }
        break;
      }
      case 'heal_progress': {
        if (this.localPlayer && this.localPlayer.id === pkt.targetId) {
          this.localPlayer.beingHealed = true;
          this.localPlayer.healProgress = pkt.progress;
        }
        const target = this.remotePlayers.get(pkt.targetId);
        if (target) {
          target.beingHealed = true;
          target.healProgress = pkt.progress;
        }
        if (this.callbacks.onRemoteHealProgress) {
          this.callbacks.onRemoteHealProgress(pkt);
        }
        break;
      }
      case 'heal_cancel': {
        if (this.localPlayer && this.localPlayer.id === pkt.targetId) {
          this.localPlayer.beingHealed = false;
          this.localPlayer.healProgress = 0;
        }
        const target = this.remotePlayers.get(pkt.targetId);
        if (target) {
          target.beingHealed = false;
          target.healProgress = 0;
        }
        if (this.callbacks.onRemoteHealCancel) {
          this.callbacks.onRemoteHealCancel(pkt);
        }
        break;
      }
      case 'heal_complete': {
        if (this.localPlayer && this.localPlayer.id === pkt.targetId) {
          this.localPlayer.isInjured = false;
          this.localPlayer.injuredUntil = 0;
          this.localPlayer.beingHealed = false;
          this.localPlayer.healProgress = 0;
          this.localPlayer.actionState = null;
        }
        const target = this.remotePlayers.get(pkt.targetId);
        if (target) {
          target.isInjured = false;
          target.injuredUntil = 0;
          target.beingHealed = false;
          target.healProgress = 0;
          target.actionState = null;
        }
        if (this.callbacks.onRemoteHealComplete) {
          this.callbacks.onRemoteHealComplete(pkt);
        }
        break;
      }
      case 'leave_announce': {
        if (pkt.player && pkt.player.id !== pkt.senderId) return;
        this.markPlayerLeft(pkt.senderId);
        break;
      }
      case 'join_announce': {
        this.upsertRemotePlayer(pkt.player, true);
        this.broadcastPacket('state_sync', { player: this.getPublicState() });
        break;
      }
      case 'state_sync':
      case 'move': {
        this.upsertRemotePlayer(pkt.player, false);
        break;
      }
      case 'player_murmur':
      case 'murmur': {
        const sender = this.remotePlayers.get(pkt.senderId);
        const ttl = window.GATHER_CONFIG?.security?.murmurTtlMs || 8000;
        if (sender) {
          sender.murmur = {
            text: this.sanitizeText(pkt.text, 100),
            mood: pkt.mood || 'normal',
            createdAt: Date.now(),
            expiresAt: Date.now() + ttl,
          };
        }
        if (this.callbacks.onRemoteMurmur) {
          this.callbacks.onRemoteMurmur({
            senderId: pkt.senderId,
            senderName: sender ? sender.name : (pkt.senderName || '同事'),
            senderUnit: sender ? sender.unit : (pkt.senderUnit || 'PP00'),
            text: this.sanitizeText(pkt.text, 100),
            mood: pkt.mood || 'normal',
            createdAt: Date.now(),
            expiresAt: Date.now() + ttl,
          });
        }
        break;
      }
      case 'proximity_chat': {
        if (!this.localPlayer) return;
        const sender = this.remotePlayers.get(pkt.senderId);
        const sx = sender ? sender.x : pkt.x;
        const sy = sender ? sender.y : pkt.y;
        const dist = (typeof sx === 'number' && typeof sy === 'number')
          ? Math.hypot(this.localPlayer.x - sx, this.localPlayer.y - sy)
          : 999;
        const isNearby = dist <= (window.GATHER_CONFIG?.security?.proximityRadiusPx || 165) * 1.35;

        // 全虛擬辦公室公開對談皆可在聊天面板收到，若在身旁則額外標示
        if (this.callbacks.onProximityChat) {
          this.callbacks.onProximityChat({
            id: pkt.nonce,
            senderId: pkt.senderId,
            senderName: this.sanitizeText(pkt.senderName || (sender ? sender.name : '同事'), 16),
            senderUnit: this.sanitizeText(pkt.senderUnit || (sender ? sender.unit : 'PP00'), 8),
            text: this.sanitizeText(pkt.text, 100),
            isNearby,
            createdAt: Date.now(),
            expiresAt: Date.now() + (window.GATHER_CONFIG?.security?.chatMessageTtlMs || 30000),
          });
        }
        break;
      }
      case 'private_chat': {
        if (!this.localPlayer) return;
        if (pkt.targetId === this.clientId) {
          if (this.callbacks.onPrivateChat) {
            this.callbacks.onPrivateChat({
              id: pkt.nonce,
              senderId: pkt.senderId,
              senderName: this.sanitizeText(pkt.senderName || '同事', 16),
              senderUnit: this.sanitizeText(pkt.senderUnit || 'PP00', 8),
              text: this.sanitizeText(pkt.text, 100),
              targetId: pkt.targetId,
              targetName: this.sanitizeText(pkt.targetName || this.localPlayer.name, 16),
              createdAt: Date.now(),
            });
          }
        }
        break;
      }
      case 'skill_action': {
        if (this.callbacks.onRemoteSkill) {
          this.callbacks.onRemoteSkill(pkt);
        }
        break;
      }
      case 'weapon_attack': {
        if (this.callbacks.onRemoteWeaponAttack) {
          this.callbacks.onRemoteWeaponAttack(pkt);
        }
        break;
      }
      case 'toilet_kick': {
        if (this.callbacks.onRemoteToiletKick) {
          this.callbacks.onRemoteToiletKick(pkt);
        }
        break;
      }
      case 'status_log': {
        if (this.callbacks.onRemoteStatusLog) {
          this.callbacks.onRemoteStatusLog(pkt);
        }
        break;
      }
      case 'meeting_pull': {
        const npc = this.npcPlayers.get(pkt.npcId);
        if (npc) {
          npc.x = pkt.roomX;
          npc.y = pkt.roomY;
          npc.targetX = pkt.roomX;
          npc.targetY = pkt.roomY;
          npc.actionState = pkt.roomId === 'meet_a' ? 'watch_stock' : 'pray_kuaikuai';
          npc.murmur = {
            text: pkt.murmurText || '🦩 抓進會議室檢討10秒！',
            mood: 'fire',
            createdAt: Date.now(),
            expiresAt: Date.now() + 10000,
          };
        }
        const roomX = pkt.roomId === 'meet_a' ? 400 : 925;
        const roomY = 1345;
        if (this.localPlayer && this.localPlayer.id === pkt.targetId) {
          if (this.callbacks.onMeetingPull && npc) {
            this.callbacks.onMeetingPull(npc, pkt.roomId, roomX + 36, roomY, this.localPlayer);
          }
        } else if (this.callbacks.onMeetingPull && npc) {
          const remoteTarget = this.remotePlayers.get(pkt.targetId) || { id: pkt.targetId, name: pkt.targetName };
          this.callbacks.onMeetingPull(npc, pkt.roomId, roomX + 36, roomY, remoteTarget);
        }
        break;
      }
      case 'world_sync': {
        // 由房長 (Room Master) 統一廣播的權威同步封包
        // 若自己是房長，但收到比自己更小 ID 房長廣播，以更小者為準
        if (this.clientId && pkt.senderId && pkt.senderId > this.clientId && this.isRoomMaster()) {
          break;
        }
        this.lastMasterSyncTime = Date.now();
        if (Array.isArray(pkt.npcs)) {
          pkt.npcs.forEach((remoteNpc) => {
            let localNpc = this.npcPlayers.get(remoteNpc.id);
            if (!localNpc && remoteNpc.id === 'npc_bird_commander') {
              this.spawnBirdCommander();
              localNpc = this.npcPlayers.get(remoteNpc.id);
            }
            if (localNpc) {
              localNpc.targetX = remoteNpc.targetX;
              localNpc.targetY = remoteNpc.targetY;
              const dist = Math.hypot(localNpc.x - remoteNpc.x, localNpc.y - remoteNpc.y);
              if (dist > 160) {
                localNpc.x = remoteNpc.x;
                localNpc.y = remoteNpc.y;
              } else {
                localNpc.x += (remoteNpc.x - localNpc.x) * 0.45;
                localNpc.y += (remoteNpc.y - localNpc.y) * 0.45;
              }
              localNpc.syncX = remoteNpc.x;
              localNpc.syncY = remoteNpc.y;
              localNpc.dir = remoteNpc.dir;
              localNpc.actionState = remoteNpc.actionState;
              localNpc.isMoving = remoteNpc.isMoving;
              localNpc.isBerserk = !!remoteNpc.isBerserk;
              localNpc.isFleeing = !!remoteNpc.isFleeing;
              if (remoteNpc.fleeUntil !== undefined) localNpc.fleeUntil = remoteNpc.fleeUntil;
              if (remoteNpc.jumpOffset > 0) localNpc.jumpOffset = remoteNpc.jumpOffset;
              if (remoteNpc.murmur) localNpc.murmur = remoteNpc.murmur;
              if (remoteNpc.emote) localNpc.emote = remoteNpc.emote;
              if (remoteNpc.followTargetId !== undefined) localNpc.followTargetId = remoteNpc.followTargetId;
              if (remoteNpc.followPlayerUntil !== undefined) localNpc.followPlayerUntil = remoteNpc.followPlayerUntil;
              if (remoteNpc.waypointIdx !== undefined) localNpc.waypointIdx = remoteNpc.waypointIdx;
            }
          });
        }
        if (this.callbacks.onWorldSync) {
          this.callbacks.onWorldSync(pkt);
        }
        break;
      }
      case 'npc_reaction': {
        const targetNpc = this.npcPlayers.get(pkt.npcId);
        if (targetNpc) {
          if (pkt.reaction === 'dodge') {
            targetNpc.jumpOffset = pkt.jumpOffset || 22;
            targetNpc.emote = pkt.emote || { emoji: '💨', expiresAt: Date.now() + 3000 };
            if (typeof pkt.targetX === 'number') targetNpc.targetX = pkt.targetX;
            if (typeof pkt.targetY === 'number') targetNpc.targetY = pkt.targetY;
            if (typeof pkt.x === 'number') targetNpc.x = pkt.x;
            if (typeof pkt.y === 'number') targetNpc.y = pkt.y;
            if (pkt.murmur) targetNpc.murmur = pkt.murmur;
          } else if (pkt.reaction === 'flee') {
            targetNpc.isFleeing = true;
            targetNpc.fleeUntil = pkt.fleeUntil || (Date.now() + 7000);
            targetNpc.jumpOffset = pkt.jumpOffset || 14;
            targetNpc.emote = pkt.emote || { emoji: '😱', expiresAt: Date.now() + 5000 };
            if (typeof pkt.targetX === 'number') targetNpc.targetX = pkt.targetX;
            if (typeof pkt.targetY === 'number') targetNpc.targetY = pkt.targetY;
            if (pkt.murmur) targetNpc.murmur = pkt.murmur;
          } else if (pkt.reaction === 'exile') {
            this.npcPlayers.delete(pkt.npcId);
          }
        }
        if (this.callbacks.onRemoteNpcReaction) {
          this.callbacks.onRemoteNpcReaction(pkt);
        }
        break;
      }
      case 'device_repair': {
        if (this.callbacks.onRemoteDeviceRepair) {
          this.callbacks.onRemoteDeviceRepair(pkt);
        }
        break;
      }
      case 'item_collected': {
        if (this.callbacks.onRemoteItemCollected) {
          this.callbacks.onRemoteItemCollected(pkt);
        }
        break;
      }
    }
  }

  /**
   * 更新 NPC 隨機巡視、鳥人指揮官奔跑/10%跟隨碎念/20%拉進會議室關門10秒、以及隨機暴走與武器擊退機制
   */
  update(tick) {
    const now = Date.now();

    // 晝夜輪替檢查：每 120 tick (約 2 秒) 檢查一次目前是否為夜間 (17:00 ~ 05:00)
    // 若時段發生跨越，自動重新初始化 NPC 陣容
    if (tick % 120 === 0) {
      const isNight = this.isNightTime();
      const hasGuard = this.npcPlayers.has('npc_security_guard');
      if ((isNight && !hasGuard) || (!isNight && hasGuard)) {
        this.initNPCs();
      }
    }

    // 鳥人指揮官自動返場重生：若不在 NPC 清單中且休養冷卻已結束，自動生成重返辦公室
    if (tick % 60 === 0 && !this.npcPlayers.has('npc_bird_commander')) {
      let resting = false;
      try {
        const persisted = JSON.parse(localStorage.getItem('PP00_GATHER_PERSISTENCE_v1') || '{}');
        if (persisted.birdCommanderRestUntil && now < persisted.birdCommanderRestUntil) {
          resting = true;
        }
      } catch (e) {}
      if (!resting) {
        this.spawnBirdCommander();
      }
    }

    const allEntities = [
      ...(this.localPlayer ? [this.localPlayer] : []),
      ...this.remotePlayers.values(),
      ...this.npcPlayers.values(),
    ];
    // 遠端玩家移動線性內插 (LERP 平滑移動，消除跨區域網路 WebSocket 幀隙帶來的瞬移卡頓感)
    this.remotePlayers.forEach((rp) => {
      if (typeof rp.targetX === 'number' && typeof rp.targetY === 'number') {
        const dx = rp.targetX - rp.x;
        const dy = rp.targetY - rp.y;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          rp.x += dx * 0.35;
          rp.y += dy * 0.35;
        } else {
          rp.x = rp.targetX;
          rp.y = rp.targetY;
        }
      }
    });

    allEntities.forEach((ent) => {
      if (ent.murmur && now >= ent.murmur.expiresAt) {
        delete ent.murmur;
        ent.murmur = null;
      }
      if (ent.emote && now >= ent.emote.expiresAt) {
        delete ent.emote;
        ent.emote = null;
      }
      if (ent.jumpOffset > 0) {
        ent.jumpOffset = Math.max(0, ent.jumpOffset - 1.8);
      }
    });

    // 房長定期統一同步：向所有在線客戶端廣播權威 world_sync 封包 (NPC 位置/動作/碎念、掉落物、怪物、工作站螢幕)
    if (this.isRoomMaster() && tick % 30 === 0 && this.remotePlayers && this.remotePlayers.size > 0) {
      const worldData = {
        npcs: Array.from(this.npcPlayers.values()).map((npc) => ({
          id: npc.id,
          x: Math.round(npc.x),
          y: Math.round(npc.y),
          targetX: Math.round(npc.targetX),
          targetY: Math.round(npc.targetY),
          dir: npc.dir,
          actionState: npc.actionState,
          isMoving: npc.isMoving,
          isBerserk: !!npc.isBerserk,
          isFleeing: !!npc.isFleeing,
          fleeUntil: npc.fleeUntil || 0,
          jumpOffset: Math.round(npc.jumpOffset || 0),
          murmur: npc.murmur || null,
          emote: npc.emote || null,
          followTargetId: npc.followTargetId || null,
          followPlayerUntil: npc.followPlayerUntil || 0,
          waypointIdx: npc.waypointIdx || 0,
        })),
      };
      if (this.callbacks.getWorldSyncState) {
        try {
          const extra = this.callbacks.getWorldSyncState();
          Object.assign(worldData, extra);
        } catch (_) {}
      }
      this.broadcastPacket('world_sync', worldData);
    }

    // 隨機觸發某位 NPC 進入「💢 暴走追擊模式」（機率 0.1%，僅房長觸發避免各裝置分歧）
    const berserkChance = window.GATHER_CONFIG?.security?.berserkChance ?? 0.001;
    if (this.isRoomMaster() && this.localPlayer && tick % 60 === 0) {
      const candidates = [...this.npcPlayers.values()].filter(
        (n) => !n.isBerserk && now > n.berserkCooldownUntil && !n.knockback
      );
      if (candidates.length > 0 && Math.random() < berserkChance) {
        const attacker = candidates[Math.floor(Math.random() * candidates.length)];
        attacker.isBerserk = true;
        attacker.berserkUntil = now + 7500;
        attacker.emote = { emoji: '💢', expiresAt: now + 7500 };
        const cry =
          attacker.berserkCries[Math.floor(Math.random() * attacker.berserkCries.length)];
        attacker.murmur = {
          text: cry,
          mood: 'fire',
          createdAt: now,
          expiresAt: now + 7500,
        };
        if (this.callbacks.onBerserkStart) {
          this.callbacks.onBerserkStart(attacker, cry);
        }
      }
    }

    let npcSeq = 0;
    this.npcPlayers.forEach((npc) => {
      const idx = npcSeq++;

      // 處理被擊退時的拋物線物理
      if (npc.knockback && npc.knockback.ticksLeft > 0) {
        const nx = npc.x + npc.knockback.vx;
        const ny = npc.y + npc.knockback.vy;
        if (!window.isPositionBlocked(nx, npc.y, 14)) npc.x = nx;
        if (!window.isPositionBlocked(npc.x, ny, 14)) npc.y = ny;
        npc.knockback.vx *= 0.87;
        npc.knockback.vy *= 0.87;
        npc.knockback.ticksLeft--;
        npc.jumpOffset = Math.max(
          npc.jumpOffset || 0,
          Math.sin((npc.knockback.ticksLeft / 24) * Math.PI) * 26
        );
        if (npc.knockback.ticksLeft <= 0) {
          npc.knockback = null;
        }
        return;
      }

      // 檢查暴走是否結束
      if (npc.isBerserk && now >= npc.berserkUntil) {
        npc.isBerserk = false;
        npc.berserkCooldownUntil = now + 28000;
      }

      // 😱 NPC 害怕逃跑 AI：以高速 (speed 5.2) 遠離玩家，伴隨慌張彈跳動畫與求救表情
      if (npc.isFleeing) {
        if (now >= (npc.fleeUntil || 0)) {
          npc.isFleeing = false;
        } else {
          let threat = this.localPlayer;
          let threatDist = threat ? Math.hypot(npc.x - threat.x, npc.y - threat.y) : 9999;
          this.remotePlayers.forEach((p) => {
            const d = Math.hypot(npc.x - p.x, npc.y - p.y);
            if (d < threatDist) {
              threatDist = d;
              threat = p;
            }
          });

          if (threat) {
            const escapeAng = Math.atan2(npc.y - threat.y, npc.x - threat.x);
            const candX = Math.max(160, Math.min(2640, npc.x + Math.cos(escapeAng) * 220));
            const candY = Math.max(160, Math.min(1740, npc.y + Math.sin(escapeAng) * 220));
            npc.targetX = candX;
            npc.targetY = candY;
          }
          npc.jumpOffset = Math.max(npc.jumpOffset || 0, Math.abs(Math.sin(tick * 0.45)) * 12);
        }
      }

      // 🏏 夜間巡邏警衛專屬 AI：巡視辦公室、主動尋找方塊怪並揮棒擊退消滅！
      if (npc.isSecurityGuard && !npc.isBerserk) {
        const mobs = this.callbacks.getMobs ? this.callbacks.getMobs() : [];
        let nearestMob = null;
        let nearestDist = 9999;
        mobs.forEach((m) => {
          if (m && m.hp > 0) {
            const d = Math.hypot(m.x - npc.x, m.y - npc.y);
            if (d < 320 && d < nearestDist) {
              nearestDist = d;
              nearestMob = m;
            }
          }
        });

        if (nearestMob) {
          npc.targetX = nearestMob.x;
          npc.targetY = nearestMob.y;
          if (nearestDist < 54) {
            // 警衛揮棒打怪！消滅怪物
            npc.jumpOffset = 14;
            nearestMob.hp = 0;
            if (this.callbacks.onGuardHitMob) {
              this.callbacks.onGuardHitMob(npc, nearestMob);
            }
            if (!npc.murmur || now >= npc.murmur.expiresAt) {
              npc.murmur = {
                text: '🏏 發現方塊怪！看老李警棍伺候！妖魔退散！',
                mood: 'fire',
                createdAt: now,
                expiresAt: now + 3500,
              };
            }
          }
        }
      }

      // 🦩 鳥人指揮官專屬 AI：隨機跟隨全辦公室真實線上同仁（由房長權威主機決定，避免各裝置分歧）
      if (npc.isBirdCommander && !npc.isBerserk) {
        const sec = window.GATHER_CONFIG?.security || {};
        const followChance = sec.birdFollowChance ?? 0.10;

        // 收集目前全辦公室所有真實線上使用者 (本機玩家 + 遠端同仁，排除 NPC 與怪物)
        const realPlayers = [];
        if (this.localPlayer && (this.localPlayer.name || this.localPlayer.id)) {
          realPlayers.push(this.localPlayer);
        }
        for (const remote of this.remotePlayers.values()) {
          if (remote && remote.id && !remote.isNpc && !remote.isMob) {
            realPlayers.push(remote);
          }
        }

        // 權威模式：若線上正有活著的房長在同步（過去3秒有收到 world_sync），非房長端不擅自擲骰更換跟隨對象，維持全場完全一致
        const hasActiveRemoteMaster = !this.isRoomMaster() && (now - (this.lastMasterSyncTime || 0) < 3000);
        if (!hasActiveRemoteMaster) {
          // 每 4 秒判定是否開始隨機跟隨某位真實線上同仁
          if (now >= npc.followPlayerUntil && tick % 240 === 60 && realPlayers.length > 0) {
            if (Math.random() < followChance) {
              const picked = realPlayers[Math.floor(Math.random() * realPlayers.length)];
              npc.followTargetId = picked.id;
              npc.followPlayerUntil = now + 14000; // 跟隨 14 秒
              npc.emote = { emoji: '🦩', expiresAt: now + 14000 };
              const targetName = picked.name || '同仁';
              npc.murmur = {
                text: `🦩 紅鶴指揮官盯著【${targetName}】！Action Item改完沒？嘎！`,
                mood: 'fire',
                createdAt: now,
                expiresAt: now + 4500,
              };
              if (this.callbacks.onBirdFollowStart) {
                this.callbacks.onBirdFollowStart(npc, picked);
              }
            }
          }
        }

        // 解析當前鎖定的真實跟隨目標（房長與非房長均可平滑追蹤目標座標）
        let followTarget = null;
        if (npc.followTargetId) {
          if (this.localPlayer && this.localPlayer.id === npc.followTargetId) {
            followTarget = this.localPlayer;
          } else if (this.remotePlayers.has(npc.followTargetId)) {
            followTarget = this.remotePlayers.get(npc.followTargetId);
          }
        }
        // 若未鎖定特定目標，且場上有真實線上同仁，且為房長時，巡邏時鎖定視線內或最近的真實同仁
        if (!followTarget && realPlayers.length > 0 && this.isRoomMaster()) {
          followTarget = realPlayers.find((p) => this.isPlayerInSight(npc, p)) || realPlayers[0];
        }

        const isNightTime = this.isNightTime();

        // 僅由權威主機（房長或單機）判定白天抓同仁進會議室關門檢討 10 秒，避免分歧
        if (!hasActiveRemoteMaster && !isNightTime && followTarget) {
          const inSight = this.isPlayerInSight(npc, followTarget);
          if (
            inSight &&
            followTarget.actionState !== 'toilet' &&
            now > (npc.meetingLockCooldownUntil || 0) &&
            tick % 240 === 120 &&
            (!window.MEETING_LOCK_STATE || now >= window.MEETING_LOCK_STATE.lockedUntil)
          ) {
            const pullCount = npc.meetingPullCount || 0;
            const pullChance = sec.birdMeetingPullChance ?? 0.10;
            const effectivePullChance = pullChance * Math.pow(0.35, pullCount);
            if (Math.random() < effectivePullChance) {
              npc.meetingPullCount = pullCount + 1;
              npc.meetingLockCooldownUntil = now + 55000;
              npc.followPlayerUntil = 0;
              const roomId = Math.random() < 0.5 ? 'meet_a' : 'meet_b';
              const roomX = roomId === 'meet_a' ? 400 : 925;
              const roomY = 1345;
              npc.x = roomX - 38;
              npc.y = roomY;
              npc.targetX = roomX - 38;
              npc.targetY = roomY;
              npc.actionState = roomId === 'meet_a' ? 'watch_stock' : 'pray_kuaikuai';
              const targetName = followTarget.name || '同仁';
              npc.murmur = {
                text: `🦩 白天上班抓【${targetName}】進會議室閉門檢討10秒（按[F]可擊退脫困）！`,
                mood: 'fire',
                createdAt: now,
                expiresAt: now + 10000,
              };
              this.broadcastPacket('meeting_pull', {
                npcId: npc.id,
                roomId,
                roomX: roomX - 38,
                roomY,
                targetId: followTarget.id,
                targetName,
                murmurText: npc.murmur.text,
              });
              if (this.callbacks.onMeetingPull) {
                this.callbacks.onMeetingPull(npc, roomId, roomX + 36, roomY, followTarget);
              }
            }
          }
        }

        // 若正在跟隨使用者：緊貼在目標身旁 44px 處、模仿情境動作、並持續 MURMUR 碎念
        if (now < npc.followPlayerUntil && followTarget) {
          if (followTarget.actionState === 'toilet') {
            const activeStall = window.WORLD_MAP?.toiletStalls?.find(
              (s) => s.occupiedBy === followTarget.id
            );
            npc.targetX = activeStall ? activeStall.x - 38 : 2432;
            npc.targetY = activeStall ? activeStall.y + 48 : 852;
          } else {
            const cands = [
              { dx: 44, dy: 16 },
              { dx: -44, dy: 16 },
              { dx: 0, dy: 44 },
              { dx: 0, dy: -44 },
              { dx: 36, dy: -36 },
              { dx: -36, dy: -36 }
            ];
            let chosenOffset = cands[0];
            if (typeof window.isPositionBlocked === 'function') {
              for (const cand of cands) {
                if (!window.isPositionBlocked(followTarget.x + cand.dx, followTarget.y + cand.dy, 16)) {
                  chosenOffset = cand;
                  break;
                }
              }
            }
            npc.targetX = followTarget.x + chosenOffset.dx;
            npc.targetY = followTarget.y + chosenOffset.dy;
            if (followTarget.actionState) {
              npc.actionState = followTarget.actionState;
            }
          }
          if (this.isRoomMaster() && (!npc.murmur || now >= npc.murmur.expiresAt - 800)) {
            const line =
              npc.murmurs[Math.floor(Math.random() * npc.murmurs.length)];
            npc.murmur = {
              text: line,
              mood: 'fire',
              createdAt: now,
              expiresAt: now + 4000,
            };
          }
        }
      }

      // 🚽 廁所催促情境：嚴格限制只有在玩家「正在廁所蹲馬桶 (actionState === 'toilet')」時生效！
      // 而且「僅當 NPC 照常走自己的路徑剛好走過去門口附近 (distToDoor <= 110)」時隨機觸發催促
      // 絕不強制將全地圖 NPC 吸過來，也不在非上廁所狀態下發動
      if (
        this.localPlayer &&
        this.localPlayer.actionState === 'toilet' &&
        !npc.isBerserk
      ) {
        const activeStall = window.WORLD_MAP?.toiletStalls?.find(
          (s) => s.occupiedBy === this.localPlayer.id
        );
        if (activeStall) {
          const doorX = activeStall.x - 38;
          const doorY = activeStall.y + 48;
          const distToDoor = Math.hypot(npc.x - doorX, npc.y - doorY);

          // 只有當 NPC 沿著原定巡邏路徑剛好經過該間廁所門外 (<= 110px) 時隨機觸發
          if (distToDoor <= 110 && now > (npc.toiletKickCooldownUntil || 0)) {
            npc.toiletKickCooldownUntil = now + 16000;
            if (Math.random() < 0.45) {
              const kickLines = window.GATHER_CONFIG?.toiletKickMurmurs || [
                '拉完了沒換我了！',
                '不要再屎遁啦！',
                '好了沒？老闆在找你！',
                '裡面的人好了沒？外面在排隊了！',
              ];
              const kickText =
                kickLines[Math.floor(Math.random() * kickLines.length)];
              npc.jumpOffset = 12;
              npc.emote = { emoji: '🦵', expiresAt: now + 3000 };
              npc.murmur = {
                text: kickText,
                mood: 'fire',
                createdAt: now,
                expiresAt: now + 4000,
              };
              if (this.callbacks.onNpcToiletKick) {
                this.callbacks.onNpcToiletKick(npc, kickText);
              }
            }
          }
        }
      }

      if (npc.isBerserk && this.localPlayer) {
        // 💢 暴走狀態：鎖定玩家高速追擊！
        npc.targetX = this.localPlayer.x;
        npc.targetY = this.localPlayer.y;
        const distToPlayer = Math.hypot(
          this.localPlayer.x - npc.x,
          this.localPlayer.y - npc.y
        );
        if (distToPlayer < 46) {
          npc.isBerserk = false;
          npc.berserkCooldownUntil = now + 35000;
          npc.jumpOffset = 16;
          const reason =
            npc.berserkCries[Math.floor(Math.random() * npc.berserkCries.length)];
          if (this.callbacks.onBerserkHit) {
            this.callbacks.onBerserkHit(npc, reason);
          }
        }
      } else if (npc.id === 'npc_dir_pp00' && npc.repairingTarget) {
        // 處長正在出動修理設備，每 tick 追蹤走向與維修進度
        let isStillBroken = false;
        if (npc.repairingTarget.type === 'ws') {
          isStillBroken = !!window.WORLD_MAP?.workstations?.[npc.repairingTarget.idx]?.isBroken;
        } else if (npc.repairingTarget.type === 'lab') {
          isStillBroken = !!window.WORLD_MAP?.labEquipments?.[npc.repairingTarget.idx]?.isBroken;
        }
        if (!isStillBroken) {
          npc.repairingTarget = null;
          npc.repairStartedAt = null;
          npc.actionState = null;
        } else {
          const distToDevice = Math.hypot(npc.x - npc.repairingTarget.x, npc.y - npc.repairingTarget.y);
          if (distToDevice <= 48) {
            // 到達損壞機台，進行 4.5 秒修理動作 (zen_debug 盤腿懸浮除錯)
            if (!npc.repairStartedAt) {
              npc.repairStartedAt = now;
              npc.actionState = 'zen_debug';
              npc.actionUntil = now + 4800;
            } else if (now - npc.repairStartedAt >= 4500) {
              // 修理完成，恢復機台狀態並廣播
              const target = npc.repairingTarget;
              if (target.type === 'ws') {
                const ws = window.WORLD_MAP?.workstations?.[target.idx];
                if (ws) {
                  ws.isBroken = false;
                  ws.brokenBy = null;
                  this.broadcastPacket('device_repair', { type: 'ws', idx: target.idx });
                }
              } else if (target.type === 'lab') {
                const eq = window.WORLD_MAP?.labEquipments?.[target.idx];
                if (eq) {
                  eq.isBroken = false;
                  eq.brokenBy = null;
                  eq.status = 'PASS 99.9%';
                  eq.statusColor = '#22c55e';
                  this.broadcastPacket('device_repair', { type: 'lab', idx: target.idx });
                }
              }
              npc.murmur = {
                text: '終於修好了！工程師們好好檢討！',
                mood: 'normal',
                createdAt: now,
                expiresAt: now + 4000,
              };
              this.broadcastPacket('murmur', {
                author: npc.name,
                text: npc.murmur.text,
                mood: 'normal',
                avatarId: npc.avatarId,
                senderId: npc.id,
              });
              if (this.callbacks && this.callbacks.onDirectorRepaired) {
                this.callbacks.onDirectorRepaired(npc, target);
              }
              npc.repairingTarget = null;
              npc.repairStartedAt = null;
              npc.actionState = null;
              npc.repairCooldownUntil = now + 20000;
            }
          } else {
            // 持續走向損壞設備
            npc.targetX = npc.repairingTarget.x;
            npc.targetY = npc.repairingTarget.y;
            npc.actionState = null;
          }
        }
      } else if ((!npc.isBirdCommander || now >= npc.followPlayerUntil) && this.isRoomMaster()) {
        // 若 NPC 正在進行情境動作，維持目前位置與動作狀態
        if (now < (npc.actionUntil || 0)) {
          // 情境動作中
        } else {
          const switchPeriod = npc.isBirdCommander ? 125 : 170;
          if (tick % switchPeriod === (idx * 43) % switchPeriod) {
            const hour = new Date().getHours();
            const isNightShift = hour >= 21 || hour < 7;
            const isLunch = hour >= 12 && hour <= 13;
            const actionChance =
              window.GATHER_CONFIG?.security?.npcContextualActionChance ?? 0.30;

            if (npc.isBirdCommander) {
              npc.waypointIdx = (npc.waypointIdx + 1) % npc.waypoints.length;
              const birdActions = [
                'sit_code',
                'drink_coffee',
                'slack_nap',
                'sleep_bed',
                'pray_kuaikuai',
                'watch_stock',
                'victory_dance',
                'daydream',
                null,
              ];
              npc.actionState =
                birdActions[Math.floor(Math.random() * birdActions.length)];
              const wp = npc.waypoints[npc.waypointIdx];
              npc.targetX = wp.x;
              npc.targetY = wp.y;
            } else if (npc.id === 'npc_vp_boss') {
              const inVpRoom = npc.x < 620 && npc.y < 440;
              if (inVpRoom && Math.random() < actionChance) {
                const vpActions = isNightShift
                  ? ['sleep_bed', 'slack_nap', 'sit_code', 'watch_stock']
                  : ['watch_stock', 'sit_code', 'drink_coffee', 'victory_dance', 'slack_nap'];
                const picked =
                  vpActions[Math.floor(Math.random() * vpActions.length)];
                npc.actionState = picked;
                npc.actionUntil = now + 9000 + Math.random() * 8000;
                npc.targetX = 380;
                npc.targetY = 310;
              } else {
                npc.actionState = null;
                npc.waypointIdx = (npc.waypointIdx + 1) % npc.waypoints.length;
                const wp = npc.waypoints[npc.waypointIdx];
                npc.targetX = wp.x;
                npc.targetY = wp.y;
              }
            } else if (npc.id === 'npc_dir_pp00') {
              // 檢查是否有損壞的機台或電腦
              const brokenDevices = [];
              if (window.WORLD_MAP?.workstations) {
                window.WORLD_MAP.workstations.forEach((ws, wsIdx) => {
                  if (ws.isBroken) {
                    brokenDevices.push({
                      type: 'ws',
                      idx: wsIdx,
                      name: `電腦 (${ws.owner || wsIdx})`,
                      x: ws.x + 32,
                      y: ws.y + 45,
                    });
                  }
                });
              }
              if (window.WORLD_MAP?.labEquipments) {
                window.WORLD_MAP.labEquipments.forEach((eq, eqIdx) => {
                  if (eq.isBroken) {
                    brokenDevices.push({
                      type: 'lab',
                      idx: eqIdx,
                      name: eq.name || '機台',
                      x: eq.x + eq.w / 2,
                      y: eq.y + eq.h / 2,
                    });
                  }
                });
              }

              const repairChance = window.GATHER_CONFIG?.security?.directorRepairChance ?? 0.10;
              if (brokenDevices.length > 0 && now > (npc.repairCooldownUntil || 0) && Math.random() < repairChance) {
                const target = brokenDevices[Math.floor(Math.random() * brokenDevices.length)];
                npc.repairingTarget = target;
                npc.repairStartedAt = null;
                npc.targetX = target.x;
                npc.targetY = target.y;
                npc.actionState = null;

                const repairDialogues = window.GATHER_CONFIG?.bossScoldDialogues?.director_repair ||
                  window.GATHER_CONFIG?.npcDialogues?.director_repair ||
                  window.GATHER_CONFIG?.dialogues?.director_repair || [
                  '我真命苦，還要我特地下來修理',
                  '工程師都在睡覺嗎？我還要出馬',
                ];
                const line = repairDialogues[Math.floor(Math.random() * repairDialogues.length)];
                npc.murmur = {
                  text: line,
                  mood: 'fire',
                  createdAt: now,
                  expiresAt: now + 5000,
                };
                this.broadcastPacket('murmur', {
                  author: npc.name,
                  text: line,
                  mood: 'fire',
                  avatarId: npc.avatarId,
                  senderId: npc.id,
                });
              } else {
                const inDirRoom = npc.x >= 640 && npc.x < 870 && npc.y < 440;
                if (inDirRoom && Math.random() < actionChance) {
                  const dirActions = isLunch
                    ? ['drink_coffee', 'slack_nap', 'sleep_bed', 'sit_code']
                    : ['sit_code', 'pray_kuaikuai', 'drink_coffee', 'watch_stock', 'zen_debug'];
                  const picked =
                    dirActions[Math.floor(Math.random() * dirActions.length)];
                  npc.actionState = picked;
                  npc.actionUntil = now + 9000 + Math.random() * 8000;
                  npc.targetX = 760;
                  npc.targetY = 330;
                } else {
                  npc.actionState = null;
                  npc.waypointIdx = (npc.waypointIdx + 1) % npc.waypoints.length;
                  const wp = npc.waypoints[npc.waypointIdx];
                  npc.targetX = wp.x;
                  npc.targetY = wp.y;
                }
              }
            } else if (npc.isSweeper) {
              // 判定打掃阿姨是否位於廁所/洗手台區域 (x: 2180~2650, y: 560~1080)
              const inRestroomArea = npc.x >= 2180 && npc.x <= 2650 && npc.y >= 560 && npc.y <= 1080;
              if (inRestroomArea) {
                // 只在廁所進行洗手搓泡動作
                npc.actionState = 'wash_hands';
                npc.actionUntil = now + 7000 + Math.random() * 4000;
                npc.targetX = 2255; // 走向 1 號感應泡沫洗手台
                npc.targetY = 682;
              } else {
                // 其餘所有地方一律進行掃地動作，不再摸魚或喝咖啡
                npc.actionState = 'sweep_floor';
                npc.waypointIdx = (npc.waypointIdx + 1) % npc.waypoints.length;
                const wp = npc.waypoints[npc.waypointIdx];
                npc.targetX = wp.x;
                npc.targetY = wp.y;
              }
            } else if (npc.isSecurityGuard) {
              // 警衛巡邏換點
              npc.actionState = null;
              npc.waypointIdx = (npc.waypointIdx + 1) % npc.waypoints.length;
              const wp = npc.waypoints[npc.waypointIdx];
              npc.targetX = wp.x;
              npc.targetY = wp.y;
            }
          }
        }
      }

      // 執行平滑走位 (包含撞牆平滑轉向與定身檢驗)
      const dx = npc.targetX - npc.x;
      const dy = npc.targetY - npc.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 6) {
        let speed = 2.4;
        if (npc.isFleeing) speed = 5.2;
        else if (npc.isBerserk) speed = 4.8;
        else if (npc.isRunner) speed = 3.6;
        else if (npc.isSweeper) speed = 1.9;
        else if (npc.isSecurityGuard) speed = 2.6;

        const moveStep = Math.min(dist, speed);
        const vx = (dx / dist) * moveStep;
        const vy = (dy / dist) * moveStep;

        const nx = npc.x + vx;
        const ny = npc.y + vy;

        let moved = false;
        if (!window.isPositionBlocked(nx, ny, 16)) {
          npc.x = nx;
          npc.y = ny;
          moved = true;
        } else if (!window.isPositionBlocked(nx, npc.y, 16)) {
          npc.x = nx;
          moved = true;
        } else if (!window.isPositionBlocked(npc.x, ny, 16)) {
          npc.y = ny;
          moved = true;
        }

        // 偵測是否被角落或門框卡住，若卡住則自動脫困導向
        if (!moved) {
          npc.stuckTicks = (npc.stuckTicks || 0) + 1;
        } else {
          npc.stuckTicks = Math.max(0, (npc.stuckTicks || 0) - 1);
        }

        if (npc.stuckTicks >= 16) {
          // 連續 16 tick 無法移動：判定卡住，自動前進到下一個走廊路徑點脫困
          if (npc.waypoints && npc.waypoints.length > 0) {
            npc.waypointIdx = (npc.waypointIdx + 1) % npc.waypoints.length;
            const nextWp = npc.waypoints[npc.waypointIdx];
            npc.targetX = nextWp.x;
            npc.targetY = nextWp.y;
          }
          npc.stuckTicks = 0;
        }

        npc.isMoving = true;
        if (Math.abs(dx) > Math.abs(dy)) {
          npc.dir = dx > 0 ? 'right' : 'left';
        } else {
          npc.dir = dy > 0 ? 'down' : 'up';
        }
      } else {
        npc.isMoving = false;
        if (npc.isBerserk) {
          npc.targetX = this.localPlayer ? this.localPlayer.x : npc.x;
          npc.targetY = this.localPlayer ? this.localPlayer.y : npc.y;
        }
      }
    });

    // 清理超過 60 秒無訊號的遠端玩家
    this.remotePlayers.forEach((p, id) => {
      if (p.lastSeen && now - p.lastSeen > 60000) {
        this.remotePlayers.delete(id);
        if (this.callbacks.onPlayerLeave) {
          this.callbacks.onPlayerLeave(p);
        }
      }
    });
  }

  getAllOtherPlayers() {
    return [...this.remotePlayers.values(), ...this.npcPlayers.values()];
  }
}

if (typeof window !== 'undefined') {
  window.EphemeralOfficeNetwork = EphemeralOfficeNetwork;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EphemeralOfficeNetwork };
}
