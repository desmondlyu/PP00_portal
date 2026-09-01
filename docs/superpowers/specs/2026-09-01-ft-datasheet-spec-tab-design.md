# FT 特性分析工具 DATASHEET SPEC 編輯頁籤設計

## 目標

將規格調整從「再次上傳 `DATASHEET_SPEC` Excel」改為目前分析工具內的第四個頁籤。原始 FT 資料匯入後，使用者可直接編輯 Min、Typ、Max，並讓數據編輯表格、統計總覽與圖表使用同一份最新規格狀態。

## 背景與問題

舊方案在匯出無損 Excel 旁提供第二次 `DATASHEET_SPEC` 匯入。實際使用時，規格可能只更新到 Summary C，數據編輯表格的規格、Ratio、Judge、Typ_Judge，以及 Summary A/B 未能可靠同步；另外，VIL／VIH 的單位轉換與公式文字也容易造成警告。

新方案不再讀取第二份 Excel，避免檔案比對、未匹配與分裂狀態問題。規格直接成為目前分析狀態的一部分，並由單一重算流程更新所有衍生結果。

## 範圍

### 包含

- 移除「匯入 DATASHEET_SPEC」按鈕、隱藏 Excel input、匯入事件與只服務於第二次匯入的 helper。
- 新增第四個 `DATASHEET SPEC` 頁籤。
- 顯示與無損 Excel `DATASHEET_SPEC` 工作表相同的 8 欄：
  `Item`、`Description`、`4Byte_Alignment`、`Group`、`Dummy_Rd`、`Min`、`Typ`、`Max`。
- 前 5 欄唯讀，Min／Typ／Max 可編輯。
- 使用 `rowIdx` 與 `specRowIdx` 對應規格列和量測資料列。
- 規格修改後同步重算數據編輯表格、Summary A/B/C 與圖表資料。
- 保留規格原始文字，支援數字、空白、`VCC`／`VIO` 表達式。
- 保留 VIL／VIH 與 Value 一致的單位，不進行額外的 1000 倍換算。
- 更新工具 README 的操作說明。

### 不包含

- 不再支援以第二份 Excel 重新套用 `DATASHEET_SPEC`。
- 不替換原始量測資料列、產品條件、篩選狀態或圖表來源。
- 不新增伺服器、外部 API 或新的執行環境依賴。
- 不改變無損 Excel 的工作表名稱、欄位順序與公式匯出格式。

## 使用者介面

### 頁籤

頁籤順序為：

1. 統計總覽
2. 數據編輯表格
3. 分析圖表預覽
4. DATASHEET SPEC

新頁籤沿用既有卡片、表格、字體、間距與狀態樣式。窄畫面以水平捲動呈現完整 8 欄，避免壓縮公式欄位造成內容不可讀。

尚未載入原始資料時，維持既有空狀態提示，不顯示可編輯規格表。

### 規格表

- `Item`、`Description`、`4Byte_Alignment`、`Group`、`Dummy_Rd` 為唯讀。
- `Min`、`Typ`、`Max` 為可編輯欄位。
- 欄位離開焦點或按 Enter 時套用該次修改；不在每個鍵擊時重算全表。
- 成功修改後，沿用數據編輯表格的修改狀態視覺提示。

## 資料模型與狀態來源

`datasheetSpecs` 是目前規格的單一來源。每個規格列保留：

- 匯出所需的顯示欄位。
- 解析後供判定使用的 Min／Typ／Max 數值。
- Min／Typ／Max 的原始文字，以保留 `VCC`／`VIO` 公式與使用者輸入格式。
- `rowIdx`，作為規格列的穩定識別。

`compareData.specRowIdx` 對應 `datasheetSpecs.rowIdx`。新頁籤不得只依 `Item` 或複合文字鍵更新資料，避免同名測試項目互相污染。

原始規格快照維持獨立保存，Summary C 以原始規格和目前規格比較，產生 `relax or tighten` 建議。

## 編輯與重算流程

1. 使用者在 Min／Typ／Max 欄位輸入文字。
2. 按 Enter 或離開欄位時，使用該規格列的 VCC／VIO 與單位條件解析輸入。
3. 空白輸入轉為該方向無規格。
4. 數字輸入轉為判定使用的數值。
5. `VCC`／`VIO` 表達式保留原文，並依各列條件解析為判定使用的數值。
6. 以 `rowIdx` 找到所有對應的 `compareData` 列。
7. 沿用數據編輯表格既有的規格修改、特殊群組同步與判定規則，重算：
   - `specMin`
   - `specTyp`
   - `specMax`
   - `value_spec_ratio`
   - `judge`
   - `typ_judge`
8. 由更新後的 `compareData` 重建 Summary A/B。
9. 由原始規格快照與更新後的 `datasheetSpecs` 重建 Summary C。
10. 由同一份更新後狀態刷新圖表資料與四個頁籤。

Summary B 維持既有規則：`Judge = Pass` 且 `Value_Spec_Ratio < 1.15`，即邊際裕度不足 15%。

VIL／VIH 不做額外除以或乘以 1000，規格與 Value 維持目前資料結構的共同單位。

## 錯誤處理

- 無法解析的規格文字拒絕該次修改，欄位恢復上一個有效值。
- 錯誤提示使用純文字渲染，不把使用者輸入當作 HTML，避免殘留 HTML 語法。
- 無效輸入不得更新其他規格欄位、資料列或 Summary。
- 重算錯誤不得以靜默預設值覆蓋使用者輸入；沿用既有資料表的明確安全結果與錯誤呈現方式。
- 第二次 Excel 匯入移除後，不再顯示工作表缺失、未匹配或匯入筆數警告。

## 實作邊界

目前 repository 追蹤的 FT 部署檔是 `tool\CZ_dataset\index.html`。本功能以該部署單檔為主要變更目標，沿用既有的單檔部署限制，不引入外部服務。

規格更新邏輯應從既有數據編輯表格的 `Ce` 行為抽取或重用，形成清楚的共用入口，避免新頁籤再次複製一套不一致的計算規則。

## 測試與驗收

### 純函式測試

實作前先建立會失敗的測試，涵蓋：

- 修改 Max 後，對應資料列的 Max、Ratio、Judge 更新。
- 修改 Typ 後，Typ_Judge 與 Summary A 更新。
- 修改 Min／Max 後，Summary B 更新。
- 修改規格後，Summary C 正確反映原始規格與目前規格差異。
- 數字、空白、`VCC`／`VIO` 表達式解析正確。
- VIL／VIH 的規格和 Value 單位不被錯誤轉換。
- 無效輸入被拒絕且恢復上一個有效值。
- 以 `rowIdx/specRowIdx` 更新時，不會誤改同名但不同列的資料。

### 瀏覽器驗收

以實際 FT 原始資料匯入後確認：

- 四個頁籤都能正常切換。
- 新頁籤的 8 欄與無損 Excel `DATASHEET_SPEC` 欄位順序一致。
- 編輯 Min／Typ／Max 後，數據編輯表格、Summary A/B/C 與圖表狀態一致。
- 原始量測值與資料列數未被改變。
- 匯出無損 Excel 的工作表結構與既有公式格式未被破壞。

## 設計決策摘要

| 決策 | 選擇 | 原因 |
| :--- | :--- | :--- |
| 規格調整入口 | `DATASHEET SPEC` 頁籤 | 避免第二份 Excel 造成格式與狀態不同步 |
| 同步識別 | `rowIdx/specRowIdx` | 比 `Item` 或文字鍵穩定，避免同名列誤更新 |
| 套用時機 | 離開欄位或 Enter | 保留即時操作感，避免每個鍵擊重算全表 |
| 輸入格式 | 數字、空白、`VCC`／`VIO` 表達式 | 保留無損規格的原始表達能力 |
| 無效輸入 | 拒絕並恢復上一值 | 避免錯誤規格污染分析結果 |
| 單位處理 | 沿用目前 Value 單位 | 修正 VIL／VIH 被錯誤轉換的問題 |
| 狀態架構 | 共用重算流程 | 確保數據表格、Summary 與圖表使用同一份狀態 |
