# CP/FT VSC Yield Summary — 操作說明

### 使用前：登入 PP00 Portal
請先登入 PP00 Portal，再從 Portal 開啟本工具。WEC Token 存放在 Supabase，只有 Portal 白名單帳號（`portal_accounts.can_use_wec`）登入後才能取得；未登入時，狀態燈會顯示「請先登入 PP00 Portal」。

### 使用前：啟動代理程式
在 GitHub Pages (HTTPS) 開啟工具時，頁面上方會出現代理程式提示框。點選「下載 proxy.bat」與「下載 proxy.py」，存到本機同一個資料夾，雙擊 `proxy.bat`，保持視窗開啟後再擷取資料。第一次執行時，若未安裝 Python，`proxy.bat` 會自動安裝。

### 1. 填寫查詢資訊
- **輸入批號 (Lot No)**：填入欲分析之晶圓批號。
- **選擇時間範圍**：點選起訖日期以限縮分析時間。

### 2. 匯入檔案對應 (FT 部分)
- 上傳 **FT MSS Excel 檔案**，系統將自動 Mapping 測試項並產出 Yield 報表。

### 3. 解析與排序
- 點擊 **擷取資料**，系統會自動分析並將 **Top Yield Loss (失效率) 由大到小自動排序**。

### 4. 報表匯出
- 點擊 **匯出 Excel** 取得分析結果。
