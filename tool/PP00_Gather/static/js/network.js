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
          { x: 380, y: 310 },
          { x: 520, y: 330 },
          { x: 400, y: 510 },
          { x: 760, y: 510 },
          { x: 410, y: 1620 },
          { x: 380, y: 310 },
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
          { x: 760, y: 330 },
          { x: 760, y: 515 },
          { x: 640, y: 820 },
          { x: 1660, y: 820 },
          { x: 1780, y: 1500 },
          { x: 760, y: 515 },
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
        x: 1120,
        y: 520,
        waypoints: [
          { x: 1120, y: 520 },
          { x: 2320, y: 820 },
          { x: 2350, y: 350 },
          { x: 1580, y: 520 },
          { x: 640, y: 520 },
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
        x: 2280,
        y: 520,
        waypoints: [
          { x: 2280, y: 520 },
          { x: 2360, y: 240 },
          { x: 2340, y: 920 },
          { x: 1800, y: 1180 },
          { x: 935, y: 1650 },
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
        x: 1120,
        y: 520,
        waypoints: [
          { x: 1120, y: 520 },
          { x: 640, y: 820 },
          { x: 1660, y: 820 },
          { x: 1820, y: 1480 },
          { x: 920, y: 1380 },
          { x: 400, y: 1380 },
          { x: 2350, y: 340 },
          { x: 2340, y: 820 },
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
        x: 1000,
        y: 520,
        waypoints: [
          { x: 640, y: 820 },
          { x: 2350, y: 310 },
          { x: 400, y: 1350 },
          { x: 1660, y: 820 },
          { x: 925, y: 1350 },
          { x: 1820, y: 1500 },
          { x: 1240, y: 350 },
          { x: 2340, y: 820 },
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
      x: 1000,
      y: 520,
      waypoints: [
        { x: 640, y: 820 },
        { x: 2350, y: 310 },
        { x: 400, y: 1350 },
        { x: 1660, y: 820 },
        { x: 925, y: 1350 },
        { x: 1820, y: 1500 },
        { x: 1240, y: 350 },
        { x: 2340, y: 820 },
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
      targetX: 1000,
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
            this.upsertRemotePlayer(newPresences[0], true);
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
    };
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
    const merged = {
      ...existing,
      id: pData.id,
      name: this.sanitizeText(pData.name || '同事', 16),
      unit: this.sanitizeText(pData.unit || 'PP00', 8),
      avatarId: validUserAvatar,
      status: pData.status || 'active',
      heldItem: pData.heldItem || '🟢',
      actionState: pData.actionState || null,
      occupiedSpotId: pData.occupiedSpotId || null,
      x: Number(pData.x) || 850,
      y: Number(pData.y) || 520,
      dir: pData.dir || 'down',
      isMoving: !!pData.isMoving,
      jumpOffset: existing.jumpOffset || 0,
      murmur: existing.murmur || null,
      emote: existing.emote || null,
      lastSeen: Date.now(),
    };
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

    // 隨機觸發某位 NPC 進入「💢 暴走追擊模式」（機率 0.1%）
    const berserkChance = window.GATHER_CONFIG?.security?.berserkChance ?? 0.001;
    if (this.localPlayer && tick % 60 === 0) {
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

      // 🦩 鳥人指揮官專屬 AI：隨機 20% 出現，高機率跟隨玩家在身旁 MURMUR 碎碎念（絕不拉人去會議室）
      // 🦩 鳥人指揮官專屬 AI：隨機跟隨全辦公室真實線上同仁（隨機挑選本機玩家或遠端連線同仁）
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

        // 每 4 秒判定是否開始隨機跟隨某位真實線上同仁
        if (now >= npc.followPlayerUntil && tick % 240 === 60 && realPlayers.length > 0) {
          if (Math.random() < followChance) {
            // 隨機抽選一位真實線上同仁作為跟隨對象，完全動態無任何固定硬編碼名單
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

        // 解析當前鎖定的真實跟隨目標
        let followTarget = null;
        if (npc.followTargetId) {
          if (this.localPlayer && this.localPlayer.id === npc.followTargetId) {
            followTarget = this.localPlayer;
          } else if (this.remotePlayers.has(npc.followTargetId)) {
            followTarget = this.remotePlayers.get(npc.followTargetId);
          }
        }
        // 若未鎖定特定目標，且場上有真實線上同仁，巡邏時鎖定視線內或最近的真實同仁
        if (!followTarget && realPlayers.length > 0) {
          followTarget = realPlayers.find((p) => this.isPlayerInSight(npc, p)) || realPlayers[0];
        }

        // ☀️ 晝夜時段差別待遇：
        // 晚上到清晨 (17:00 ~ 05:00)：下班時間放過你，絕對不拉你去會議室！
        // 白天上班時間 (05:00 ~ 17:00)：鳥人指揮官巡邏盯進度，視線內隨機抓真實同仁進會議室關門檢討 10 秒！
        const isNightTime = this.isNightTime();

        if (!isNightTime && followTarget) {
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
            npc.targetX = followTarget.x + 44;
            npc.targetY = followTarget.y + 16;
            if (followTarget.actionState) {
              npc.actionState = followTarget.actionState;
            }
          }
          if (!npc.murmur || now >= npc.murmur.expiresAt - 800) {
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
      } else if (!npc.isBirdCommander || now >= npc.followPlayerUntil) {
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
              npc.waypointIdx = Math.floor(Math.random() * npc.waypoints.length);
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
              npc.targetX = wp.x + (Math.random() - 0.5) * 80;
              npc.targetY = wp.y + (Math.random() - 0.5) * 80;
            } else if (npc.id === 'npc_vp_boss') {
              if (Math.random() < actionChance) {
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
              if (Math.random() < actionChance) {
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
            } else if (npc.isSweeper) {
              if (Math.random() < actionChance) {
                const auntieActions = ['slack_nap', 'drink_coffee', 'wash_hands', 'daydream'];
                npc.actionState =
                  auntieActions[Math.floor(Math.random() * auntieActions.length)];
                npc.actionUntil = now + 8000 + Math.random() * 6000;
              } else {
                npc.actionState = 'sweep_floor';
                npc.waypointIdx = (npc.waypointIdx + 1) % npc.waypoints.length;
                const wp = npc.waypoints[npc.waypointIdx];
                npc.targetX = wp.x + (Math.random() - 0.5) * 60;
                npc.targetY = wp.y + (Math.random() - 0.5) * 60;
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
        if (npc.isBerserk) speed = 4.8;
        else if (npc.isRunner) speed = 3.6;
        else if (npc.isSweeper) speed = 1.9;
        else if (npc.isSecurityGuard) speed = 2.6;

        const moveStep = Math.min(dist, speed);
        const vx = (dx / dist) * moveStep;
        const vy = (dy / dist) * moveStep;

        const nx = npc.x + vx;
        const ny = npc.y + vy;

        if (!window.isPositionBlocked(nx, ny, 16)) {
          npc.x = nx;
          npc.y = ny;
        } else if (!window.isPositionBlocked(nx, npc.y, 16)) {
          npc.x = nx;
        } else if (!window.isPositionBlocked(npc.x, ny, 16)) {
          npc.y = ny;
        } else {
          // 遇到阻擋時隨機偏移行走目標
          npc.targetX = npc.x + (Math.random() - 0.5) * 80;
          npc.targetY = npc.y + (Math.random() - 0.5) * 80;
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
