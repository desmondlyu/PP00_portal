<!-- ================================================================
  🤖 AI SESSION CONTEXT — 給下一個 AI Session 看的專案記憶
  最後更新：2026-06-15，Session b14830f6
  ================================================================ -->

## 🤖 AI 快速喚醒區（給 Copilot / AI 看）
> 下次回到此專案，請先讀本節，再閱讀其他說明文件，即可還原完整開發背景。

### 專案定位
本專案為**純前端、免伺服器、百分之百本機離線運作**的 Datalog 文字檔轉 Excel (`.xlsx`) 的極簡入口網站。採用 **Swiss Minimalism (瑞士極簡風格)** 與 **Emerging Tech (暗色調科幻漸層)**，保障敏感半導體數據在完全不聯網的情況下進行安全轉換。

### 關鍵函式與邏輯
*   `parseSingleFile(fileContent, fileName)` (於 `parser.js`):
    *   跳過前 5 行元數據。
    *   使用正則表達式 `/[ /<>]+/` 進行單層分割。
    *   自動偵測空首欄並移除 (`tokens.shift()`)。
    *   自動對標題進行去重 (如 `VAL` 轉為 `VAL.1`, `VAL.2`)。
    *   數值型態判定：若整欄非空資料皆為數字，則將該欄所有資料自動轉換為 `Number`，否則保持 `String`。
*   `checkColumnsMatch(filesData)` (於 `parser.js`):
    *   比對多個檔案的 `headers` 是否與第一個基準檔案完全一致。若不一致則回傳詳細少欄/多欄資訊。
*   `exportMergedExcel(filesData, selectedCols)` (於 `index.html`):
    *   合併所有上傳的檔案。Column A 強制為 `Source` 記錄檔名（不含副檔名）。以 `selectedCols` 過濾欄位並輸出單一 Excel。
*   `exportSplitZip(filesData, selectedCols)` (於 `index.html`):
    *   將每個檔案各別以 `selectedCols` 過濾並生成 Excel，透過 `JSZip` 打包壓縮，最後觸發單一 ZIP 壓縮檔下載。

### 重要技術決策
| 技術決策 | 實作方案 | 優點 / 原因 |
| :--- | :--- | :--- |
| **無伺服器架構** | 純 HTML5 + Vanilla JS | 資料完全在瀏覽器內解析，絕不上網傳輸，100% 避免數據洩漏。 |
| **離線依賴庫** | `libs/xlsx.full.min.js`, `libs/jszip.min.js` | 將 SheetJS 和 JSZip 下載到本地，在完全斷網的無塵室內也能雙擊 index.html 即開即用。 |
| **安全防護 (Anti-XSS)** | 使用 `textContent` 與 `createElement` 代替 `innerHTML` | 防止惡意檔名或 datalog 欄位名稱對網頁進行 script 腳本注入。 |
| **全域狀態維護** | `selectedColumns = new Set()` | 欄位選擇不依賴 DOM 狀態，避免在搜尋篩選隱藏 checkbox 時導致選取狀態丟失。 |

### 固定設定值
*   `LEAD_LINES_TO_SKIP = 5`：略過前 5 行。
*   Datalog 分割正則：`/[ /<>]+/`。

### 已安裝的 Skills 清單
- `ui-ux-pro-max` (視覺與互動設計指南)
- `brainstorming` (需求對齊與原型預覽)
- `writing-plans` (代碼實作計畫制定)
- `subagent-driven-development` (子代理代碼撰寫與 TDD 雙重審查)

### 常見錯誤與解法
*   **搜尋時狀態遺失或 Excel 損毀**：不要從 DOM 中讀取 checkbox 狀態。改用全域的 `Set` 物件進行增刪，匯出時再將 `Set` 依據原始 `allHeaders` 順序進行過濾與排序。
*   **多檔下載被瀏覽器攔截**：改用 `JSZip` 打包，只發起一次 `.zip` 檔案的下載請求，確保 100% fail-safe。
*   **匯出失敗：`Too many properties to enumerate`**：SheetJS 預設「稀疏模式」將每個儲存格視為物件 property（如 `A1`, `B2`），超過 V8 引擎上限（約 8.3M properties）即爆錯。**解法**：在 `XLSX.utils.aoa_to_sheet(wsData)` 加上 `{ dense: true }` 參數 → `XLSX.utils.aoa_to_sheet(wsData, { dense: true })`，改用二維陣列儲存模式，無上限限制。適用於合併匯出與分開打包兩條路徑。

### 尚未完成的功能
- [x] 所有規格功能均已 100% 實作並測試完成。
