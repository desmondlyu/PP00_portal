<!-- ================================================================
  🤖 AI SESSION CONTEXT — 給下一個 AI Session 看的專案記憶
  最後更新：2026-07-27，Session 0a84d186
  ================================================================ -->

## 🤖 AI 快速喚醒區（給 Copilot / AI 看）
> 下次回到此專案，請先讀本節，再閱讀其他說明文件，即可還原完整開發背景。

### 專案定位
本專案（PP00 Tool Portal）是半導體記憶體研發與量化科技的工具入口網站，以優雅的 Bento 網格風格呈現，用以集中調用與展示十二大核心工具。另外包含 `antigravity-cli-statusline` 狀態列外掛，用於為命令列介面（agy CLI）底部提供即時指標監控。

**自包含目錄結構**：所有子工具已收納至 `PP00_Portal/tool/` 下，Portal 與子工具形成單一自包含目錄，方便整包複製、搬移或部署。`tool/` 下主要保留部署用檔案（HTML、CSS、JS、assets）。
- 本次 Session 順利將原先獨立的 `web_terminal` 網頁端專案，打包整合進 `PP00_Portal/tool/web_terminal/` 目錄，作為 `WRITER 按鍵錄製精靈` 卡片的連結目標。

### ⚠️ 重要 Build 工作流程（含 React 編譯包工具）

**`PP00_Portal` 是最終佈局目錄（GitHub Pages）**，`tool/` 下的檔案為部署用。
有以下兩個工具含 React 原始碼，**修改後需重新 build 再部署**，直接改 `tool/` 底下的 compiled HTML 下次 rebuild 會被覆蓋：

| 工具 | React 原始碼位置 | build 指令 | deploy 目標 |
| :--- | :--- | :--- | :--- |
| **CP MSS 轉換** | `C:\D_BACKUP\AI_Project\CP_MSS` | `npm run build`（輸出 `docs/index.html`） | → 複製到 `PP00_Portal/tool/CP_MSS/index.html` |
| **FT 特性 (CZ_dataset)** | `C:\D_BACKUP\AI_Project\web_app\CZ_dataset\web` | `npm run build`（輸出 `dist/index.html`） | → 複製到 `PP00_Portal/tool/CZ_dataset/index.html` 及 `web_app\CZ_dataset\index.html` |
| **T5830 TTO** | `C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\T5830_TTO` | `npm run build`（輸出 `dist/`） | 原地 build，Portal iframe 載入 `./tool/T5830_TTO/dist/index.html` |

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
| WRITER按鍵錄製精靈 | `./tool/web_terminal/index.html` | `./tool/web_terminal/index.html` |
| 工程實驗報告產生器 | `./tool/Eng_AutoReport/index.html` | `./tool/Eng_AutoReport/index.html` |
| PP00 Knownledge Agent | `https://m365.cloud.microsoft/chat/?titleId=T_6f1ea993-be1e-5380-6352-a5300c2839e6&source=copilot-studio&redirfrom=CsrToSSR&auth=2` | `https://m365.cloud.microsoft/chat/?titleId=T_6f1ea993-be1e-5380-6352-a5300c2839e6&source=copilot-studio&redirfrom=CsrToSSR&auth=2` |
| T5830 TTO 分析 | `./tool/T5830_TTO/dist/index.html` | `http://localhost:5173/` |

### 關鍵函式與邏輯
- `statusline-quota.mjs` 中的 `isInGitRepository()`：高速同步預檢目錄鏈是否包含 `.git`。
- `statusline-quota.mjs` 中的 `getGitBranch()` 與 `getGitDirty()`：優化為在非 Git 倉庫中直接跳過 Git CLI 呼叫。
- `sh_hidden.cs` 中的 `ShowWindow(handle, SW_HIDE)`：啟動時立即隱藏 console 視窗，防止黑框閃爍。
- `tool/web_terminal/index.html`：將終端機視窗高度調整至 `30vh`，字體放大至 `1.2rem`，並改寫為左右對稱分割的發光視窗。
- `tool/TTO_Agent/rawdata_analysis/js/app.js` 中的 `parseImportPath()`：放寬路徑過濾條件為支援 `home/*/*` 的通用 Fail-safe 模式。
- `tool/TTO_Agent/rawdata_analysis/js/app.js` 中的 `getScenarioCount()` 與 `getScenarioMean()`：讀取使用者在模擬欄位中的輸入，並透過 `fmtInt` 將 Count 格式化為整數。
- `tool/TTO_Agent/rawdata_analysis/js/app.js` 中的 `getScenarioStationTotalTime()`：將 `delta` 計算中變動的測試次數除以 `fileCount` 進行縮放，解決多 Site 檔案匯入時因 Count 放大而將模擬總時間扣減為 0 的 bug。
- `tool/TTO_Agent/rawdata_analysis/js/app.js` 中的 `buildGroupedItemRows()`：對 Group 的 `perSiteCount` 與 `scenarioCount` 進行累加，連動更新 Group 的實測與模擬次數。
- `tool/TTO_Agent/rawdata_analysis/js/app.js` 中的 `onScenarioInputChange()`：當 field="range" 時，自動按比例換算新 Mean 並更新 UI 輸入框；當 field="count" 時，將數值經由 `Math.round()` 取整後存入覆寫配置。
- `tool/T5830_TTO/`：Vite + React + TypeScript 獨立子專案（原 `pp21_py`），解析 T5830 RAWDATA `.tar` 檔，產生 Master Summary 與 Dashboard。`vite.config.ts` base 設為 `'./'`，Portal 以 iframe 載入 `dist/index.html`。修改原始碼後需 `cd tool/T5830_TTO && npm run build` 重建 dist。

### 重要技術決策
| 決策 | 實作內容 | 影響與目的 |
| :--- | :--- | :--- |
| **TT Ratio 分子與分母一致化** | 在 `buildStats` 中將分子改為 `(count/fileCount * mean)`，解決多檔匯入時的爆表問題。 | 徹底解決 TT Ratio 隨 site 檔案數量增加而超過 100% 的計算偏誤。 |
| **Count 與 Total 模擬連動** | 表格中的 Count 欄位改為顯示「單一 Site 平均次數」，並新增「模擬 Count」input 與「模擬 Total」欄位。 | 讓使用者可以微調測試次數，並連動計算各項目及 Group 的總時間與 TT Ratio 比例。 |
| **模擬 Count 與 Total 格式化** | 引進 `fmtInt` 函數將所有 Count 的顯示對齊為純整數（無小數點），並在寫入 override 時實作 `Math.round()` 取整。 | 提供完全符合測試次數語義的整數交互，使 Count × Mean = Total 公式直覺成立。 |
| **模擬總時間 delta 比例修正** | 在 `getScenarioStationTotalTime` 中，將 `delta` 計算中的 `stat.count` 除以 `fileCount`。 | 避免在多 Site 匯入時，負數的 delta 因次數累加而被放大，導致模擬總時間被扣至 0 使圖表 bar 消失。 |
| **模擬 Range 聯動換算** | 改 Range 時自動按比例縮放並更新對應的模擬 Mean 輸入值，移除 getScenarioEffectiveMean 中的隱含因子。 | 簡化模擬邏輯，使模擬結果完全所見即所得，沒有隱藏的二重縮放。 |
| **資料夾通用匹配放寬** | 在 `parseImportPath` 中，改為只要 `home` 後方接有任意兩層子路徑即匹配成功。 | 解決使用者因路徑拼寫誤差而無法讀取資料的問題。 |
| **eng_report Supabase 狀態修正** | `defaultOffline` 中 `eng_report` 改為 `false`；`toggleToolStatus` 由 `.update().eq()` 改為 `.upsert({ id, is_offline }, { onConflict: 'id' })`。 | 移除寫死 offline，改由 Supabase `tool_statuses` 資料列決定；upsert 確保 DB 無該列時自動 insert，不再靜默失敗。 |
| **整合 T5830 TTO（pp21_py）** | 從 `pp21_py` 複製至 `tool/T5830_TTO/`，`vite.config.ts` base 改 `'./'`（相對路徑），重新 build dist。App.jsx 新增 `te_tto` 卡片（icon `💻`、status `active`），supabase `tool_statuses` 以 `id: 'te_tto'` upsert 控制。 | T5830 測試時間分析工具正式納入 Portal，iframe 載入 `./tool/T5830_TTO/dist/index.html`。 |
| **iframe header emoji icon 修正** | `React.createElement(activeTool.icon, ...)` 改為先判斷 `typeof === 'string'` 再以 `<span>` 渲染 emoji，避免 crash。 | 所有使用 emoji 字串 icon 的卡片（📟、🤖、💻）點擊後不再因 createElement 傳入字串而報錯。 |

### 固定設定值
- `z-index: 2000`：`.portal-iframe-overlay` 的層級，確保完全覆蓋 Bento卡片。
- `allow="clipboard-write; serial"`：`<iframe>` 標籤 of 權限設定，保證子工具複製功能與 Web Serial 存取正常。
- `font-weight: normal`、`color: #ffffff`：終端機字型與顏色固定值。

### 已安裝的 Skills 清單
- `brainstorming`
- `writing-plans`
- `ui-ux-pro-max`
- `systematic-debugging`

### 常見錯誤與解法
- **問題**：上傳 Excel 出現 `ECMA-376 Encrypted file missing /EncryptionInfo`（SheetJS 工具）或 `Corrupted zip or bug: unexpected signature`（ExcelJS/CP_MSS）。
  * **解法**：已在所有工具加入加密偵測 modal，提示使用者解除 IRM 保護後重新上傳。修改需注意：Yield_Summary/TTO_Agent 直接改 JS；CZ_dataset/CP_MSS 需改 React source 再 rebuild（見上方 Build 工作流程）。
- **問題**：使用者打字時終端機上出現重複的雙重字元（例如打 1 出現 11）。
  * **解法**：關閉 Local Echo（`chkLocalEcho` 設為 unchecked）。
- **問題**：退格鍵（Backspace）或刪除輸入無效。
  * **解法**：在終端機渲染中處理 `\b` 與 `\x7f` 控制字元，實作 `backspaceTerminal()` 刪除 DOM 節點。
- **問題**：按鍵 `ESC` 無法送出，且會導致燒錄機中斷。
  * **解法**：捕獲並轉換發送 `\x1b` 控制字元。

### 尚未完成的功能
- [x] 實作「工程實驗報告產生器」後端處理與前端彙整頁面（Flask + Python pipeline，部署於 Render.com `https://eng-report.onrender.com`）。
- [x] Portal 中 `eng_report` 的 offline/active 狀態改由 Supabase `tool_statuses` 資料列決定，不再寫死於 build。
- [ ] 串接子工具與 Portal 的 `postMessage` 雙向通訊機制（若未來需要共享登入狀態）。
- [ ] 管理員驗證改為 server-side（目前為前端 hash比對，可被 localStorage 直接繞過，僅為 soft toggle）。
- [ ] `logo.png` 壓縮（目前 5.5MB，建議壓至 100KB 以下）。
- [ ] 進階時序微調介面（若使用者未來需要直接在網頁上編輯錄製的 JSON 檔案內容）。