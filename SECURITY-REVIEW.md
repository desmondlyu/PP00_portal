# Web App 資安風險評估

> 審查日期：2026-08-31
> 審查範圍：`C:\D_BACKUP\AI_Project\web_app` 及其子專案
> 審查方式：本機原始碼唯讀審查，未連線 GitHub、Render、Supabase 或其他外部服務
> 敏感資訊處理：所有 Token、Key、專案 URL 與內部端點均已遮罩

## 結論

目前未發現可直接判定為 **CRITICAL** 的問題，但有 **5 項 HIGH** 與 **5 項 MEDIUM** 風險。

最高風險攻擊鏈：

1. 公開 JavaScript 內嵌真實 WEC Token，搭配允許任意 Origin 的 localhost proxy，可讓惡意網站借用使用者的內網位置讀取內部報表。
2. JB Booking 的 Supabase RLS 對匿名角色開放全表 CRUD，攻擊者不需操作 GitHub Pages UI，即可直接查詢、建立、竄改或刪除預約。
3. JB Booking 可透過匿名寫入植入持久化 XSS，並利用 Portal 的同源、未 sandbox iframe 擴大到 Portal session。

GitHub Pages、React 狀態、localStorage、隱藏按鈕、offline/pending 標記與 CORS 都不是可靠的認證或授權邊界。所有敏感操作必須由 Render、Supabase RLS 或其他後端控制點重新驗證。

## 風險摘要

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | `Yield_Summary\proxy.py`、`Yield_Summary\js\cp_tool.js`、`ft_tool.js` 及 Portal 複本 | `proxy.py:32-39,61-63,81`; `cp_tool.js:20-25,69-70,199`; `ft_tool.js:2-7,65` | 真實 WEC Token 硬編碼於公開 JS；本機代理允許任意 Origin，惡意網站可借使用者內網位置讀取內部報表 | 10/10 |
| 2 | 🟠 HIGH | `JB_booking\supabase\schema.sql`、`JB_booking\static\js\app.js` 及 Portal 複本 | `schema.sql:19,24-29`; `app.js:155-165,319,414-446` | Supabase RLS 對 `anon` 使用 `using(true)`／`with check(true)`，可直接讀取、建立、竄改、刪除所有預約 | 10/10 |
| 3 | 🟠 HIGH | `JB_booking\static\js\app.js`、`PP00_Portal\src\App.jsx` | `app.js:319,339,420,1060-1062`; `App.jsx:888-893` | 可持久化 DOM XSS：匿名寫入的姓名／單位直接進入 `innerHTML`，同源未 sandbox iframe 可擴大到 Portal session | 9/10 |
| 4 | 🟠 HIGH | `TTO_Agent\rawdata_analysis\index.html`、Portal 複本及 `.bak` | `index.html:7-9,334-336`; Portal `:7-9,373-374` | Rawdata 工具執行無 SRI、可變版本的第三方 CDN 腳本；供應鏈遭串改時可竊取上傳資料與分析結果 | 9/10 |
| 5 | 🟠 HIGH | `.gemini\settings.json` | `36-43` | `npx @playwright/mcp@latest` 每次執行可變套件且開放全部工具；套件污染可導致本機任意程式碼執行 | 10/10 |
| 6 | 🟡 MEDIUM | `AutoDongle\backend_main.py`、`autolog_dongles\auto_summary.py` 及 Portal 複本 | `backend_main.py:23,54-60`; `auto_summary.py:89-91` | 公開 Render 並行請求使用秒級可預測共用暫存檔名，可能讓不同使用者收到彼此 Excel | 8/10 |
| 7 | 🟡 MEDIUM | `Yield_Summary\js\ft_tool.js` 及 Portal 複本 | `158,291-292,327,373`; Portal `167,304-305,386,432` | 匯入 Excel／JSON 的 `ITEM_NAME` 未跳脫即寫入 `innerHTML`，可形成檔案型 DOM XSS | 9/10 |
| 8 | 🟡 MEDIUM | `PP00_Portal\src\App.jsx`、`index.html` | `App.jsx:257-433,487-508,620,685,888-893`; `index.html:165-166` | offline／pending 僅為前端狀態；直接瀏覽固定工具路徑即可繞過停用規則 | 10/10 |
| 9 | 🟡 MEDIUM | `PP00_Portal\tool\Eng_AutoReport\render.yaml`、`requirements.txt` | `render.yaml:6,8`; `requirements.txt:9` | Render 自動部署搭配無上限 `flask-cors>=4.0.0`，重建時存在依賴供應鏈漂移風險 | 9/10 |
| 10 | 🟡 MEDIUM | `.agents\mcp_config.json`、`.gemini\settings.json` | `mcp_config.json:7`; `settings.json:50` | 工作區殘留非 placeholder 的 Context7 API Key；若資料夾被同步、備份或上傳可遭濫用 | 10/10 |

## 已確認風險

### F-01：公開 WEC Token 與任意 Origin localhost proxy

**嚴重度：HIGH｜信心：10/10**

受影響位置：

- `Yield_Summary\proxy.py:32-39,61-63,81`
- `PP00_Portal\tool\Yield_Summary\proxy.py:37-44,75-77,95`
- `Yield_Summary\js\cp_tool.js:20-25,69-70,199`
- `Yield_Summary\js\ft_tool.js:2-7,65`
- `PP00_Portal\tool\Yield_Summary\js\cp_tool.js:20-25,74-75,209`
- `PP00_Portal\tool\Yield_Summary\js\ft_tool.js:2-7,73`

**問題**

- 靜態 JavaScript 內嵌兩組非 placeholder 的固定 WEC Token。
- Token 被放入 `wecToken` HTTP header，屬實際認證憑證，不是可公開的識別碼。
- localhost proxy 接受呼叫端提供的 Token，允許所有網頁 Origin，且未限制精確 API 路徑。
- 非 HTTPS／file 模式會將 Token 傳往內部 HTTP 端點。

**攻擊路徑**

1. 攻擊者下載公開 JavaScript 並取得 Token。
2. 若攻擊者可連線內部報表服務，可直接重放 API request。
3. 若使用者已啟動 `localhost:8780` proxy，攻擊者可誘使使用者開啟惡意網站。
4. 惡意網站利用萬用 CORS，借用使用者的內網位置查詢並讀取內部報表。

**影響**

- CP／FT、Lot、Yield 等內部生產資料可能被未授權查詢。
- Token 可脫離前端限制，自行變更 widget、Lot、日期、站點與查詢欄位。

**建議**

- 立即撤銷並輪替所有已公開 WEC Token。
- Token 僅存放於受控後端，瀏覽器改呼叫具使用者認證的 BFF。
- proxy 僅允許精確核准的 Origin、路徑、widget 與方法。
- 每次啟動 proxy 時產生短效、一次性配對憑證。
- 內部連線改用 HTTPS，並使用短效、最小權限 Token。

### F-02：Supabase 匿名角色可對 appointments 全表 CRUD

**嚴重度：HIGH｜信心：10/10**

受影響位置：

- `JB_booking\supabase\schema.sql:19,24-29`
- `PP00_Portal\tool\JB_booking\supabase\schema.sql:19,24-29`
- `JB_booking\static\js\app.js:155-165,319,414-446`
- `PP00_Portal\tool\JB_booking\static\js\app.js:155-165,319,414-446`

**問題**

- `appointments` 的 RLS policy 對 `anon` 使用 `using (true)` 與 `with check (true)`。
- 瀏覽器產生的 `client_id` 可任意修改，不可作為身分證明。
- 全量查詢會把其他預約的 `client_id` 回傳給匿名使用者。
- 時段衝突、擁有權與編輯限制只存在前端，可被直接 REST request 略過。

**攻擊路徑**

1. 從公開前端取得 Supabase URL 與 anon JWT。
2. 直接呼叫 PostgREST，讀取全部預約及 `client_id`。
3. 使用公開 anon 身分新增偽造預約。
4. 使用讀到的 `client_id` 刪除或重建他人預約。

**影響**

- 姓名、單位、機台、日期、時段等預約資訊外洩。
- 任意建立、竄改或刪除跨使用者預約。
- 可繞過前端時段衝突規則，破壞借機排程。

**建議**

- 撤銷 `anon` 的 INSERT、UPDATE、DELETE 權限。
- 導入 Supabase Auth，使用資料庫設定且不可由 client 指定的 `owner_id default auth.uid()`。
- INSERT policy 使用 `with check (owner_id = auth.uid())`。
- UPDATE／DELETE policy 使用 `using (owner_id = auth.uid())`。
- 若需公開查詢，改提供移除姓名、單位與 `client_id` 的唯讀 view。
- 以資料庫 constraint 或 transaction 強制時段唯一性。

### F-03：JB Booking 可持久化 DOM XSS

**嚴重度：HIGH｜信心：9/10**

受影響位置：

- `JB_booking\static\js\app.js:319,339,420,1060-1062`
- `PP00_Portal\tool\JB_booking\static\js\app.js:319,339,420,1060-1062`
- `PP00_Portal\src\App.jsx:888-893`

**問題**

- Supabase 回傳的 `user_name`、`unit` 被直接插入 `innerHTML`。
- 匿名使用者目前可直接新增任意預約內容。
- Portal 以未 sandbox 的同源 iframe 載入子工具。

**攻擊路徑**

1. 攻擊者直接 POST 惡意 HTML 至 `appointments`。
2. 受害者開啟相同機台與日期的預約視窗。
3. 惡意內容經 `innerHTML` 執行。
4. 同源 iframe 使腳本有機會存取 Portal localStorage、Supabase session 與其他同源資源。

**影響**

- 竄改預約介面、發送未授權 Supabase request。
- 若 Portal 管理員已登入，可能擴大為 session 竊取或管理操作。

**建議**

- 使用 `textContent` 與 DOM API 顯示資料，禁止把資料值拼入 HTML。
- 在資料庫加上欄位長度與格式限制。
- 子工具改用隔離 origin，或使用不含 `allow-same-origin` 的嚴格 iframe sandbox。

### F-04：Rawdata 工具使用可變 CDN 腳本且沒有 SRI

**嚴重度：HIGH｜信心：9/10**

受影響位置：

- `TTO_Agent\rawdata_analysis\index.html:7-9,334-336`
- `TTO_Agent\rawdata_analysis\index.html.bak:7-9,334-336`
- `PP00_Portal\tool\TTO_Agent\rawdata_analysis\index.html:7-9,373-374`

**問題**

- Tailwind CDN 未鎖版本。
- React 使用可變動的 major 標籤。
- Marked 未指定固定版本。
- 所有第三方執行碼都沒有 SRI，頁面亦未見 CSP。

**攻擊路徑**

CDN、套件發布帳號、DNS 或 mutable tag 遭污染後，瀏覽器會以網站 origin 執行遭替換的腳本。腳本可攔截使用者選取的 TGZ／Excel／Rawdata、分析結果與同源儲存資料。

**影響**

- 晶圓測試 Rawdata、產品與站點分析結果外洩。
- 頁面計算結果或下載產物可被竄改。

**建議**

- 將所有執行碼納入本地 build 並自行託管。
- Tailwind 改為編譯後 CSS。
- 依賴鎖定精確版本。
- 若必須使用 CDN，加入正確的 `integrity`、`crossorigin` 與嚴格 CSP。

### F-05：MCP 使用 `@latest` 執行未鎖定套件

**嚴重度：HIGH｜信心：10/10**

受影響位置：

- `.gemini\settings.json:36-43`

**問題**

- MCP 啟動設定直接執行 `npx @playwright/mcp@latest`。
- 套件版本未經 lockfile 或完整性驗證。
- 工具清單開放全部工具。

**攻擊路徑**

若 npm 套件、發布帳號或 `latest` dist-tag 遭污染，下一次啟動 MCP 時會以目前 Windows 使用者權限下載並執行惡意程式。

**影響**

- 本機任意程式碼執行。
- 工作區程式、環境變數、API Key 與內部資料可能外洩。

**建議**

- 安裝並鎖定精確版本，納入專用 lockfile。
- 使用 `npm ci` 後直接呼叫本地 binary，或使用 `npx --no-install`。
- MCP 工具清單改為最小必要集合。

### F-06：AutoDongle 共用可預測暫存檔造成跨請求資料混淆

**嚴重度：MEDIUM｜信心：8/10**

受影響位置：

- `AutoDongle\backend_main.py:23,54-60`
- `AutoDongle\autolog_dongles\auto_summary.py:89-91`
- `PP00_Portal\tool\AutoDongle\backend_main.py:23,54-60`
- `PP00_Portal\tool\AutoDongle\autolog_dongles\auto_summary.py:89-91`

**問題**

每個請求雖先在獨立目錄產生 Excel，但回傳前會複製到全域暫存目錄，檔名只精確到秒。同秒完成的不同請求可指向相同路徑，而 `FileResponse` 僅保留路徑，檔案可能在傳輸期間被另一請求覆寫。

**影響**

- 不同使用者可能收到彼此的裝置 UID、測試紀錄或分析結果。
- 受害者可能收到攻擊者控制的 Excel。

**建議**

- 每個請求使用 UUID 或安全隨機檔名。
- 保留獨立工作目錄到回應結束，再以 response background cleanup 清理。
- 避免複製到共用可預測路徑。

### F-07：Yield Summary 匯入資料可觸發 DOM XSS

**嚴重度：MEDIUM｜信心：9/10**

受影響位置：

- `Yield_Summary\js\ft_tool.js:158,291-292,327,373`
- `PP00_Portal\tool\Yield_Summary\js\ft_tool.js:167,304-305,386,432`

**問題**

MSS Excel 測試名稱或手動 JSON 的 `ITEM_NAME` 未經 escaping，直接寫入 `tdFailures.innerHTML`。

**攻擊路徑**

使用者匯入攻擊者製作的 MSS Excel、貼入惡意 JSON，或上游資料包含惡意 `ITEM_NAME` 時，統計表渲染會執行其中的 HTML／事件處理程式。

**影響**

- 在 GitHub Pages origin 執行任意 JavaScript。
- 在同源 Portal iframe 架構下，可能存取 Portal session 與其他工具資料。

**建議**

- 使用 `createElement`、`textContent` 組合輸出。
- 檔案分析工具部署於隔離 origin，或使用嚴格 iframe sandbox。

### F-08：工具 offline／pending 狀態可直接繞過

**嚴重度：MEDIUM｜信心：10/10**

受影響位置：

- `PP00_Portal\src\App.jsx:257-433,487-508,620,685,888-893`
- `PP00_Portal\index.html:165-166`

**問題**

offline／pending 狀態只控制 Portal UI。實際工具仍以固定 URL 存在於 GitHub Pages 靜態目錄。

**攻擊路徑**

攻擊者可從 bundle、歷史連結或固定命名推測工具路徑，直接開啟 `tool\<tool-name>\index.html`，完全略過 React 狀態與 Supabase `tool_statuses`。

**影響**

- 已停用或未公開的工具仍可使用。
- 含敏感端點或 Token 的工具無法靠 Portal 狀態真正下架。

**建議**

- 將 offline 狀態視為顯示用途，不可作為安全控制。
- 需保護的工具不要發布至公共靜態目錄。
- 下架時從部署產物移除，或改由具認證與授權的伺服器提供。

### F-09：Render 自動部署使用無上限 Python 依賴

**嚴重度：MEDIUM｜信心：9/10**

受影響位置：

- `PP00_Portal\tool\Eng_AutoReport\render.yaml:6,8`
- `PP00_Portal\tool\Eng_AutoReport\requirements.txt:9`

**問題**

Render 使用 `pip install -r requirements.txt`，但 `flask-cors>=4.0.0` 沒有上限或雜湊；`autoDeploy: true` 會在後續建置時重新解析依賴。

**影響**

若套件或發布權限遭污染，惡意版本可在 Render 建置或服務啟動時執行，存取部署環境變數、使用者上傳文件與報告產物。

**建議**

- 所有部署依賴鎖定精確版本。
- 產生含雜湊的 requirements lock。
- 使用 `pip install --require-hashes`。
- 依賴升級改為明確、可審查的變更。

### F-10：工作區殘留 Context7 API Key

**嚴重度：MEDIUM｜信心：10/10**

受影響位置：

- `.agents\mcp_config.json:7`
- `.gemini\settings.json:50`

**問題**

兩個設定檔包含相同、非 placeholder 的 Context7 API Key。雖然檔案位於工作區本機設定區，但若整個資料夾被同步、備份、封裝或誤上傳，Key 會外洩。

**影響**

- 配額或服務權限遭未授權使用。
- 若 Key 權限超出查詢用途，影響會隨權限擴大。

**建議**

- 撤銷並重發該 Key。
- 改由環境變數或秘密儲存區注入。
- 確保 `.agents`、`.gemini` 不進入版本控制或部署產物。

## GitHub Pages UI 繞過與後端直連判定

| 系統 | 判定 | 主要證據 | 風險 |
|---|---|---|---|
| JB Booking／Supabase | **已證實可直接未授權 CRUD** | 前端直接呼叫 PostgREST；公開 anon JWT；RLS 全開 | 可讀取、建立、竄改、刪除全部預約 |
| Yield Summary／內部報表 | **可直接重放** | WEC Token 存在公開 JS；proxy 允許任意 Origin | 可繞過 UI 查詢內部報表 |
| AutoDongle／Render | **HTTP request 可直接重放** | 前端 POST 未帶 Authorization | 線上是否有額外 Access Gateway 需驗證 |
| Eng AutoReport／Render | **原始碼路由未見認證與 owner 綁定** | generate、status、logs、download 路由未見應用層授權 | 若 Render 服務公開，任何人可略過 UI 呼叫 |
| Portal `tool_statuses`／Supabase | **前端管理判斷不足** | 任一有效 session 都會嘗試 upsert | 是否真正越權取決於線上 RLS |

> CORS 只限制部分瀏覽器跨來源行為，不會阻止命令列、伺服器端程式、同源 XSS 或被修改的前端直接送出 request。

## 殘留憑證與敏感端點

| 類型 | 狀態 | 位置 | 評估 |
|---|---|---|---|
| WEC Token | 非 placeholder，已遮罩 | Yield Summary CP／FT JavaScript 及複本 | 應視為已外洩並立即輪替 |
| Context7 API Key | 非 placeholder，已遮罩 | `.agents\mcp_config.json`、`.gemini\settings.json` | 建議輪替並移出檔案 |
| JB Supabase JWT | `role=anon`，已遮罩 | JB Booking 前端設定 | Key 可公開，但 RLS 全開使其具高風險權限 |
| Portal Supabase JWT | `role=anon`，已遮罩 | `.env.local` 與 compiled `index.html` | 安全性完全依賴資料庫 RLS |
| Render API 端點 | 已遮罩 | AutoDongle、Eng AutoReport 前端 | 可從前端取得並直接重放 request |
| 內部報表端點 | HTTP，已遮罩 | Yield Summary 前端 | Token 與查詢格式一併公開 |
| localhost proxy | `localhost:8780` | Yield Summary | 可成為惡意網站跨入內網的橋接器 |

本次未發現：

- Supabase `service_role` Key
- GitHub Personal Access Token
- 私鑰
- AWS Access Key
- 硬編碼管理員登入密碼

## 需部署端人工驗證

以下項目無法只靠本機原始碼確認，不列為已證實漏洞：

1. **GitHub Pages**
   - 實際 Pages source branch／folder。
   - `main`／`gh-pages` 分支保護、必要審核與 force-push 限制。
   - Pages environment 保護、HTTPS 強制與自訂網域 DNS 驗證。
   - 實際 Repo 是否存在未同步至本機的 Actions workflow。
2. **GitHub Actions**
   - 預設 `GITHUB_TOKEN` 是否為 read-only。
   - fork PR 是否需要人工核准。
   - 第三方 Action 是否以完整 commit SHA 固定。
   - 是否使用高風險 `pull_request_target` 或可注入 shell 的 PR 資料。
3. **Render**
   - AutoDongle 與 Eng AutoReport 前方是否有 Access Gateway。
   - CORS、rate limit、檔案大小限制、request timeout。
   - run／status／logs／download 是否綁定使用者與 owner。
   - Deploy Hook、PR Preview 與環境變數是否受到保護。
4. **Supabase**
   - `tool_statuses` 是否只允許明確管理員 UID 或可信任的 `app_metadata` 修改。
   - Storage bucket、Realtime、RPC、Edge Function 與其他資料表的 RLS。
   - 是否存在 `SECURITY DEFINER`、過寬 GRANT 或 public schema 權限。
5. **安全回應標頭**
   - CSP、HSTS、`frame-ancestors`、Referrer-Policy、Permissions-Policy。
6. **部署內容**
   - `.worktrees`、`.env.local`、`.bak`、開發版與本機設定是否被部署或打包。
   - 是否發布 source map。

## 建議處理順序

### P0：立即降低曝險

1. 輪替 WEC Token 與 Context7 API Key。
2. 停止 JB Booking 匿名寫入，重建 `appointments` RLS。
3. 若無法立即修正，暫時從公開部署移除 JB Booking 與 Yield Summary。

### P1：封閉主要攻擊鏈

1. 修正 JB Booking 與 Yield Summary 的所有 `innerHTML` 資料注入。
2. WEC Token 移至受控後端，proxy 加入 Origin、路徑與短效配對憑證限制。
3. Render API 加入使用者認證、owner 綁定、rate limit 與輸入限制。
4. 管理員授權移至 Supabase RLS 或可信任後端。

### P2：降低供應鏈與隔離風險

1. CDN 依賴改為本地自託管並鎖定版本。
2. iframe 改為隔離 origin 或嚴格 sandbox。
3. AutoDongle 改用每請求唯一暫存檔。
4. MCP 與 Python 依賴鎖定精確版本及雜湊。
5. 驗證 Pages／Actions／Render／Supabase 的平台端安全設定。

## 限制

- 本次沒有對線上服務發送 request，因此未驗證實際部署是否有額外 WAF、Access Gateway、平台端 RLS 或安全標頭。
- 行號依 2026-08-31 本機工作區內容記錄；後續修改可能使行號位移。
- 報告僅記錄已確認或高信心風險，不包含純風格問題與無法形成攻擊路徑的最佳實務建議。
