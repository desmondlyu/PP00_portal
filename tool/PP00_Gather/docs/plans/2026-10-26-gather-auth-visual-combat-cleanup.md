# PP00_Gather 認證、視覺、戰鬥與資料庫重置實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 徹底移除房間分流概念並採用 6 位數個人密碼雲端存檔；移除人物名稱與 Murmur 卡片外框；實現本機零延遲擊退與倒地淡出；新增手機版「擊退 [F]」按鈕；裝備槽空缺時自動替補武器庫存；清空 Supabase 紀錄重回乾淨大廳。

**Architecture:** 
1. 認證層：廢除房間分流，統一世界頻道。登入表單直接使用「使用者名稱 + 6 碼個人密碼 + 部門」，首次登入自動註冊建檔，後續登入驗證 PBKDF2 hash。
2. 視覺層：在 `drawPlayerNameplateAndBubbles` 中，常態取消深色卡片框與描邊，改用高對比文字陰影；僅在選取/互動時渲染對話卡片外框。
3. 戰鬥層：出招時客戶端立即執行物理擊退與倒地判定，移除 `finally` 中過早清除動畫的邏輯；當武器槽空缺時自動調度背包庫存替補。
4. 資料庫：執行 SQL 重置 `gather_online_users`、`gather_audit_logs`、`season2_store` 與 `season2_receipts`。

**Tech Stack:** JavaScript (ESM + IIFE), Canvas 2D API, Supabase Edge Functions (Deno / Node), CSS3 Mobile Viewport, Node.js Test Runner.

---

### Task 1: 後端 6 碼密碼、自動註冊與武器自動替補邏輯

**Files:**
- Modify: `tool/PP00_Gather/server/service.mjs:10-25`
- Modify: `supabase/functions/gather-season2/service.mjs:10-25`
- Modify: `tool/PP00_Gather/server/engine.mjs:170-176`
- Modify: `supabase/functions/gather-season2/engine.mjs:170-176`
- Test: `tool/PP00_Gather/tests/season2-server.test.cjs`

- [ ] **Step 1: 更新測試案例驗證 6 碼 PIN 與自動註冊**
在 `tests/season2-server.test.cjs` 中加入對 6 碼 PIN 登入及首登自動建檔的測試。

- [ ] **Step 2: 執行測試確認未修改前報錯**
Run: `node tests/season2-server.test.cjs`

- [ ] **Step 3: 修改 service.mjs 支援 6 碼密碼與自動註冊**
在 `server/service.mjs` 與 `supabase/functions/gather-season2/service.mjs`：
1. 驗證改為 `/^\d{6}$/.test(b.pin||'')`。
2. 移除 `kind==='register'` 強制檢查；若使用者不存在，自動執行註冊邏輯建立新玩家存檔。
3. 移除多房間邏輯，玩家一律歸屬預設世界。

- [ ] **Step 4: 修改 engine.mjs 支援耐久歸零時自動替補武器**
在 `combat()` 中，當武器耐久度歸零被移除後，檢查玩家是否還有其他裝備中的武器；若無，自動從 `p.items` 中找出第一件非裝扮武器並設定 `slot: 0`。

- [ ] **Step 5: 執行測試確認全部通過**
Run: `node tests/season2-server.test.cjs`

- [ ] **Step 6: Commit**
`git add server/ supabase/ tests/ && git commit -m "feat(server): support 6-digit pin, seamless auth and auto weapon refill"`

---

### Task 2: 前端登入介面與單一大廳實作 (CASE1.PNG)

**Files:**
- Modify: `tool/PP00_Gather/index.html:61-96`
- Modify: `tool/PP00_Gather/static/js/app.js:275-288, 1440-1460, 1670-1740`
- Modify: `tool/PP00_Gather/static/js/network.js:520-530`

- [ ] **Step 1: 修改 index.html 登入表單**
1. 將原本通行碼欄位改為：
```html
<div class="form-field">
  <label for="loginPasscode">使用者個人密碼（六碼） *</label>
  <input
    type="password"
    id="loginPasscode"
    inputmode="numeric"
    pattern="[0-9]{6}"
    maxlength="6"
    placeholder="請輸入 6 位數個人密碼"
    required
  />
</div>
```
2. 徹底移除 `<div class="s2-login-fields">...</div>`（紅框區塊）。

- [ ] **Step 2: 更新 app.js 登入呼叫與房間處理**
1. 在 `seasonLogin(params)` 中，PIN 讀取自 `document.getElementById('loginPasscode').value.trim()`。
2. 移除 `loginRegister` 與 `loginPin` 參考。
3. `network.connect` 統一連接單一頻道，不再傳入自定義 roomCode。

- [ ] **Step 3: 驗證登入與自動重載機制**
確保 localStorage 快取只儲存帳號、部門、造型，自動重載時以 token resume。

- [ ] **Step 4: Commit**
`git add index.html static/js/app.js static/js/network.js && git commit -m "feat(auth): transition room code to 6-digit personal password and remove legacy pin fields"`

---

### Task 3: 人物名稱與 NPC Murmur 邊框去除 (CASE2.PNG)

**Files:**
- Modify: `tool/PP00_Gather/static/js/app.js:5690-5825`

- [ ] **Step 1: 改造 drawPlayerNameplateAndBubbles**
1. 判斷是否為「互動中對象」(`isTarget = (p.id === activeTargetId || p.id === proxTargetId)`)。
2. 當非互動狀態時：
   - 不調用 `ctx.roundRect` 繪製深色底色與描邊。
   - 使用輕量半透明漸層或無邊框浮動文字搭配 `ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 4;`。
   - 保留狀態圓點與等級/名稱字樣。
3. 當為互動狀態時：保留清晰高亮卡片邊框，凸顯對話焦點。
4. Murmur 氣泡：
   - 常態下移除深色背景方塊、描邊邊線與底端箭頭。
   - 以高可讀性的浮動字體＋陰影呈現，文字漸進顯示與倒數進度條簡潔化。

- [ ] **Step 2: 驗證 Canvas 渲染與測試**
Run: `node tests/sync_and_mobile.test.cjs`

- [ ] **Step 3: Commit**
`git add static/js/app.js && git commit -m "style(visual): remove card borders from names and murmur bubbles, preserving frames for active interaction"`

---

### Task 4: 客戶端怪物擊退位移與倒地消失即時反饋

**Files:**
- Modify: `tool/PP00_Gather/static/js/app.js:2835-2855, 260-270`
- Modify: `tool/PP00_Gather/static/js/combat.js:155-171`

- [ ] **Step 1: 修復攻擊預覽被提早掐斷的問題**
在 `triggerWeaponAttack()` 中：
1. 攻擊瞬間由本機直接向目標注入打擊反饋 (`e.combatReaction = { ... }`) 與物理擊退位移 (`e.x += dx, e.y += dy`)。
2. 移除 `finally { ... e.combatReaction = null; }`，讓 650ms 完整動畫順暢演完。
3. 若本機計算 `e.hp <= 1`，立即將其標記為 `combatDown = true` 並開始倒地淡出計時。

- [ ] **Step 2: 怪物擊倒後 650ms 自動隱藏**
在 `drawMinecraftMob` 與 `world.js` 循環中，確保在擊倒動畫結束後立即停止渲染，無需等待 2 秒一次的後端 Heartbeat 輪詢。

- [ ] **Step 3: 執行測試**
Run: `node tests/season2.test.cjs`

- [ ] **Step 4: Commit**
`git add static/js/app.js static/js/combat.js && git commit -m "fix(combat): enable client-side instant knockback displacement and immediate defeat fade-out"`

---

### Task 5: 手機版雙鍵操作（擊退 [F] ＋ 互動 [E]）

**Files:**
- Modify: `tool/PP00_Gather/index.html:384-391`
- Modify: `tool/PP00_Gather/static/css/style.css:2675-2680`
- Modify: `tool/PP00_Gather/static/js/app.js:1120-1126`

- [ ] **Step 1: 在 index.html 中加入 touchAttackBtn**
```html
<div class="touch-controls" aria-label="觸控操作">
  <div id="touchMovePad" class="touch-move-pad" ...>...</div>
  <button id="touchInteractBtn" type="button" class="touch-interact-btn">互動 E</button>
  <button id="touchAttackBtn" type="button" class="touch-attack-btn">⚔️ 擊退</button>
</div>
```

- [ ] **Step 2: 在 style.css 中調整雙鍵人體工學排版**
將「擊退」按鈕置於右下主要發動點（直徑 66px，橘紅戰鬥漸層），將「互動」按鈕置於其上方偏左（直徑 56px，青色），並加入觸控反饋。

- [ ] **Step 3: 在 app.js 中綁定事件**
將 `touchAttackBtn` 綁定 `triggerWeaponAttack()`，並處理 touchstart 避免延遲。

- [ ] **Step 4: 執行測試確認行動端樣式與互動不破壞現有功能**
Run: `node tests/sync_and_mobile.test.cjs`

- [ ] **Step 5: Commit**
`git add index.html static/css/style.css static/js/app.js && git commit -m "feat(mobile): add dedicated touch attack button with ergonomic dual-button layout"`

---

### Task 6: 隨身武器空缺自動在庫存替補

**Files:**
- Modify: `tool/PP00_Gather/static/js/app.js:2965-2985, 235-245`

- [ ] **Step 1: 實作自動替補函數 autoEquipNextAvailableWeapon()**
當 `getActiveEquippedItem()` 回傳 null 或 3 個 slot 皆空時：
從 `localPlayer.inventory` 中找出第一個 `category !== 'outfit'` 的武器，自動裝備至空槽位，並在 Season 模式下透過 `seasonSend('equip', { uid: item.uid, slot: 0 })` 同步至雲端。

- [ ] **Step 2: 整合至耐久損毀與快照更新時機點**
在武器擊碎瞬間與快照載入時自動檢查並觸發替補。

- [ ] **Step 3: 執行測試**
Run: `node tests/season2-server.test.cjs`

- [ ] **Step 4: Commit**
`git add static/js/app.js && git commit -m "feat(inventory): auto-equip available weapon from inventory when slots are vacant"`

---

### Task 7: 重置 Supabase 雲端資料庫（乾淨起點）

**Files:**
- MCP Tool: `supabase:execute_sql` (Project: `fvfekakjjzhocpprcbgi`)

- [ ] **Step 1: 執行清空 SQL**
```sql
TRUNCATE TABLE public.gather_online_users RESTART IDENTITY;
TRUNCATE TABLE public.gather_audit_logs RESTART IDENTITY;
UPDATE gather_private.season2_store
SET state = '{"players":{},"enemies":{},"drops":{},"tasks":{},"rate":{}}'::jsonb,
    revision = 0,
    updated_at = now()
WHERE id = true;
TRUNCATE TABLE gather_private.season2_receipts;
```

- [ ] **Step 2: 驗證資料表已清空**
調用 `supabase:list_tables` 確認 rows 為 0。
