# Web Terminal 工具列 UI 設計規格

## 目標

重新整理 `tool/web_terminal/index.html` 的終端機控制列，讓連線、錄製與測試流程控制集中在終端機畫面上方的同一個工具列，提升辨識速度與操作一致性。

## 範圍

只修改 `tool/web_terminal/index.html` 的 HTML 與 CSS：

- 保留既有 JavaScript、DOM id、事件綁定與 Web Serial 行為。
- 不新增套件、不拆分檔案、不改錄製／回放／離線模擬邏輯。
- 不修改目前工作區其他未提交檔案。

## 版面設計

工具列採「上下兩列分組」：

### 第一列：連線

依序放置：

1. `🔌 連結 CH340`：`btnConnectCH340`，主按鈕。
2. `🖥️ 所有 Port`：`btnBrowseAll`，次按鈕。
3. `⚡ BAUD RATE`：`baudRateSelect`，沿用既有選項與值。

### 第二列：流程

依序放置：

1. `⏺ 錄製 LOG`：`btnLog`，保留錄製狀態色彩。
2. `🧹 清除螢幕`：`btnClear`，保留危險操作色彩。
3. `🎬 錄製測試流程`：`btnRecordFlow`。
4. `▶️ 回放測試流程`：`btnPlayFlow`。
5. `🔁 迴圈次數`：`txtPlayCount`，保留 number、`min="1"` 與既有輸入語意。

每列使用低對比半透明背景、細邊框與清楚的組別標籤。工具列在窄螢幕允許換行，不建立額外元件或複雜布局系統。`statusBadge` 留在頁首，作為全域連線狀態。

## 隱藏控制項

以下元素保留在 HTML 與 JavaScript 架構中，但不顯示在使用者介面：

- `btnOfflineMode`
- `chkLocalEcho`
- `chkAutoScroll`

使用原生 `hidden` 與 `aria-hidden="true"` 隱藏，不刪除元素、不移除 id、不移除事件或程式讀取。預設狀態固定為：

- `chkLocalEcho`：未勾選。
- `chkAutoScroll`：已勾選。

## 互動與可用性

- 所有可操作控制項保留鍵盤焦點與原生表單行為。
- 按鈕保留清楚的文字與 emoji 圖示；必要時補上 `title` 或 `aria-label`。
- 不變更連線狀態、錄製狀態、回放檔案選擇與迴圈次數的既有邏輯。
- 不隱藏 `statusBadge`、字體縮放、即時終端機或凍結比對區控制項。

## 驗證

完成後執行以下檢查：

1. 靜態確認每個既有控制項 id 仍存在且各自只有一個。
2. 確認三個隱藏控制項仍存在，Local Echo 未勾選，Auto Scroll 已勾選。
3. 載入頁面確認兩列工具列、按鈕文字、欄位與窄寬換行。
4. 檢查 Git diff 僅包含本次規格與 UI 變更，再提交並推送至目前遠端分支。
