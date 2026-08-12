# CZ Dataset VIL／VIH Spec 單位與命名設計

## 目標

修正 CZ Dataset 對 VIL／VIH 類 Test Item 的 spec 公式、單位轉換與命名辨識，讓原始 VCC/VIO 與實測 Value 保持不變，同時讓判定、Ratio、圖表與 Excel 匯出使用一致的正規化 spec。

## 行為

- 支援 `VIL`、`VIL AC`、`VIL DC`、`VIH`、`VIH AC`、`VIH DC` 及其他相同前綴的命名。
- spec 公式中的 `VCC` 只代入原始 VCC 數值；公式中的 `VIO` 只代入原始 VIO 數值。
- 公式先以 V 為基準計算，再依 Excel `Unit` 欄轉換：
  - `Unit = mV`：結果乘以 1000。
  - `Unit = V`：保留結果。
  - 空白或未知 Unit：不自行猜測，不轉換。
- 實測 `Value`、`vcc`、`vio` 不轉換。
- 例：VCC=`2.200V`、VIL AC Max=`VCC*0.1`、Unit=`mV`，spec Max 為 `220`；Value 與 VCC 仍維持原始資料。
- 正規化 spec 統一供 Judge、Value/Spec Ratio、Summary、圖表與 Excel 匯出使用。

## 實作範圍

### 原始碼

修改 `C:\D_BACKUP\AI_Project\web_app\CZ_dataset\web\src\utils\excelProcessor.js`：

- 解析 spec header 時找到 Unit 欄，並將 Unit 與 raw Min/Typ/Max 一起保存。
- 更新公式解析，分離 VCC/VIO 代入規則與 Unit 轉換。
- 抽出 VIL／VIH 前綴判定，供 spec、Judge、Ratio、Failed Spec 共用。
- 缺少公式依賴值時回傳空 spec；無法解析公式時保留既有數字 fallback。

### 部署產物

- 以 `npm run build` 產生 `C:\D_BACKUP\AI_Project\web_app\CZ_dataset\web\dist\index.html`。
- 將 build 產物同步至 Portal 的 `tool/CZ_dataset/index.html`。
- 不手動修改編譯後 JavaScript，不新增依賴。

## 相容性與安全邊界

- 保留目前既有的 Excel 解析、資料編輯、Summary、圖表與匯出流程。
- 不修改原始 Excel，不改變實測 Value、VCC、VIO 的顯示或篩選值。
- 保留 CZ_dataset repo 中既有的使用者未提交變更，不回復無關檔案。

## 驗證

- 執行 `npm run lint`。
- 執行 `npm run build`。
- 用最小資料驗證 `2.2 * 0.1` 搭配 `mV` 得到 `220`。
- 驗證 VIL／VIH 各命名變體均能進入正確的 Judge、Ratio 與 Failed Spec 邏輯。
- 驗證 build 產物可由 Portal `tool/CZ_dataset/index.html` 載入。
