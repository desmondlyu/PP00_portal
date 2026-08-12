# VIH/VIL 匯出規格文字保留設計

## 目標

匯出 Excel 時，`VIH*`／`VIL*` 的 `DATASHEET_SPEC` 保留 RAWDATA 原始規格敘述，例如 `VCC*0.3`；`Compare` 則輸出數據編輯表格目前的實際計算值，包含 VCC/VIO 換算與使用者手動修改。

## 設計

- 解析規格時，同時保存原始 `rawMin`、`rawTyp`、`rawMax` 與既有的計算後 `min`、`typ`、`max`。
- `DATASHEET_SPEC` 僅對 `VIH*`／`VIL*` 的 Min/Typ/Max 優先輸出原始公式文字；沒有原始文字時沿用計算值。
- `Compare` 的 Min/Typ/Max 直接寫入 `compareData` 的計算後數值，不再回連 `DATASHEET_SPEC`。
- Judge、Ratio、Typ_Judge 公式繼續引用 `Compare` 同列的數值欄位，確保 Excel 開啟後計算邏輯與數據編輯表格一致。
- `VIH`／`VIL` 前綴判斷沿用既有規則，涵蓋 AC、DC 等命名。

## 驗證

- 單元測試確認 `VIL` 的 `VCC*0.3` 在 `DATASHEET_SPEC` 保留文字。
- 單元測試確認 `Compare` 使用換算後數值，而非 `DATASHEET_SPEC` 工作表公式。
- 執行既有 CZ_dataset build，並同步部署單檔至 Portal。
