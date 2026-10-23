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

    this.initNPCs();
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
    const dlg = window.GATHER_CONFIG.npcDialogues;
    const randomItems = window.GATHER_CONFIG.items;
    const pickRandomEmoji = () =>
      randomItems[Math.floor(Math.random() * randomItems.length)].emoji;

    const npcTemplates = [
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
        murmurs: dlg.vp,
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
        murmurs: dlg.director_pp00,
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
        murmurs: dlg.auntie_meifeng,
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
        murmurs: dlg.auntie_shufen,
        berserkCries: [
          '💢 淑芬阿姨暴走：上廁所沒洗手？泡沫無影腳踢飛！',
          '💢 淑芬阿姨暴走：咖啡滴滿桌沒擦！旋風海綿擊飛！',
        ],
      },
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
          { x: 640, y: 820 },   // PE 辦公區
          { x: 2350, y: 310 },  // 茶水間
          { x: 400, y: 1350 },  // 會議室 A 敞開走道區
          { x: 1660, y: 820 },  // TE 辦公區
          { x: 925, y: 1350 },  // 會議室 B 敞開走道區
          { x: 1820, y: 1500 }, // Lab 實驗室
          { x: 1240, y: 350 },  // 處級主管區
          { x: 2340, y: 820 },  // 廁所外走廊
        ],
        isSweeper: false,
        isBirdCommander: true,
        isRunner: true,
        murmurs: dlg.bird_commander || [
          '🦩 紅鶴奔跑巡視中，進度抓緊！',
        ],
        berserkCries: [
          '💢 鳥人指揮官暴走：Action Item沒寫完，飛去改報告！',
          '💢 鳥人指揮官暴走：吃我一記紅鶴雙翼擊飛術！',
        ],
      },
    ];

    // 檢查持久化狀態：若鳥人指揮官已被永久擊退流放，不予生成
    let birdExiled = false;
    try {
      const persisted = JSON.parse(localStorage.getItem('PP00_GATHER_PERSISTENCE_v1') || '{}');
      birdExiled = !!persisted.birdCommanderExiled;
    } catch (e) {}

    npcTemplates.forEach((tpl) => {
      if (tpl.id === 'npc_bird_commander' && birdExiled) return;
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
        meetingLockCooldownUntil: Date.now() + 15000,
        meetingPullCount: 0,
        knockback: null,
        murmur: null,
        emote: null,
      });
    });
  }

  /**
   * 檢查使用者是否處於 NPC 的前方視線範圍內 (Line of Sight) 且無障礙物阻擋
   */
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
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            if (key === this.clientId || !newPresences || !newPresences[0]) return;
            this.upsertRemotePlayer(newPresences[0], true);
          })
          .on('presence', { event: 'leave' }, ({ key }) => {
            if (key === this.clientId) return;
            const leaving = this.remotePlayers.get(key);
            if (leaving) {
              this.remotePlayers.delete(key);
              if (this.callbacks.onPlayerLeave) this.callbacks.onPlayerLeave(leaving);
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              this.isCloudConnected = true;
              if (this.callbacks.onConnectionChange) {
                this.callbacks.onConnectionChange(true, 'Supabase Realtime 雲端瞬時頻道');
              }
              await this.realtimeChannel.track(this.getPublicState());
              this.broadcastPacket('join_announce', { player: this.getPublicState() });
            }
          });
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
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'ephemeral_pkt',
          payload: packet,
        });
      } catch (_) {}
    }
  }

  upsertRemotePlayer(pData, notifyJoin = false) {
    if (!pData || !pData.id || pData.id === this.clientId) return;
    const isNew = !this.remotePlayers.has(pData.id);
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

    if (isNew && notifyJoin && this.callbacks.onPlayerJoin) {
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
      case 'murmur': {
        const sender = this.remotePlayers.get(pkt.senderId);
        if (sender) {
          const ttl = window.GATHER_CONFIG.security.murmurTtlMs;
          sender.murmur = {
            text: this.sanitizeText(pkt.text, 100),
            mood: pkt.mood || 'normal',
            createdAt: Date.now(),
            expiresAt: Date.now() + ttl,
          };
        }
        break;
      }
      case 'proximity_chat': {
        if (!this.localPlayer) return;
        const sender = this.remotePlayers.get(pkt.senderId);
        const sx = sender ? sender.x : pkt.x;
        const sy = sender ? sender.y : pkt.y;
        const dist = Math.hypot(this.localPlayer.x - sx, this.localPlayer.y - sy);
        if (dist <= window.GATHER_CONFIG.security.proximityRadiusPx * 1.25) {
          if (this.callbacks.onProximityChat) {
            this.callbacks.onProximityChat({
              id: pkt.nonce,
              senderId: pkt.senderId,
              senderName: this.sanitizeText(pkt.senderName || '同事', 16),
              senderUnit: this.sanitizeText(pkt.senderUnit || 'PP00', 8),
              text: this.sanitizeText(pkt.text, 100),
              createdAt: Date.now(),
              expiresAt: Date.now() + window.GATHER_CONFIG.security.chatMessageTtlMs,
            });
          }
        }
        break;
      }
      case 'private_chat': {
        if (!this.localPlayer) return;
        // 🔒 私人對談：僅有被指定的收件人接收此私訊，其他人不可見
        if (pkt.targetId === this.localPlayer.id) {
          if (this.callbacks.onPrivateChat) {
            this.callbacks.onPrivateChat({
              id: pkt.nonce,
              senderId: pkt.senderId,
              senderName: this.sanitizeText(pkt.senderName || '同事', 16),
              senderUnit: this.sanitizeText(pkt.senderUnit || 'PP00', 8),
              targetId: pkt.targetId,
              targetName: this.sanitizeText(pkt.targetName || this.localPlayer.name, 16),
              text: this.sanitizeText(pkt.text, 100),
              createdAt: Date.now(),
              expiresAt: Date.now() + window.GATHER_CONFIG.security.chatMessageTtlMs,
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

    // 隨機觸發某位 NPC 進入「💢 暴走追擊模式」（機率已降低至 0.1% = 0.001）
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

      // 處理被玩家武器擊退的拋物線飛行物理
      if (npc.knockback && npc.knockback.ticksLeft > 0) {
        const nx = npc.x + npc.knockback.vx;
        const ny = npc.y + npc.knockback.vy;
        if (!window.isPositionBlocked(nx, npc.y, 14)) npc.x = nx;
        if (!window.isPositionBlocked(npc.x, ny, 14)) npc.y = ny;
        npc.knockback.vx *= 0.87;
        npc.knockback.vy *= 0.87;
        npc.knockback.ticksLeft--;
        npc.jumpOffset = Math.max(npc.jumpOffset || 0, Math.sin((npc.knockback.ticksLeft / 24) * Math.PI) * 26);
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

      // 🦩 鳥人指揮官專屬 AI：奔跑巡視、模仿情境動作、10% 跟隨使用者持續 Murmur、20% 拉進會議室關門 10 秒討論
      if (npc.isBirdCommander && !npc.isBerserk && this.localPlayer) {
        const sec = window.GATHER_CONFIG?.security || {};
        const followChance = sec.birdFollowChance ?? 0.10;
        const pullChance = sec.birdMeetingPullChance ?? 0.20;

        // 每 4 秒擲骰：10% 機率開始跟隨線上使用者 12 秒並持續碎念
        if (now >= npc.followPlayerUntil && tick % 240 === 60) {
          if (Math.random() < followChance) {
            npc.followPlayerUntil = now + 12000;
            npc.emote = { emoji: '🦩', expiresAt: now + 12000 };
            npc.murmur = {
              text: '🦩 鳥人指揮官跟隨盯進度中！',
              mood: 'fire',
              createdAt: now,
              expiresAt: now + 4500,
            };
            if (this.callbacks.onBirdFollowStart) {
              this.callbacks.onBirdFollowStart(npc);
            }
          }
        }

        // 若正在跟隨使用者：緊跟在玩家身旁 48px 處、模仿玩家的情境動作、並持續不間斷 Murmur
        if (now < npc.followPlayerUntil) {
          // 若玩家在廁所隔間內，鳥人指揮官停在隔間門外並踹門催促（絕不進入隔間內部）！
          if (this.localPlayer.actionState === 'toilet') {
            const activeStall = window.WORLD_MAP?.toiletStalls?.find((s) => s.occupiedBy === this.localPlayer.id);
            npc.targetX = activeStall ? activeStall.x - 38 : 2432;
            npc.targetY = activeStall ? activeStall.y + 48 : 852;
          } else {
            npc.targetX = this.localPlayer.x + 46;
            npc.targetY = this.localPlayer.y + 18;
            if (this.localPlayer.actionState) {
              npc.actionState = this.localPlayer.actionState;
            }
          }
          if (!npc.murmur || now >= npc.murmur.expiresAt - 800) {
            const line = npc.murmurs[Math.floor(Math.random() * npc.murmurs.length)];
            npc.murmur = {
              text: line,
              mood: 'fire',
              createdAt: now,
              expiresAt: now + 4200,
            };
          }
        }

        // 當使用者進入鳥人指揮官「前方視線錐形範圍」時，每 4 秒判定：基礎 10% 機率拉進會議室關門 10 秒，且每次觸發後再次觸發機率大幅衰減！
        const inSight = this.isPlayerInSight(npc, this.localPlayer);
        if (
          inSight &&
          this.localPlayer.actionState !== 'toilet' &&
          now > npc.meetingLockCooldownUntil &&
          tick % 240 === 120 &&
          (!window.MEETING_LOCK_STATE || now >= window.MEETING_LOCK_STATE.lockedUntil)
        ) {
          const pullCount = npc.meetingPullCount || 0;
          const effectivePullChance = pullChance * Math.pow(0.35, pullCount);
          if (Math.random() < effectivePullChance) {
            npc.meetingPullCount = pullCount + 1;
            npc.meetingLockCooldownUntil = now + 55000;
            npc.followPlayerUntil = 0;
            const roomId = Math.random() < 0.5 ? 'meet_a' : 'meet_b';
            // 放置在會議室上方空曠走道區 (y=1345)，避開會議桌碰撞框 (y=1445..1585)，確保 10 秒後或擊退後絕不卡死
            const roomX = roomId === 'meet_a' ? 400 : 925;
            const roomY = 1345;
            npc.x = roomX - 38;
            npc.y = roomY;
            npc.targetX = roomX - 38;
            npc.targetY = roomY;
            npc.actionState = roomId === 'meet_a' ? 'watch_stock' : 'pray_kuaikuai';
            npc.murmur = {
              text: '🦩 抓進會議室閉門檢討10秒（按[F]可擊退脫困）！',
              mood: 'fire',
              createdAt: now,
              expiresAt: now + 10000,
            };
            if (this.callbacks.onMeetingPull) {
              this.callbacks.onMeetingPull(npc, roomId, roomX + 36, roomY);
            }
          }
        }
      }

      // 🚽 當使用者在廁所隔間內，其他角色無法進入，但會在門外互動「踹門」並發出 3 句專屬頭上 MURMUR
      if (
        this.localPlayer &&
        this.localPlayer.actionState === 'toilet' &&
        tick % 260 === (idx * 65 + 40) % 260
      ) {
        const distToToilet = Math.hypot(npc.x - this.localPlayer.x, npc.y - this.localPlayer.y);
        if (distToToilet < 480 || npc.isBirdCommander || npc.isSweeper) {
          const activeStall = window.WORLD_MAP?.toiletStalls?.find((s) => s.occupiedBy === this.localPlayer.id);
          npc.targetX = activeStall ? activeStall.x - 38 : 2432;
          npc.targetY = activeStall ? activeStall.y + 48 : 852;
          if (distToToilet < 180) {
            const kickLines = window.GATHER_CONFIG?.toiletKickMurmurs || [
              '不要再屎遁',
              '老闆在找你',
              '拉完了沒換我了',
            ];
            const kickText = kickLines[Math.floor(Math.random() * kickLines.length)];
            npc.jumpOffset = 14;
            npc.emote = { emoji: '🦵', expiresAt: now + 3500 };
            npc.murmur = {
              text: kickText,
              mood: 'fire',
              createdAt: now,
              expiresAt: now + 4500,
            };
            if (this.callbacks.onNpcToiletKick) {
              this.callbacks.onNpcToiletKick(npc, kickText);
            }
          }
        }
      }

      if (npc.isBerserk && this.localPlayer) {
        // 💢 暴走狀態：鎖定使用者高速衝刺追擊！
        npc.targetX = this.localPlayer.x;
        npc.targetY = this.localPlayer.y;
        const distToPlayer = Math.hypot(
          this.localPlayer.x - npc.x,
          this.localPlayer.y - npc.y
        );
        if (distToPlayer < 46) {
          // 命中玩家！觸發玩家自動被打飛（不再定身）與擊飛提示
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
        // 若 NPC 正在專注進行情境動作，維持目前位置與動作狀態
        if (now < (npc.actionUntil || 0)) {
          // 正在情境動作持續中，不隨意切換巡視
        } else {
          // 正常巡視與情境動作決策
          const switchPeriod = npc.isBirdCommander ? 125 : 170;
          if (tick % switchPeriod === (idx * 43) % switchPeriod) {
            const hour = new Date().getHours();
            const isNightShift = hour >= 21 || hour < 7;
            const isLunch = hour >= 12 && hour <= 13;
            const actionChance = window.GATHER_CONFIG?.security?.npcContextualActionChance ?? 0.30;

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
              npc.actionState = birdActions[Math.floor(Math.random() * birdActions.length)];
              const wp = npc.waypoints[npc.waypointIdx];
              npc.targetX = wp.x + (Math.random() - 0.5) * 80;
              npc.targetY = wp.y + (Math.random() - 0.5) * 80;
            } else if (
              (npc.id === 'npc_vp_boss' || npc.id === 'npc_dir_pp00' || npc.isSweeper) &&
              Math.random() < actionChance
            ) {
              // 👑 規則 2：VP、PP00 處長、打掃阿姨 30% 機率觸發隨機情境動作（結合 24 小時制）
              npc.actionUntil = now + (12000 + Math.random() * 8000); // 持續 12~20 秒

              if (npc.id === 'npc_vp_boss') {
                // VP: 在自己辦公室打高爾夫球、睡覺、坐在主管位置上辦公
                const weights = isNightShift
                  ? [{ act: 'sleep_bed', w: 0.65 }, { act: 'sit_code', w: 0.25 }, { act: 'golf_putt', w: 0.10 }]
                  : isLunch
                  ? [{ act: 'sleep_bed', w: 0.40 }, { act: 'golf_putt', w: 0.35 }, { act: 'sit_code', w: 0.25 }]
                  : [{ act: 'golf_putt', w: 0.45 }, { act: 'sit_code', w: 0.35 }, { act: 'sleep_bed', w: 0.20 }];

                const totalW = weights.reduce((s, o) => s + o.w, 0);
                let rnd = Math.random() * totalW;
                let picked = weights[0].act;
                for (const o of weights) {
                  if (rnd < o.w) { picked = o.act; break; }
                  rnd -= o.w;
                }
                npc.actionState = picked;

                if (picked === 'golf_putt') {
                  npc.targetX = 260; // VP 辦公室高爾夫球墊
                  npc.targetY = 350;
                  npc.emote = { emoji: '⛳', expiresAt: now + 5000 };
                  npc.murmur = { text: '⛳ 趁著空檔在辦公室推幾桿高爾夫！維持手感！', mood: 'idea', createdAt: now, expiresAt: now + 6000 };
                } else if (picked === 'sleep_bed') {
                  npc.targetX = 535; // VP 辦公室沙發
                  npc.targetY = 245;
                  npc.emote = { emoji: '💤', expiresAt: now + 5000 };
                  npc.murmur = { text: '🛌 剛看完財報有點睏，在沙發瞇一下補眠...', mood: 'normal', createdAt: now, expiresAt: now + 6000 };
                } else {
                  npc.targetX = 380; // VP 專屬主管大桌
                  npc.targetY = 265;
                  npc.emote = { emoji: '💻', expiresAt: now + 5000 };
                  npc.murmur = { text: '💻 坐在VP主管桌前審查下一代NOR Flash Roadmap！', mood: 'idea', createdAt: now, expiresAt: now + 6000 };
                }
              } else if (npc.id === 'npc_dir_pp00') {
                // PP00處長: 在自己辦公室睡覺、坐在座位上辦公
                const weights = isNightShift
                  ? [{ act: 'sleep_bed', w: 0.70 }, { act: 'sit_code', w: 0.30 }]
                  : isLunch
                  ? [{ act: 'sleep_bed', w: 0.50 }, { act: 'sit_code', w: 0.50 }]
                  : [{ act: 'sit_code', w: 0.70 }, { act: 'sleep_bed', w: 0.30 }];

                const totalW = weights.reduce((s, o) => s + o.w, 0);
                let rnd = Math.random() * totalW;
                let picked = weights[0].act;
                for (const o of weights) {
                  if (rnd < o.w) { picked = o.act; break; }
                  rnd -= o.w;
                }
                npc.actionState = picked;

                if (picked === 'sleep_bed') {
                  npc.targetX = 860; // 處長室沙發
                  npc.targetY = 250;
                  npc.emote = { emoji: '💤', expiresAt: now + 5000 };
                  npc.murmur = { text: '🛌 盯了一上午機台，在處長室沙發小瞇片刻...', mood: 'normal', createdAt: now, expiresAt: now + 6000 };
                } else {
                  npc.targetX = 755; // 處長辦公椅
                  npc.targetY = 275;
                  npc.emote = { emoji: '💻', expiresAt: now + 5000 };
                  npc.murmur = { text: '💻 坐在席位審核最新一批 CZ/FT 良率統計報表！', mood: 'idea', createdAt: now, expiresAt: now + 6000 };
                }
              } else if (npc.isSweeper) {
                // 打掃阿姨: 50% 認真打掃 (sweep_floor)，50% 摸魚 (slack_nap, drink_coffee, daydream)
                const isSlack = Math.random() < 0.5;
                if (!isSlack) {
                  npc.actionState = 'sweep_floor';
                  npc.emote = { emoji: '🧹', expiresAt: now + 5000 };
                  npc.murmur = { text: '🧹 黃金掃把出擊，走廊地毯掃得乾乾淨淨！', mood: 'normal', createdAt: now, expiresAt: now + 6000 };
                  npc.targetX = npc.x + (Math.random() - 0.5) * 60;
                  npc.targetY = npc.y + (Math.random() - 0.5) * 60;
                } else {
                  const slackActs = isLunch ? ['slack_nap', 'drink_coffee'] : ['drink_coffee', 'daydream', 'slack_nap'];
                  const act = slackActs[Math.floor(Math.random() * slackActs.length)];
                  npc.actionState = act;
                  const toPantry = Math.random() < 0.6;
                  npc.targetX = toPantry ? 2350 : 1820;
                  npc.targetY = toPantry ? 350 : 520;
                  npc.emote = { emoji: act === 'drink_coffee' ? '☕' : (act === 'slack_nap' ? '💤' : '🤦'), expiresAt: now + 5000 };
                  npc.murmur = {
                    text: act === 'drink_coffee' ? '☕ 趁主管在開會，去茶水間喝杯美式摸魚一下～' : (act === 'slack_nap' ? '🐟 掃了一上午腰痠，坐著摸魚打個瞌睡...' : '🤦 站在窗邊看風景放空一下～'),
                    mood: 'idea',
                    createdAt: now,
                    expiresAt: now + 6000,
                  };
                }
              }
            } else {
              // 70% 正常巡視各部門與走廊
              npc.actionState = npc.isSweeper ? 'sweep_floor' : null;
              npc.waypointIdx = (npc.waypointIdx + 1) % npc.waypoints.length;
              const wp = npc.waypoints[npc.waypointIdx];
              const jitterX = (Math.random() - 0.5) * 90;
              const jitterY = (Math.random() - 0.5) * 90;
              const tx = wp.x + jitterX;
              const ty = wp.y + jitterY;
              if (!window.isPositionBlocked(tx, ty, 16)) {
                npc.targetX = tx;
                npc.targetY = ty;
              } else {
                npc.targetX = wp.x;
                npc.targetY = wp.y;
              }
            }
          }
        }
      }

      const dx = npc.targetX - npc.x;
      const dy = npc.targetY - npc.y;
      const dist = Math.hypot(dx, dy);
      const moveSpeed = npc.isBerserk ? 4.3 : npc.isRunner ? 3.55 : 1.75;

      if (dist > 4) {
        npc.isMoving = true;
        const stepX = (dx / dist) * moveSpeed;
        const stepY = (dy / dist) * moveSpeed;

        const isStallCollision = (nx, ny) => {
          if (!window.WORLD_MAP?.toiletStalls) return false;
          return window.WORLD_MAP.toiletStalls.some(
            (s) => s.occupiedBy && nx >= s.x - 6 && nx <= s.x + s.w + 6 && ny >= s.y - 6 && ny <= s.y + s.h + 6
          );
        };

        const blockedX = window.isPositionBlocked(npc.x + stepX, npc.y, 14, npc.id) || isStallCollision(npc.x + stepX, npc.y);
        if (!blockedX || (npc.isBerserk && !isStallCollision(npc.x + stepX, npc.y))) {
          npc.x += stepX;
        }
        const blockedY = window.isPositionBlocked(npc.x, npc.y + stepY, 14, npc.id) || isStallCollision(npc.x, npc.y + stepY);
        if (!blockedY || (npc.isBerserk && !isStallCollision(npc.x, npc.y + stepY))) {
          npc.y += stepY;
        }
        if (Math.abs(dx) > Math.abs(dy)) {
          npc.dir = dx > 0 ? 'right' : 'left';
        } else {
          npc.dir = dy > 0 ? 'down' : 'up';
        }
      } else {
        npc.isMoving = false;
      }

      // 定期浮現符合身分的 8 秒自動銷毀 Murmur
      if (!npc.murmur && tick % 240 === (idx * 57 + 30) % 240 && Math.random() < 0.78) {
        const line = npc.murmurs[Math.floor(Math.random() * npc.murmurs.length)];
        const moods = ['normal', 'idea', 'normal'];
        npc.murmur = {
          text: line,
          mood: moods[Math.floor(Math.random() * moods.length)],
          createdAt: now,
          expiresAt: now + window.GATHER_CONFIG.security.murmurTtlMs,
        };
      }
    });
  }

  getAllOtherPlayers() {
    return [...this.remotePlayers.values(), ...this.npcPlayers.values()];
  }
}

window.EphemeralOfficeNetwork = EphemeralOfficeNetwork;
