# T5830 Sunburst 結構匯出設計

## 目標
在 T5830_TTO 的「多維度旭日圖」分頁新增 xlsx 下載按鈕，並讓「匯出所有分析結構」包含 Sunburst 資料結構分頁，同時維持「上傳已分析的資料」相容。

## 範圍
- `tool/T5830_TTO/src/features/dashboard`：按鈕與匯出流程
- `tool/T5830_TTO/src/lib/workbook.ts`：匯出結構擴充
- 相關測試檔：Dashboard 與 workbook 測試

## 現況解析（Sunburst 資料來源）
目前 Sunburst 圖資料由 `SunburstTab.tsx` 即時計算：
1. 輸入：`rows: MasterSummaryRow[]`（Dashboard 傳入 `rawFiltered`）與 `mapping: MappingRow[]`
2. 邏輯：
   - 先以 `Original_Item_Name` 對 Mapping 取得 `Mode` / `Operation`
   - 以 `Grand_Total_Time` 加總成兩層：
     - Mode 層總和
     - Mode + Operation 層總和
3. 畫圖維度：
   - 內圈：Mode
   - 外圈：Operation（掛在 Mode 之下）

## 目標資料結構（匯出）
新增共用建構器輸出兩個結構：
- `Sunburst_Mode`
  - 欄位：`Product`, `Mode`, `Total_Time`, `Ratio`
- `Sunburst_Operation`
  - 欄位：`Product`, `Mode`, `Operation`, `Total_Time`, `Ratio`

計算規則：
- Product 內比例分母為該 Product 的 Sunburst 總時間
- 無 Mapping 命中時使用 `Not Classified`
- 使用全量 `summaries`，不受 UI 篩選影響

## UI 設計
在「多維度旭日圖」分頁新增按鈕（樣式完全沿用既有下載按鈕）：
- 文案：`下載 Sunburst 資料結構`
- 檔名：`Sunburst_Structure.xlsx`
- 內容：`Sunburst_Mode` + `Sunburst_Operation`

## 匯出整合設計
`writeAnalysisWorkbook` 維持 `Master_Summary` 與各 `Product_Station` 既有分頁，並額外附加：
- `Sunburst_Mode`
- `Sunburst_Operation`

## 相容性（上傳已分析的資料）
- `readAnalysisWorkbook` 仍只要求 `Master_Summary` 必要欄位，不依賴 Sunburst sheets
- 因此舊檔與新檔都可匯入還原儀表板
- Sunburst sheets 視為可選附加資料，不影響匯入成功條件

## 測試
1. `DashboardPage.test.tsx`
   - 驗證「多維度旭日圖」分頁可見新下載按鈕
2. `workbook.test.ts`
   - 驗證 `writeAnalysisWorkbook` 輸出包含 `Sunburst_Mode`、`Sunburst_Operation`
   - 驗證欄位與基本加總/比例格式
3. 既有指定測試與 build
   - `npm run test:run -- src/lib/workbook.test.ts src/features/pipeline/PipelinePage.test.tsx src/features/dashboard/DashboardPage.test.tsx`
   - `npm run build`
