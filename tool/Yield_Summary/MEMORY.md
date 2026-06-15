<!-- ================================================================
  🤖 AI SESSION CONTEXT — 給下一個 AI Session 看的專案記憶
  最後更新：2026-06-15，Session 97a41095
  ================================================================ -->

## 🤖 AI 快速喚醒區（給 Copilot / AI 看）
> 下次回到此專案，請先讀本節，再閱讀其他說明文件，即可還原完整開發背景。

### 專案定位
本專案為半導體測試數據分析與機台預約管理的多工具整合專案，包含 CZ_dataset (FT特性分析)、JB_booking (竹北借機系統)、PP00_Portal ( Bento 工具入口網站) 等子專案。

### 關鍵函式與邏輯
- 透過子代理對子專案 README.md 進行 AI 記憶區的抽離與清洗，維持專案說明的純粹性。

### 重要技術決策
| 項目 | 實作細節 |
| --- | --- |
| **記憶功能抽離** | 將 `CZ_dataset`、`JB_booking`、`PP00_Portal` 專案中的 AI 記憶區塊抽離至獨立的 `MEMORY.md`，並完全清除 `README.md` 中的記憶區塊。 |
| **雙重審查機制** | 使用子代理驅動開發，每個抽離任務皆通過 Spec 規格審查與 Code Quality 審查。 |
| **說明文件與聯調** | 整合 Web App 所有檔案 (index.html, css, js, libs) 至 `Yield_Summary` 子目錄，完成聯調，排除所有無效引用，確保本地可離線運行。 |
| **變數隔離與事件分發** | 將 CP/FT JS 程式重構為 IIFE 實現作用域隔離，並在 `index.html` 部署中央分發器，以解決 SyntaxError 與 Race Condition 賽跑競爭問題。 |
| **頁面標題與架構調整** | 移除 `Yield_Summary/index.html` 中的舊作者副標題與 CORS 跨域提示區塊，將標題統一為 `CP/FT VSC Yield Summary`，移除了 Fail-safe 的文字說明並精簡其結構，新增含作者與 MIT 授權的極簡頁尾。 |
| **操作說明文件** | 於 `Yield_Summary/README.md` 建立極簡卡片化風格操作說明，專注於輸入批號、時間範圍、FT MSS 檔案對應、自動排序及 Excel 匯出。 |
| **Git 忽略規則 (.gitignore)** | 於根目錄及 `Yield_Summary/` 分別建立 `.gitignore`，排除 `VSC_CP.py`、`VSC_FT.py`、其他無關子專案資料夾、編譯快取及 IDE 設定檔，確保僅追蹤與上傳 GitHub Pages 部署必備的靜態資源。 |
| **玻璃擬態視覺升級** | 引入 `backdrop-filter: blur(16px)`、半透明科技灰藍背景、細緻邊框、輸入框與按鈕圓角（6-12px）及 radial 發光漸層背景，消除硬編碼 opaque 顏色。 | 實現 Glassmorphism 現代化視覺效果，提升半導體工具介面的專業質感與使用體驗。 |

### 固定設定值
- 無

### 已安裝 Graves Skills 清單
- `brainstorming`
- `writing-plans`
- `subagent-driven-development`
- `finishing-a-development-branch`

### 常見錯誤與解法
- **問題**：`write_to_file` 在填入 `ArtifactMetadata` 時會被限制只能在 artifact 目錄下寫入。
  * **解法**：欲寫入專案一般目錄時，不要填寫 `ArtifactMetadata`。
- **問題**：`grep_search` 工具在 Windows 無 `grep` 執行檔時會報錯。
  * **解法**：改以 PowerShell `Get-ChildItem` 取得目錄清單。

### 尚未完成的功能
- [ ] 無
