# T5830 Management Mapping 參考下載設計

## 目標

在 `tool/T5830_TTO` 的 Dashboard「Mapping 檔案」區塊，新增一個可下載
`Management_Mapping.xlsx` 的按鈕，提供使用者匯入前參考。

## 範圍

- 只改 `tool/T5830_TTO`。
- 不變更 Mapping 解析規則。
- 不新增相依套件。

## 設計

### 架構

1. 將範本檔放入 Vite `public` 目錄，讓 build 自動輸出到 `dist`。
2. 在 Dashboard Mapping 區塊新增下載按鈕，採靜態路徑下載。

### 元件與檔案

- 新增：`tool/T5830_TTO/public/Management_Mapping.xlsx`
- 修改：`tool/T5830_TTO/src/features/dashboard/DashboardPage.tsx`
- 修改：`tool/T5830_TTO/src/features/dashboard/DashboardPage.test.tsx`

### UI/UX

- 按鈕文案：`📥 下載 Management Mapping 範本`
- 位置：現有「Management Mapping 檔案」上傳區塊內，欄位說明文字附近。
- 下載目標：`./Management_Mapping.xlsx`，並帶 `download` 屬性。

### 錯誤處理

- 下載走靜態檔，不新增執行期例外邏輯。
- 若部署遺失檔案，瀏覽器會自然回報 404。

### 測試策略

1. Dashboard 單元測試新增斷言：下載按鈕存在。
2. 斷言按鈕（連結）`href` 指向 `./Management_Mapping.xlsx`。
3. 依專案既有指令執行指定測試與 build。

## 非目標

- 不動 `readMappingWorkbook` 欄位檢核。
- 不改上傳流程或預設 Mapping 套用邏輯。
