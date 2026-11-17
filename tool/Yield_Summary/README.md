# CP/FT VSC Yield Summary — 操作說明

### 使用前：啟動代理程式
連上公司內網，將下列路徑貼到檔案總管：

```text
\\wectinfo02\PP00\yplu\Software\Yield_Summary\
```

將 `proxy.bat` 與 `proxy.py` 下載至本機同一個資料夾，雙擊 `proxy.bat`，保持視窗開啟後再擷取資料。

### 1. 填寫查詢資訊
- **輸入批號 (Lot No)**：填入欲分析之晶圓批號。
- **選擇時間範圍**：點選起訖日期以限縮分析時間。

### 2. 匯入檔案對應 (FT 部分)
- 上傳 **FT MSS Excel 檔案**，系統將自動 Mapping 測試項並產出 Yield 報表。

### 3. 解析與排序
- 點擊 **擷取資料**，系統會自動分析並將 **Top Yield Loss (失效率) 由大到小自動排序**。

### 4. 報表匯出
- 點擊 **匯出 Excel** 取得分析結果。
