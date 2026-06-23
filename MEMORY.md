<!-- ================================================================
  🤖 AI SESSION CONTEXT — 給下一個 AI Session 看的專案記憶
  最後更新：2026-06-22，Session 44f35ff7
  ================================================================ -->

## 🤖 AI 快速喚醒區（給 Copilot / AI 看）
> 下次回到此專案，請先讀本節，再閱讀其他說明文件，即可還原完整開發背景。

### 專案定位
本專案（PP00 Tool Portal）是半導體記憶體研發與量化科技的工具入口網站，以優雅的 Bento 網格風格呈現，用以集中調用與展示十大核心工具（TTO 分析、JB Lab 借機系統、FT 特性分析、CP DL 分析、CP Datalog-to-Excel 轉換器、CP/FT Yield Auto Summary、CP MSS 轉換工具、Dongle Auto Summary、WRITER按鍵錄製精靈，以及 PP00 Knownledge Agent 內部知識型 Agent）。

**自包含目錄結構**：所有子工具已收納至 `PP00_Portal/tool/` 下，Portal 與子工具形成單一自包含目錄，方便整包複製、搬移或部署。`tool/` 下主要保留部署用檔案（HTML、CSS、JS、assets），但 `tool/AutoDongle` 作為例外，已收納包含 Python 後端與 `dev` 前端原始碼在內的完整自包含開發架構，不含 `node_modules`、`.git` 歷史。

**子工具路徑對應**：
| 工具 | `localPath` / `ghPagesUrl` | `devUrl` |
| :--- | :--- | :--- |
| TTO 分析 | `./tool/TTO_Agent/rawdata_analysis/index.html` | `http://localhost:3002` |
| JB 借機 | `./tool/JB_booking/index.html` | `http://localhost:3003` |
| DL-to-Excel | `./tool/DL_to_Excel/index.html` | `http://localhost:3005` |
| FT 特性 | `./tool/CZ_dataset/index.html` | `http://localhost:3000` |
| CP DL 分析 | `./tool/CP_DL_Analysis/index.html` | `http://localhost:5173` |
| CP/FT Yield | `./tool/Yield_Summary/index.html` | `http://localhost:3006` |
| CP MSS 轉換 | `./tool/CP_MSS/index.html` | `http://localhost:5174` |
| Dongle Auto Summary | `./tool/AutoDongle/index.html` | `http://localhost:5173` |
| WRITER按鍵錄製精靈 | `#` (待開發) | `#` |
| PP00 Knownledge Agent | `https://m365.cloud.microsoft/chat/?titleId=T_6f1ea993-be1e-5380-6352-a5300c2839e6&source=copilot-studio&redirfrom=CsrToSSR&auth=2` | `https://m365.cloud.microsoft/chat/?titleId=T_6f1ea993-be1e-5380-6352-a5300c2839e6&source=copilot-studio&redirfrom=CsrToSSR&auth=2` |

### 關鍵函式與邏輯
- `src/App.jsx` 中的 `tools` 陣列：存儲工具卡片配置。特點列表的 `fontSize` 放大為 `0.95rem`。
- `src/index.css` 核心樣式：將 `--text-secondary` 改為 `#ffffff` (白色)，`--text-muted` 改為 `#d1d5db` (淺灰)，並調大 `body` 基底字體 (18px) 及各區塊級距 (.hero-desc, .tool-desc, .changelog-text)。
- `sha256()` 函數：管理員登入用 SHA-256 雜湊，含 `crypto.subtle`（Secure Context）與純 JS fallback（`file://` 環境）雙模式。
- `closeAdminModal()`：統一關閉管理後台 modal 並重置所有登入狀態（`isLoggedIn`、帳密欄位、錯誤訊息）。
- `getToolUrl()`：自適應 URL 解析器，依 `localhost` / `http` / `file://` 三環境自動選擇 `devUrl` / `ghPagesUrl` / `localPath`。
- `Yield_Summary` API 自適應：在 `cp_tool.js` 和 `ft_tool.js` 中動態判斷 `window.location.protocol === 'https:'`，若是則改走本地 CORS 代理 `http://localhost:8780`，避免 Mixed Content 限制。

### 重要技術決策
| 決策 | 實作內容 | 影響與目的 |
| :--- | :--- | :--- |
| **新增外部 URL 卡片** | 新增 `PP00 Knownledge Agent`，設定 `openExternal: true` 以新分頁打開 | 解決 M365 網域之 X-Frame-Options 限制拒絕 iframe 內嵌問題，提供測試、產品與製程知識檢索。 |
| **待開發卡片預設離線** | 新增 `cp-mss-converter`、`dongle-summary`、`writer`，並在 `offlineTools` state 初始化時將這三個 ID 預設設為 `true` | 保證未開發的卡片在管理員尚未在後台手動開啟前，預設皆為離線狀態 (Offline)，避免使用者誤觸點擊且不指向 any 連結，落實 Fail-safe 設計。 |
| **Logo 404 修正** | 在 `.gitignore` 中註解 `/logo.png`，允許將根目錄打包出的 `logo.png` 推送上遠端 | 修正 GitHub Pages 部署時，根目錄下缺失 `logo.png` 導致左上角標誌無法正常顯示的問題。 |
| **HTTPS 環境 CORS 解決** | 判斷網協是否為 HTTPS，自動切換至 `localhost:8780` 的本地代理 (需執行 `proxy.bat`) | 繞過瀏覽器在 `https://` 下對 `http://report` 內網 API 的混合內容與跨域安全封鎖。 |
| **Iframe 全螢幕內嵌** | 在 `src/App.jsx` 底部動態渲染 `portal-iframe-overlay` | 點擊啟動時，網址維持在 `https://desmondlyu.github.io/PP00_portal/`，不跳轉且不改變瀏覽器 URL。 |
| **文字調亮與放大** | 將 `--text-secondary` 改成白色 (`#ffffff`)，並調亮 `--text-muted`；調大 body、卡片描述與列表等字體級距 | 解決原先灰色文字過暗、傷眼的問題，顯著提升入口網站的可讀性與視覺體驗。 |

### 固定設定值
- `z-index: 2000`：`.portal-iframe-overlay` 的層級，確保完全覆蓋 Bento 卡片。
- `allow="clipboard-write; serial"`：`<iframe>` 標籤的權限設定，保證子工具複製功能與 Web Serial 存取正常。
- 子工具 devUrl：TTO=`:3002`、JB=`:3003`、DL-to-Excel=`:3005`、CZ=`:3000`、CP_DL=`:5173`、Yield_Summary=`:3006`、CP_MSS=`:5174`、AutoDongle=`:5173`。

### 已安裝的 Skills 清單
- `brainstorming`
- `writing-plans`
- `executing-plans`
- `systematic-debugging`
- `requesting-code-review`

### 常見錯誤與解法
- **問題**：GitHub Pages 上的 HTTPS 頁面無法連線至內網 HTTP API，報 CORS 或 Mixed Content 錯誤。
  * **解法**：本地點擊 `proxy.bat` 啟動本地代理（Python 輕量中轉，Port 8780），工具會自動切換為向 `http://localhost:8780` 發送請求。
- **問題**：`logo.png` 在 GitHub Pages 顯示為 404。
  * **解法**：在 `.gitignore` 取消對根目錄 `logo.png` 的忽略，確保打包複製 wecToken 檔案有成功推送到 GitHub 根目錄。
- **問題**：`crypto.subtle` 在 `file://` 環境下為 `undefined`，導致管理員登入 crash。
  * **解法**：`sha256()` 函數內建純 JS fallback，自動偵測 `crypto.subtle` 可用性。

### 尚未完成的功能
- [ ] 串接子工具與 Portal 的 `postMessage` 雙向通訊機制（若未來需要共享登入狀態）。
- [ ] 管理員驗證改為 server-side（目前為前端 hash比對，可被 localStorage 直接繞過，僅為 soft toggle）。
- [ ] `logo.png` 壓縮（目前 5.5MB，建議壓至 100KB 以下）。
