# PP00_Portal Repository Instructions

## 套用範圍
- 這是 **repository-wide** 指令檔，位置固定在 `.github/copilot-instructions.md`。
- 變更前先理解：此 repo 是 **Portal 入口 + 多個子工具**，其中部分工具是編譯產物掛載。

## 專案結構與修改原則
- `PP00_Portal` 是部署入口，Portal 會以 iframe 載入子工具頁面。
- `tool/T5830_TTO` 是 Vite + React + TS 專案；Portal 實際載入 `tool/T5830_TTO/dist/index.html`。
- 對有 `src/` 的工具，**一律改 source，不直接手改 dist/minified 檔**（除非明確要求 hotfix）。
- 完成 source 修改後，若 Portal 讀的是 build 產物，**必須同步 rebuild 並提交 dist**，避免「src 有改、頁面沒變」。

## Build / Test 最小流程（T5830_TTO）
在 `tool/T5830_TTO`：
1. `npm run test:run -- src/lib/workbook.test.ts src/features/pipeline/PipelinePage.test.tsx src/features/dashboard/DashboardPage.test.tsx`
2. `npm run build`
3. 確認 `dist/index.html` 指向最新 `dist/assets/index-*.js` / `index-*.css` 後再提交。

## Excel 上傳防呆（強制規範）
凡是 Web App 有上傳並解析 Excel（SheetJS/ExcelJS），必須內建「受保護檔案」防呆：

### 必須攔截的錯誤訊息
- `ECMA-376 Encrypted file missing /EncryptionInfo`
- `Encrypted`
- `password-protected`
- `Corrupted zip or bug: unexpected signature`（ExcelJS 類場景）

### 必須呈現的 UX
- 顯示 **彈跳視窗（modal/dialog）**，不可只顯示原始錯誤字串。
- 明確提示：請解除 IRM/加密後重傳。
- 顯示示意圖：`unlock_irm.jpg`（工具內可用 `public/unlock_irm.jpg` 或可用的相對路徑）。
- 使用者關閉視窗前，不可繼續解析流程。

### 套用位置
- 不只主上傳入口，所有 Excel 匯入點都要一致處理（例如：Mapping 匯入、TTR 比對上傳、已分析結構匯入）。

## 子工具一致性規範
- 有相同功能（例如 Excel 匯入）時，優先重用同一判斷邏輯與訊息文案，避免各工具行為不一致。
- 若某工具在 repo 內僅有編譯檔，應註記其 source 專案位置並在 source 修改後回拷 build 成果。

## 更新日誌輸出規範（對應既有 skill）
- 當使用者要求「README/更新日誌/改版摘要」等**使用者導向**文案時，套用 `updatelog_for_user_review` 規則：
  - 100 字內
  - 使用者看得懂的結果導向描述
  - 可使用精簡 emoji
- `MEMORY.md` 不可套用此簡化規則；`MEMORY.md` 必須保留完整技術細節。

## 變更安全
- 不得回滾或覆蓋與當前任務無關的既有修改。
- 若發現「畫面與 source 不一致」，先檢查是否漏了 rebuild / dist 提交 / 快取問題，再判定程式邏輯。
