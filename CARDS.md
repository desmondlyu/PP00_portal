# PP00 Portal 卡片資訊管理

此檔案用於集中管理 PP00 Portal 上的九大核心工具卡片內容。你可以直接在此檔案中修改卡片的各項屬性（如 `Title`、`Description`、`Details` 等）。修改完成後，請通知我，我會自動解析此 Markdown 檔案並同步更新回 `src/App.jsx` 原始碼中。

---

## 🗂️ 卡片列表

### 1. CP Rawdata/TTO 分析工具
- **ID**: `tto-analysis`
- **Title**: `NOR Flash Rawdata/TTO 分析平台`
- **Badge**: `Active`
- **Gradient**: `var(--grad-cyan-blue)`
- **Description**: `支援多個產品 CP Rawdata 分析、測試時間以及測試關鍵字分析，支援匯出報表可回倒系統，減省重新分析 Rawdata 動作。`
- **Details**:
  - `統計圖表、統計報表與 Site / Touch Down 熱圖`
  - `Group 分層展開與 Test Item 模擬數值聯動計算`
  - `關鍵字分析定位異常（快速對應站點、Site、UTL_DUT、BIN）`
- **Dev URL**: `http://localhost:3002`
- **Local Path**: `./tool/TTO_Agent/rawdata_analysis/index.html`
- **GitHub Pages URL**: `./tool/TTO_Agent/rawdata_analysis/index.html`

### 2. PP00 JB Lab 借機系統
- **ID**: `jb-booking`
- **Title**: `PP00 竹北借機系統`
- **Badge**: `Active`
- **Gradient**: `var(--grad-purple-pink)`
- **Description**: `竹北 4F 實驗室預約平台。`
- **Details**:
  - `卡片模式/實驗室平面圖模式`
  - `同機台同時間預約防重疊限制與本機身份識別`
- **Dev URL**: `http://localhost:3003`
- **Local Path**: `./tool/JB_booking/index.html`
- **GitHub Pages URL**: `./tool/JB_booking/index.html`

### 3. CP Datalog-to-Excel 轉換器
- **ID**: `dl-to-excel`
- **Title**: `NOR Flash CP Datalog-to-Excel 轉換器`
- **Badge**: `Active`
- **Gradient**: `var(--grad-emerald-cyan)`
- **Description**: `CP Datalog 轉換為 Excel 報表工具`
- **Details**:
  - `支援多個 Datalog 合併/單獨轉換成Excel`
  - `使用者可選擇要指定的匯出項目，加速匯出動作`
- **Dev URL**: `http://localhost:3005`
- **Local Path**: `./tool/DL_to_Excel/index.html`
- **GitHub Pages URL**: `./tool/DL_to_Excel/index.html`

### 4. FT 特性分析工具
- **ID**: `cz-dataset`
- **Title**: `NOR Flash FT 特性系統分析工具`
- **Badge**: `Active`
- **Gradient**: `var(--grad-emerald-cyan)`
- **Description**: `自動解析各測試項目 Pass/Fail 結果，支援線上修改項目的SPEC，並即時更新測試結果。平台提供產品分析總結報表（Pass, Fail 以及 <15% 邊界條件的危險項目）。`
- **Details**:
  - `除了判斷 Pass and Fail，支援 Pass Marginal 判斷`
  - `支援即時編輯 SPEC，會聯動計算結果`
  - `支援圖表功能，以及分群功能(READ, TIMING, DC, 4BYTE, NON 4BYTE等)`
- **Dev URL**: `http://localhost:3000`
- **Local Path**: `./tool/CZ_dataset/index.html`
- **GitHub Pages URL**: `./tool/CZ_dataset/index.html`

### 5. CP DL 分析工具
- **ID**: `dl-analysis`
- **Title**: `NOR Flash CP DL log 分析工具`
- **Badge**: `Active`
- **Gradient**: `var(--grad-amber-pink)`
- **Description**: `NOR Flash CP DL 分析工具。`
- **Details**:
  - `支援 wafer map/correlation/distribution/box plot圖表顯示`
  - `雙向框選聯動：任意框選圖表即可顯示對應區塊數據，且 wafer map 同步highlight框選位置`
  - `多維度統計圖表（相關性 Pearson R 與線性趨勢線、分佈箱形圖、直方圖）`
- **Dev URL**: `http://localhost:5173`
- **Local Path**: `./tool/CP_DL_Analysis/index.html`
- **GitHub Pages URL**: `./tool/CP_DL_Analysis/index.html`

### 6. CP/FT Yield Auto Summary
- **ID**: `yield-summary`
- **Title**: `VSC CP/FT Yield Auto Summary`
- **Badge**: `Active`
- **Gradient**: `var(--grad-purple-pink)`
- **Description**: `CP/FT VSC 良率自動彙總報表工具`
- **Details**:
  - `#注意：需下載 PROXY.bat/PROXY.py 透過自己主機當跳板，才可連線公司API`
  - `支援 CP/FT 數據`
  - `一鍵生成自動報表`
- **Dev URL**: `http://localhost:3006`
- **Local Path**: `./tool/Yield_Summary/index.html`
- **GitHub Pages URL**: `./tool/Yield_Summary/index.html`

### 7. CP MSS 轉換工具
- **ID**: `cp-mss-converter`
- **Title**: `NOR Flash CP MSS 轉換工具`
- **Badge**: `Active`
- **Gradient**: `var(--grad-cyan-blue)`
- **Description**: `將原始 Testing Team CP MSS 轉換為 Product Team 格式。支援自動解合併儲存格、Comment 解析、迴圈偵測與格式防呆驗證。`
- **Details**:
  - `使用者可自訂 DATASHEET SPEC 條件後，同步匯入各站點測試項目`
  - `自動偵測並高亮顯示 Excel 檔案中是否有 For 迴圈項目`
- **Dev URL**: `http://localhost:5174`
- **Local Path**: `./tool/CP_MSS/index.html`
- **GitHub Pages URL**: `./tool/CP_MSS/index.html`

### 8. Dongle Auto Summary
- **ID**: `dongle-summary`
- **Title**: `Dongle Auto loader 自動化平台`
- **Badge**: `Active`
- **Gradient**: `var(--grad-purple-pink)`
- **Description**: `透過Hub快速收集所有Dongle測試資料，並自動彙整測試報告。`
- **Details**:
  - `支援多個USB Device匯出資料，並依據Cycling類型一次性整理產生報表`
  - `支援直接整理個人電腦上的Dongle log檔案，請留意 log 檔案名稱需要是 COM*_log.txt (*為數字)`
- **Dev URL**: `#`
- **Local Path**: `#`
- **GitHub Pages URL**: `#`

### 9. WRITER按鍵錄製精靈
- **ID**: `writer`
- **Title**: `WRITER 按鍵錄製精靈`
- **Badge**: `Active`
- **Gradient**: `var(--grad-emerald-cyan)`
- **Description**: `專為 LP56 燒錄控制設計，支援 CH340 自動連線、按鍵操作錄製與回放功能。`
- **Details**:
  - `使用 Web Serial API，免裝終端機，直接網頁化連線`
  - `支援「測試流程錄製」與「回放」，可匯出/匯入 JSON 格式`
  - `支援 Big5 編碼防亂碼、終端機輸出 Log 錄製功能`
- **Dev URL**: `./tool/web_terminal/index.html`
- **Local Path**: `./tool/web_terminal/index.html`
- **GitHub Pages URL**: `./tool/web_terminal/index.html`

### 10. 自動化工程報告工具
- **ID**: `eng_report`
- **Title**: `工程實驗報告產生器`
- **Badge**: 
- **Gradient**: `var(--grad-emerald-cyan)`
- **Description**: `自動將CP yield，CZ summary，datasheet，整理成工程實驗報告`
- **Details**:
  - `自動產生 process corner split vs yield/loss/CZ 圖片`
  - `自動將 datasheet 產品摘要轉換文字貼到工程報告`
  - `自動生成固定格式之工程實驗報告，保留總結跟細節說明讓使用者填寫`
- **Dev URL**: `./tool/Eng_AutoReport/index.html`
- **Local Path**: `./tool/Eng_AutoReport/index.html`
- **GitHub Pages URL**: `./tool/Eng_AutoReport/index.html`

### 11. T5830測試程式優化與分析
- **ID**: `te_tto`
- **Title**: `T5830 測試程式優化分析`
- **Badge**: `Active`
- **Gradient**: `var(--grad-emerald-cyan)`
- **Description**: `T5830 測試時間/次數，多產品分析平台工具`
- **Details**:
  - `針對T5830 TE分析平台，解析T5830 RAWDATA (上傳 .TAR 壓縮格式)`
  - `提供TE工程單位自動解析Pre SITE/1TD中，測試次數、時間分析`
- **Dev URL**: `http://localhost:5173/`
- **Local Path**: `./tool/T5830_TTO/dist/index.html`
- **GitHub Pages URL**: `./tool/T5830_TTO/dist/index.html`

### 12. PP00 Knownledge Agent
- **ID**: `pp00-knowledge-agent`
- **Title**: `PP00 Knownledge Agent`
- **Badge**: `Active`
- **Gradient**: `var(--grad-cyan-blue)`
- **Description**: `PP00 內部知識型 Agent`
- **Details**:
  - `提供PP00內部知識搜尋，包含測試、產品以及製程相關知識檢索`
  - `提供新人訓練必須了解的課程，技能訓練`
  - `僅限PP00使用`
- **Dev URL**: `https://m365.cloud.microsoft/chat/?titleId=T_6f1ea993-be1e-5380-6352-a5300c2839e6&source=copilot-studio&redirfrom=CsrToSSR&auth=2`
- **Local Path**: `https://m365.cloud.microsoft/chat/?titleId=T_6f1ea993-be1e-5380-6352-a5300c2839e6&source=copilot-studio&redirfrom=CsrToSSR&auth=2`
- **GitHub Pages URL**: `https://m365.cloud.microsoft/chat/?titleId=T_6f1ea993-be1e-5380-6352-a5300c2839e6&source=copilot-studio&redirfrom=CsrToSSR&auth=2`


