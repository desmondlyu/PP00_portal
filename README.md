# PP00 Tool Portal

這是為 **PP32 YPLu (Desmond Lyu)** 量身設計的工具入口網站。
本平台整合了多項半導體測試數據分析與機台預約管理工具，提供直覺、高效的離線單網頁整合操作體驗。

---

## 📂 專案架構（自包含目錄結構）

所有子工具皆收納在 `PP00_Portal/tool/` 下，Portal 與子工具形成**自包含的單一目錄結構**，方便整包複製、搬移或部署。

```
PP00_Portal/
├── index.html                      <-- 打包好的入口網頁 (雙擊可開啟)
├── package.json
├── vite.config.js
├── MEMORY.md                       <-- AI Session 專案記憶
├── README.md
├── src/                            <-- 入口網站原始碼
│   ├── index.html                  <-- 開發用 entry 網頁 (npm run dev)
│   ├── App.jsx                     <-- 卡片配置與主程式
│   ├── main.jsx                    <-- React 進入點
│   └── index.css                   <-- 全域樣式
├── public/
│   └── logo.png
└── tool/                           <-- ★ 子工具專案集中目錄（僅部署用檔案，依各工具 .gitignore 白名單篩選）
    ├── TTO_Agent/
    │   └── rawdata_analysis/
    │       ├── index.html
    │       ├── css/style.css
    │       ├── js/                 <-- app.js, groupingRules.js, kpiCompareReact.js, siteTdHeatmapReact.js
    │       └── assets/             <-- example.png, wafer screenshot
    ├── JB_booking/
    │   ├── index.html
    │   ├── static/css/style.css
    │   ├── static/js/              <-- app.js, config.js
    │   └── supabase/schema.sql
    ├── DL_to_Excel/
    │   ├── index.html
    │   ├── libs/                   <-- jszip.min.js, parser.js, xlsx.full.min.js
    │   ├── docs/                   <-- 設計與計畫文件
    │   └── samples/                <-- 範例 datalog 檔案
    ├── CZ_dataset/
    │   └── index.html              <-- 單檔部署（所有邏輯內嵌）
    ├── CP_DL_Analysis/
    │   └── index.html              <-- 單檔部署（所有邏輯內嵌）
    └── Yield_Summary/
        ├── index.html
        ├── css/style.css
        ├── js/                     <-- cp_tool.js, ft_tool.js
        └── libs/xlsx.full.min.js
```

### 🔗 部署與路徑說明
- **自包含結構**：所有子工具位於 `tool/` 子目錄內，路徑統一使用 `./tool/...` 相對路徑。無論是 `file://` 雙擊開啟或部署至 Web 伺服器，都能正確載入。
- **僅保留部署檔案**：`tool/` 下的內容已依照各子工具的 `.gitignore` 白名單規則篩選，僅保留 GitHub Pages 部署所需的檔案（HTML、CSS、JS、assets），不含開發原始碼、Python 腳本、node_modules、.git 歷史等。
- **獨立修改**：直接在 `tool/` 下編輯對應工具的前端檔案即可。若需修改開發原始碼，請至 `web_app/` 下對應的原始專案資料夾。
- **GitHub Pages**：部署時各工具透過同一目錄下的相對路徑在 iframe 中無縫載入。

---

## 🔬 涵蓋功能與對應專案介紹

本入口網站共收納了以下六大核心工具，對應之 GitHub 儲存庫與詳細特色如下：

### 1. [CP Rawdata/TTO 分析工具](https://github.com/desmondlyu/rawdata_analysis) (`tool\TTO_Agent\rawdata_analysis`)
*   **定位**：NOR Flash CP 測試資料分析系統。
*   **核心功能與特色**：
    *   **多維度統計比較**：提供站點與產品維度的統計圖表、報表及 Site / Touch Down 熱圖。
    *   **Group 分層展開**：首創在單一報表內實現雙層嵌套結構（`Group` 彙總列 → 展開至 `Test Item` 明細與模擬欄位）。
    *   **即時數據模擬**：可在 Test Item 層輸入模擬的 Mean / Range，系統會即時重新計算縮減比例，並同步更新「降低百分比」等圖表，重置按鈕可隨時還原原始數值。
    *   **關鍵字分析輔助**：可快速從海量 RAWDATA 中鎖定特定關鍵字命中內容，並直接對應到站點、Site、UTL_DUT、BIN 測試脈絡，快速追查異常。

### 2. [FT 特性分析工具](https://github.com/desmondlyu/cz_analysis) (`tool\CZ_dataset`)
*   **定位**：晶片特性驗證測試報告本地端 React 互動式分析儀表板。
*   **核心功能與特色**：
    *   **批次 Excel 解析**：支援拖曳上傳多個 PP22 特性報告 Excel，自動辨識並解析 25°C、90°C、130°C、-45°C 等不同溫度分頁，整合 VCC、VIO 等量測條件與實測值。
    *   **良率與邊際裕度檢核**：
        *   **Out of Datasheet Spec**：彙總判定為 `Fail` 的失效項目。
        *   **Pass but Spec is Marginal**：篩選出判定為 `Pass` 但邊際良率裕度不足 5% 的項目，提供良率防範警示。
    *   **高密度網格即時編輯**：網格內可直接修改實測值與規格限制， Verdict 與 Ratio 會自動重算並以**黃色背景高亮標註**變更狀態。
    *   **雙層巢狀水平降序圖表**：圖表以外層依 alignment、內層依溫度 Temp 水平並排展示，實測值自動降序排列，方便對照高值數據。
    *   **無損公式 Excel 導出**：導出的 Compare 工作表內嵌 dynamic formulas（IF/ABS/OR/UPPER），在 Microsoft Excel 中修改規格限，Verdict 與 Ratio 依然會隨公式自動重新運算。

### 3. [CP DL 分析工具](https://github.com/desmondlyu/CP_DL_Analysis) (`tool\CP_DL_Analysis`)
*   **定位**：100% 離線執行半導體測試數據與 CP 晶圓失效地圖 (Wafer Map) 分析工具。
*   **核心功能與特色**：
    *   **100% 本地端離線運作**：所有資料解析、計算與圖表渲染皆在瀏覽器中完成，保證晶圓機密數據安全無虞。
    *   **雙向框選聯動 (雙向過濾關鍵特色)**：
        *   **晶圓空間框選 (Spatial Filter)**：在晶圓圖上拉框可鎖定特定 Die 區域，其餘三張統計圖表（相關性散佈圖、直方圖、箱形圖）會同步更新。
        *   **圖表高亮同步 (Highlight Sync)**：在統計圖表上拉框，晶圓圖對應的點位會立即亮起紅色外框，方便定位異常點的物理分佈。
    *   **多維度數據統計圖表**：包含 Pearson R 相關係數分析、線性趨勢線、分佈箱形圖、頻率直方圖，並支援 X/Y 軸 Log Scale 切換。

### 4. [PP00 JB Lab 借機系統](https://github.com/desmondlyu/JB_booking) (`tool\JB_booking`)
*   **定位**：PP00 測試機台預約管理系統。
*   **核心功能與特色**：
    *   **雙重視角切換**：支援傳統「卡片日曆模式」與「大框架現場平面圖模式」的一鍵切換。
    *   **現場機台一致性對照**：平面圖大框架包含 `T*` 與 `Ms*` 等現場 21 台機台（排除 `T5781-4(.34)`），與預約清單一比一對應。
    *   **時段防重疊檢驗**：預約時段若與既有紀錄重疊，系統會立刻跳出警告。
    *   **安全身份識別**：編輯與刪除功能限制僅能由建立該預約的同一台電腦進行，防止預約被他人誤改。

### 5. [CP Datalog-to-Excel 轉換器](https://github.com/desmondlyu/DL_to_Excel) (`tool\DL_to_Excel`)
*   **定位**：CP 測試 Datalog 轉換為 Excel 報表工具。
*   **核心功能與特色**：
    *   **Datalog 解析**：支援 CP Datalog 資料解析與欄位提取。
    *   **自動排版**：格式化排版，將雜亂數據整理為易讀格式。
    *   **一鍵導出 Excel**：自動生成標準 Excel 報告。

### 6. [CP/FT Yield Auto Summary](https://github.com/desmondlyu/Yield_Summary) (`tool\Yield_Summary`)
*   **定位**：CP/FT 良率自動彙總報表工具。
*   **核心功能與特色**：
    *   **支援 CP/FT 數據**：相容 CP 與 FT 的良率報告格式。
    *   **多維度良率彙總**：支援產品、批次與站點等多維度的良率對比與彙總。
    *   **一鍵生成自動報表**：自動格式化並產生可視化良率彙總分析報表。

---

## 📄 版權與許可
*   **Author**: PP32 YPLu (Desmond Lyu)
*   **Licence**: MIT License
*   **Copyright**: Copyright © 2026 PP32 YPLu (Desmond Lyu). All rights reserved.
