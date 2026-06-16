# PP00 Portal 卡片資訊管理

此檔案用於集中管理 PP00 Portal 上的九大核心工具卡片內容。你可以直接在此檔案中修改卡片的各項屬性（如 `Title`、`Description`、`Details` 等）。修改完成後，請通知我，我會自動解析此 Markdown 檔案並同步更新回 `src/App.jsx` 原始碼中。

---

## 🗂️ 卡片列表

### 1. CP Rawdata/TTO 分析工具
- **ID**: `tto-analysis`
- **Title**: `CP Rawdata/TTO 分析工具`
- **Badge**: `Active`
- **Gradient**: `var(--grad-cyan-blue)`
- **Description**: `NOR Flash CP 測試資料 analysis 系統。提供站點與產品維度的統計比較、單一統計報表中的 Group 分層展開（Group → Test Item）、模擬欄位調整後的即時圖表變化，並提供關鍵字分析輔助。`
- **Details**:
  - `統計圖表、統計報表與 Site / Touch Down 熱圖`
  - `Group 分層展開與 Test Item 模擬數值聯動計算`
  - `關鍵字分析定位異常（快速對應站點、Site、UTL_DUT、BIN）`
- **Dev URL**: `http://localhost:3002`
- **Local Path**: `./tool/TTO_Agent/rawdata_analysis/index.html`
- **GitHub Pages URL**: `./tool/TTO_Agent/rawdata_analysis/index.html`

### 2. PP00 JB Lab 借機系統
- **ID**: `jb-booking`
- **Title**: `PP00 JB Lab 借機系統`
- **Badge**: `Active`
- **Gradient**: `var(--grad-purple-pink)`
- **Description**: `PP00 測試機台預約管理系統。支援卡片日曆預約與現場平面圖大框架模式切換，提供現場 21 台機台（含 Ms*）的預約管理與即時防重疊檢驗。`
- **Details**:
  - `卡片模式 / 大框架平面圖模式雙視圖切換`
  - `現場 21 台機台 CRUD 預約管理`
  - `同機台同時間預約防重疊限制與本機身份識別`
- **Dev URL**: `http://localhost:3003`
- **Local Path**: `./tool/JB_booking/index.html`
- **GitHub Pages URL**: `./tool/JB_booking/index.html`

### 3. CP Datalog-to-Excel 轉換器
- **ID**: `dl-to-excel`
- **Title**: `CP Datalog-to-Excel 轉換器`
- **Badge**: `Active`
- **Gradient**: `var(--grad-emerald-cyan)`
- **Description**: `CP Datalog 轉換為 Excel 報表工具`
- **Details**:
  - `支援 Datalog 解析`
  - `自動排版`
  - `一鍵導出 Excel`
- **Dev URL**: `http://localhost:3005`
- **Local Path**: `./tool/DL_to_Excel/index.html`
- **GitHub Pages URL**: `./tool/DL_to_Excel/index.html`

### 4. FT 特性分析工具
- **ID**: `cz-dataset`
- **Title**: `FT 特性分析工具`
- **Badge**: `Active`
- **Gradient**: `var(--grad-emerald-cyan)`
- **Description**: `FT 特性驗證測試報告本地端 React 互動式分析儀表板。支援 Excel 報告拖曳解析、良率邊際裕度檢核，提供適合 JMP 作圖的資料結構。`
- **Details**:
  - `批次 Excel 上傳解析與 Out of Spec (Fail) / Pass Marginal 良率檢核`
  - `高密度表格即時編輯、Verdict/Ratio 聯動計算與修改高亮標記`
  - `自動分群頁籤、雙層巢狀水平降序圖表與無損公式 Excel 導出`
- **Dev URL**: `http://localhost:3000`
- **Local Path**: `./tool/CZ_dataset/index.html`
- **GitHub Pages URL**: `./tool/CZ_dataset/index.html`

### 5. CP DL 分析工具
- **ID**: `dl-analysis`
- **Title**: `CP DL 分析工具`
- **Badge**: `Active`
- **Gradient**: `var(--grad-amber-pink)`
- **Description**: `100% 本地端離線執行的半導體測試數據與 CP 晶圓失效分析工具，無須連網或安裝伺服器。支援 Wafer Map 失效地圖、缺陷空間分佈識別與多維度統計圖表。`
- **Details**:
  - `100% 本地端離線運作，確保晶圓數據安全無虞`
  - `雙向框選聯動：晶圓空間框選 (Spatial Filter) 與圖表高亮同步 (Highlight Sync)`
  - `多維度統計圖表（相關性 Pearson R 與線性趨勢線、分佈箱形圖、直方圖）`
- **Dev URL**: `http://localhost:5173`
- **Local Path**: `./tool/CP_DL_Analysis/index.html`
- **GitHub Pages URL**: `./tool/CP_DL_Analysis/index.html`

### 6. CP/FT Yield Auto Summary
- **ID**: `yield-summary`
- **Title**: `CP/FT Yield Auto Summary`
- **Badge**: `Active`
- **Gradient**: `var(--grad-purple-pink)`
- **Description**: `CP/FT 良率自動彙總報表工具`
- **Details**:
  - `支援 CP/FT 數據`
  - `多維度良率彙總`
  - `一鍵生成自動報表`
- **Dev URL**: `http://localhost:3006`
- **Local Path**: `./tool/Yield_Summary/index.html`
- **GitHub Pages URL**: `./tool/Yield_Summary/index.html`

### 7. CP MSS 轉換工具
- **ID**: `cp-mss-converter`
- **Title**: `CP MSS 轉換工具`
- **Badge**: `Active`
- **Gradient**: `var(--grad-cyan-blue)`
- **Description**: `CP MSS 測試數據轉換與格式標準化工具。功能待開發。`
- **Details**:
  - `功能待開發`
- **Dev URL**: `#`
- **Local Path**: `#`
- **GitHub Pages URL**: `#`

### 8. Dongle Auto Summary
- **ID**: `dongle-summary`
- **Title**: `Dongle Auto Summary`
- **Badge**: `Active`
- **Gradient**: `var(--grad-purple-pink)`
- **Description**: `Dongle 數據彙總與自動分析報告生成系統。功能待開發。`
- **Details**:
  - `功能待開發`
- **Dev URL**: `#`
- **Local Path**: `#`
- **GitHub Pages URL**: `#`

### 9. WRITER按鍵錄製精靈
- **ID**: `writer`
- **Title**: `WRITER按鍵錄製精靈`
- **Badge**: `Active`
- **Gradient**: `var(--grad-emerald-cyan)`
- **Description**: `專為TeraTerm終端機設計,錄製操控WRITER時的按鍵記憶巨集`
- **Details**:
  - `功能待開發`
- **Dev URL**: `#`
- **Local Path**: `#`
- **GitHub Pages URL**: `#`
