// PP00 Gather Office — Supabase 後端持久化與全域動態同步引擎
(function (window) {
  'use strict';

  class GatherSupabaseSync {
    constructor() {
      this.client = null;
      this.channel = null;
      this.heartbeatTimer = null;
      this.currentUser = null;
      this.callbacks = {};
      this.isInitialized = false;
      this.pending = Promise.resolve();
      this.logoutPromise = null;
      this.lastErrorAt = 0;
      this.visibilityEpoch = 0;
      this.visibleSyncFailures = 0;
      this.heartbeatQueued = false;
    }

    async checked(query, backgroundSensitive = false) {
      const epoch = this.visibilityEpoch;
      let result;
      try {
        if (query.abortSignal && typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
          query = query.abortSignal(AbortSignal.timeout(5000));
        }
        result = await query;
        if (result?.error) throw result.error;
        if (backgroundSensitive) this.visibleSyncFailures = 0;
        return result;
      } catch (error) {
        const transient = result?.status === 0 || result?.status >= 500 ||
          /fetch|network|abort|timeout|timed out/i.test(String(error?.message || error?.name || ''));
        const interrupted = typeof document !== 'undefined' && (document.hidden || epoch !== this.visibilityEpoch);
        // Background suspension is retried on return. Permission/schema errors
        // remain actionable; persistent foreground network failures still alert.
        let notify = true;
        if (transient && interrupted) notify = false;
        else if (backgroundSensitive && transient) notify = ++this.visibleSyncFailures >= 2;
        if (notify && Date.now() - this.lastErrorAt > 30000) {
          this.lastErrorAt = Date.now();
          this.callbacks.onError?.(error);
        }
        throw error;
      }
    }

    queueHeartbeat() {
      if (this.logoutPromise || !this.currentUser || document.hidden) return this.pending;
      if (this.heartbeatQueued) return this.pending;
      this.heartbeatQueued = true;
      this.pending = this.pending.then(() => this.heartbeat()).finally(() => { this.heartbeatQueued = false; });
      return this.pending;
    }

    init(options = {}) {
      this.callbacks = options.callbacks || {};
      const cfg = window.GATHER_CONFIG || {};
      if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
        console.warn('[SupabaseSync] 缺少 Supabase Client 或設定，略過後端同步');
        return false;
      }

      try {
        this.client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        this.isInitialized = true;
        if (!this.visibilityHandler) {
          this.visibilityHandler = () => {
            this.visibilityEpoch++;
            if (document.hidden) {
              this.visibleSyncFailures = 0;
              clearInterval(this.heartbeatTimer);
              this.heartbeatTimer = null;
            } else if (this.currentUser && !this.logoutPromise) {
              this.startHeartbeat();
              this.queueHeartbeat();
            }
          };
          document.addEventListener('visibilitychange', this.visibilityHandler);
          window.addEventListener('online', this.visibilityHandler);
        }
        console.log('[SupabaseSync] Supabase Client 初始化成功');

        // 1. 從後端載入遊戲全域機率與規則設定，覆蓋前端預設值
        this.fetchGameConfig();

        // 2. 監聽 Realtime 表變更
        this.subscribeRealtime();

        return true;
      } catch (err) {
        console.error('[SupabaseSync] 初始化失敗:', err);
        return false;
      }
    }

    // 讀取 gather_game_config 並覆蓋全域設定
    async fetchGameConfig() {
      // Season 2 uses the server catalog/policy; legacy rows contain outdated rates.
      if (window.GATHER_CONFIG?.season2 || !this.client) return;
      try {
        const { data, error } = await this.checked(this.client
          .from('gather_game_config')
          .select('config_key, config_value'));
        if (error) throw error;
        if (data && data.length) {
          data.forEach(({ config_key, config_value }) => {
            if (config_key === 'weapon_spawn_rates' && config_value) {
              if (window.GATHER_CONFIG) {
                if (config_value.items) window.GATHER_CONFIG.items = config_value.items;
                if (config_value.hit_durability && window.GATHER_CONFIG.security) {
                  window.GATHER_CONFIG.security.weaponMaxDurability = config_value.hit_durability;
                }
              }
            } else if (config_key === 'mob_spawn_rates' && config_value) {
              if (window.GATHER_CONFIG && window.GATHER_CONFIG.security) {
                if (config_value.base_spawn_rate != null) {
                  window.GATHER_CONFIG.security.mobSpawnChance = config_value.base_spawn_rate;
                }
                if (config_value.max_active_mobs != null) {
                  window.GATHER_CONFIG.security.maxMobCount = config_value.max_active_mobs;
                }
              }
            } else if (config_key === 'npc_rules' && config_value) {
              if (window.GATHER_CONFIG && window.GATHER_CONFIG.security && config_value.bird_commander) {
                window.GATHER_CONFIG.security.birdSpawnRate = config_value.bird_commander.spawn_rate;
                window.GATHER_CONFIG.security.birdFollowChance = config_value.bird_commander.follow_rate;
                window.GATHER_CONFIG.security.birdMeetingPullChance = config_value.bird_commander.day_pull_chance ?? 0.10;
              }
            }
          });
          console.log('[SupabaseSync] 已成功從 Supabase 後端套用動態平衡與機率設定！');
          if (this.callbacks.onConfigApplied) this.callbacks.onConfigApplied();
        }
      } catch (e) {
        console.warn('[SupabaseSync] 讀取後端設定失敗 (使用預設設定):', e);
      }
    }

    // 使用者登入註冊
    registerUser(user) {
      if (this.logoutPromise) return this.logoutPromise;
      this.pending = this.pending.then(() => this.registerUserNow(user));
      return this.pending;
    }

    async registerUserNow(user) {
      if (!this.client || !user) return;
      this.currentUser = user;

      try {
        // 寫入上線稽核紀錄
        await this.checked(this.client.from('gather_audit_logs').insert({
          client_id: user.id,
          user_name: user.name,
          unit: user.unit,
          event_type: 'login',
          meta: { userAgent: navigator.userAgent },
        }));

        // Upsert 至線上使用者表
        await this.checked(this.client.from('gather_online_users').upsert({
          client_id: user.id,
          user_name: user.name,
          unit: user.unit,
          avatar_id: user.avatarId || 'frog_eng',
          status: user.status || 'active',
          x: Math.round(user.x || 880),
          y: Math.round(user.y || 525),
          dir: user.dir || 'down',
          action_state: user.actionState || null,
          held_item: user.heldItem || '🟢',
          equipped_slots: user.equippedSlots || [],
          last_heartbeat: new Date().toISOString(),
        }));

        // 啟動心跳定期同步 (每 8 秒)
        this.startHeartbeat();

        // 載入當前所有線上人員名單
        this.fetchOnlineUsers();
      } catch (err) {
        console.warn('[SupabaseSync] 註冊線上使用者失敗:', err);
      } finally {
        this.startHeartbeat();
      }
    }

    // 心跳定時更新
    startHeartbeat() {
      if (this.logoutPromise || document.hidden) return;
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(() => this.queueHeartbeat(), 8000);
    }

    async heartbeat() {
      if (!this.client || !this.currentUser || this.logoutPromise || document.hidden) return;
      const user = this.currentUser;
      try {
        // A suspended browser may return after its online row was removed.
        // Upsert restores the same session; it does not emit another login audit.
        await this.checked(this.client.from('gather_online_users').upsert({
          client_id: user.id,
          user_name: user.name,
          unit: user.unit,
          avatar_id: user.avatarId || 'frog_eng',
          x: Math.round(user.x ?? 880),
          y: Math.round(user.y ?? 525),
          dir: user.dir || 'down',
          action_state: user.actionState || null,
          status: user.status || 'active',
          held_item: user.heldItem || '🟢',
          equipped_slots: user.equippedSlots || [],
          last_heartbeat: new Date().toISOString(),
        }), true);
      } catch (error) {
        console.warn('[SupabaseSync] 同步等待重試:', error);
      }
    }

    syncDurability(equippedSlots) {
      if (!this.currentUser || this.logoutPromise) return Promise.resolve();
      this.currentUser.equippedSlots = equippedSlots || [];
      return this.queueHeartbeat();
    }

    // 獲取線上人員名單
    async fetchOnlineUsers() {
      if (!this.client) return [];
      try {
        const cutoff = new Date(Date.now() - 35000).toISOString();
        const { data, error } = await this.checked(this.client
          .from('gather_online_users')
          .select('*')
          .gt('last_heartbeat', cutoff));
        if (error) throw error;
        if (this.callbacks.onOnlineUsersFetched && data) {
          this.callbacks.onOnlineUsersFetched(data);
        }
        return data || [];
      } catch (e) {
        console.warn('[SupabaseSync] 查詢線上人員失敗:', e);
        return [];
      }
    }

    // 使用者登出 / 離線
    logoutUser() {
      if (this.logoutPromise) return this.logoutPromise;
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      if (this.visibilityHandler) {
        document.removeEventListener('visibilitychange', this.visibilityHandler);
        window.removeEventListener('online', this.visibilityHandler);
        this.visibilityHandler = null;
      }
      this.logoutPromise = this.pending.then(() => this.logoutUserNow());
      return this.logoutPromise;
    }

    async logoutUserNow() {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
      if (!this.client || !this.currentUser) return;

      const user = this.currentUser;
      this.currentUser = null;

      try {
        // 從線上人員刪除
        await this.checked(this.client.from('gather_online_users').delete().eq('client_id', user.id));
        // 寫入登出稽核
        await this.checked(this.client.from('gather_audit_logs').insert({
          client_id: user.id,
          user_name: user.name,
          unit: user.unit,
          event_type: 'logout',
          meta: { reason: 'user_exit' },
        }));
      } catch (e) {
        console.warn('[SupabaseSync] 登出寫入失敗:', e);
      } finally {
        if (this.channel) {
          try { await this.client.removeChannel(this.channel); } catch (_) {}
          this.channel = null;
        }
      }
    }

    // 訂閱 Realtime 表變更
    subscribeRealtime() {
      if (!this.client) return;
      try {
        this.channel = this.client
          .channel('pp00_gather_db_changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'gather_online_users' },
            (payload) => {
              if (this.callbacks.onUserTableChange) {
                this.callbacks.onUserTableChange(payload);
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'gather_audit_logs' },
            (payload) => {
              if (this.callbacks.onAuditLogInsert) {
                this.callbacks.onAuditLogInsert(payload.new);
              }
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('[SupabaseSync] Realtime 訂閱失敗:', e);
      }
    }
  }

  window.GatherSupabaseSync = GatherSupabaseSync;
  window.gatherSupabase = new GatherSupabaseSync();
})(typeof window !== 'undefined' ? window : globalThis);
