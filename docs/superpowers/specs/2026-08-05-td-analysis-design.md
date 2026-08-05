# TD 分析分頁設計

## 目標

在 T5830 TTO Dashboard 的 `TTR 對比` 右側新增 `TD分析` 分頁，以各 TD 的 AVG、MAX、MIN、RANGE 進行比較。

## 資料來源與篩選

- 直接使用目前 Dashboard 已載入的分析資料，不新增上傳入口。
- 重用既有產品、站點與 TD No 浮動篩選。
- 使用未跨產品彙總的 raw rows，保留 `touchdownStats`。
- 額外提供五層階層篩選：`Mode → Operation → Test_Item_Merged → Original_Item_Name → Test_Item`。

## 呈現規則

- 每個 Product 各佔一列；多產品依序換列。
- 每個產品列固定 2×2 卡片：AVG、MAX、MIN、RANGE。
- 每張卡片以 Test_Item 為列、秒數為橫軸，使用 TD 分組橫條。
- TD 顏色跨四張卡片與所有產品固定一致。
- 每張卡片獨立取前 20 名：依該統計值在目前所選 TD 中的最大值由大到小排序；保留該 20 個 Test_Item 的所有已選 TD 數值。
- 分頁頂端明示 Top 20 與排序規則。

## 無資料處理

- 篩選後沒有資料時，顯示既有無篩選結果提示。
- 有資料但沒有 `touchdownStats` 時，提示使用者以「分析所有TD」重新分析並匯出／匯入支援 TD 統計的檔案。

## 實作範圍

- 在 `DashboardPage` tabs 的 `TTR 對比` 後新增 `TD分析`。
- 新增 `TdAnalysisTab` 呈現 2×2 SVG 圖表。
- 在既有 Dashboard selector 中新增 TD 統計的聚合與 Top 20 選取邏輯。
- 不新增圖表套件、不新增上傳流程、不修改 TTR 對比資料流。

## 驗證

- Dashboard tab 順序包含 `TD分析`。
- 多 Product 各自呈現一列 2×2 圖表。
- 每張統計卡片各自依所選 TD 最大值取 Top 20。
- TD 色彩在卡片間一致。
- 沒有 TD 統計時顯示可行的重新分析提示。
