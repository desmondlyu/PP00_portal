本入口網站共收納了以下十大核心工具，對應之 GitHub 儲存庫與詳細特色如下：

### 1. [CP Rawdata/TTO 分析工具]
*   **定位**：NOR Flash CP 測試資料分析系統。
*   **核心功能與特色**：
    *   **多維度統計比較**：提供站點與產品維度的統計圖表、報表及 Site / Touch Down 熱圖。
    *   **Group 分層展開**：首創在單一報表內實現雙層嵌套結構（`Group` 彙總列 → 展開至 `Test Item` 明細與模擬欄位）。
    *   **即時數據模擬**：可在 Test Item 層輸入模擬的 Mean / Range，系統會即時重新計算縮減比例，並同步更新「降低百分比」等圖表，重置按鈕可隨時還原原始數值。
    *   **關鍵字分析輔助**：可快速從海量 RAWDATA 中鎖定特定關鍵字命中內容，並直接對應到站點、Site、UTL_DUT、BIN 測試脈絡，快速追查異常。

### 2. [FT 特性分析工具]
*   **定位**：晶片特性驗證測試報告本地端 React 互動式分析儀表板。
*   **核心功能與特色**：
    *   **批次 Excel 解析**：支援拖曳上傳多個 PP22 特性報告 Excel，自動辨識並解析 25°C、90°C、130°C、-45°C 等不同溫度分頁，整合 VCC、VIO 等量測條件與實測值。
    *   **良率與邊際裕度檢核**：
        *   **Out of Datasheet Spec**：彙總判定為 `Fail` 的失效項目。
        *   **Pass but Spec is Marginal**：篩選出判定為 `Pass` 但邊際良率裕度不足 15% 的項目，提供良率防範警示。
    *   **高密度網格即時編輯**：網格內可直接修改實測值與規格限制， Verdict 與 Ratio 會自動重算並以**黃色背景高亮標註**變更狀態。
    *   **雙層巢狀水平降序圖表**：圖表以外層依 alignment、內層依溫度 Temp 水平並排展示，實測值自動降序排列，方便對照高值數據。
    *   **無損公式 Excel 導出**：導出的 Compare 工作表內嵌 dynamic formulas（IF/ABS/OR/UPPER），在 Microsoft Excel 中修改規格限，Verdict 與 Ratio 依然會隨公式自動重新運算。

### 3. [CP DL 分析工具]
*   **定位**：100% 離線執行半導體測試數據與 CP 晶圓失效地圖 (Wafer Map) 分析工具。
*   **核心功能與特色**：
    *   **100% 本地端離線運作**：所有資料解析、計算與圖表渲染皆在瀏覽器中完成，保證晶圓機密數據安全無虞。
    *   **雙向框選聯動 (雙向過濾關鍵特色)**：
        *   **晶圓空間框選 (Spatial Filter)**：在晶圓圖上拉框可鎖定特定 Die 區域，其餘三張統計圖表（相關性散佈圖、直方圖、箱形圖）會同步更新。
        *   **圖表高亮同步 (Highlight Sync)**：在統計圖表上拉框，晶圓圖對應的點位會立即亮起紅色外框，方便定位異常點的物理分佈。
    *   **多維度數據統計圖表**：包含 Pearson R 相關係數分析、線性趨勢線、分佈箱形圖、頻率直方圖，並支援 X/Y 軸 Log Scale 切換。

### 4. [PP00 JB Lab 借機系統]
*   **定位**：PP00 測試機台預約管理系統。
*   **核心功能與特色**：
    *   **雙重視角切換**：支援傳統「卡片日曆模式」與「大框架現場平面圖模式」的一鍵切換。
    *   **現場機台一致性對照**：平面圖大框架包含 `T*` 與 `Ms*` 等現場 21 台機台（排除 `T5781-4(.34)`），與預約清單一比一對應。
    *   **時段防重疊檢驗**：預約時段若與既有紀錄重疊，系統會立刻跳出警告。
    *   **安全身份識別**：編輯與刪除功能限制僅能由建立該預約的同一台電腦進行，防止預約被他人誤改。

### 5. [CP Datalog-to-Excel 轉換器]
*   **定位**：CP 測試 Datalog 轉換為 Excel 報表工具。
*   **核心功能與特色**：
    *   **Datalog 解析**：支援 CP Datalog 資料解析與欄位提取。
    *   **自動排版**：格式化排版，將雜亂數據整理為易讀格式。
    *   **一鍵導出 Excel**：自動生成標準 Excel 報告。

### 6. [CP/FT Yield Auto Summary]
*   **定位**：CP/FT 良率自動彙總報表工具。
*   **核心功能與特色**：
    *   **支援 CP/FT 數據**：相容 CP 與 FT 的良率報告格式。
    *   **多維度良率彙總**：支援產品、批次與站點等多維度的良率對比與彙總。
    *   **一鍵生成自動報表**：自動格式化並產生可視化良率彙總分析報表。
    *   **GitHub Pages 使用須知**：因瀏覽器 Mixed Content 限制，HTTPS 頁面無法直接呼叫內網 HTTP API。使用者需在公司電腦雙擊 `proxy.bat` 啟動本機 CORS 代理（Python 標準庫，零依賴，port 8780），工具端 JS 會自動偵測 HTTPS 環境並改走 localhost 代理。

### 7. [CP MSS 轉換工具]
*   **定位**：半導體測試規格自動轉譯與即時防呆編輯器。
*   **核心功能與特色**：
    *   **100% 本地安全防護**：所有測試條件本地運行, 機密資料絕不上傳。
    *   **智慧轉譯與迴圈偵測**：自動偵測 For 迴圈大括號結構以進行縮排，可選將迴圈項 `Test_NO` 自動設為 `600` 作為防呆著色標記；同時自動轉譯 Comment 註解鍵值對並映射至對應的 12 個 PE MSS 欄位。
    *   **即時格式校驗**：嚴格檢驗 16 進位欄位（如 Data_1~3, Start/End Address），錯誤欄位紅底白字高亮。
    *   **自訂 SPEC **：支援啟用 CP_Mapping 規格對照表自訂 SPEC 注入，並可切換「僅填補空白」或「覆蓋所有」模式。

### 8. [Dongle Auto Summary]
*   **定位**：Dongle Auto loader 自動化平台。
*   **核心功能與特色**：
    *   **多裝置匯出與 Cycling 整理**：支援多個 USB Device 匯出資料，並依據 Cycling 類型一次性整理產生報表。
    *   **本地日誌直接分析**：支援直接整理個人電腦上的 Dongle log 檔案，自動過濾符合 `COM*_log.txt` 命名的日誌檔案。
    *   **即時硬體狀態監控與寫檔**：整合 Web Serial API 建立多埠硬體即時監控，並利用 File System Access API 將日誌即時儲存至本機指定目錄。

### 9. [WRITER 按鍵錄製精靈]
*   **定位**：專為 LP56 燒錄控制設計，支援 CH340 自動連線、按鍵操作錄製與回放功能。
*   **核心功能與特色**：
    *   **網頁化連線**：使用 Web Serial API，免安裝額外終端機軟體，直接透過網頁進行串口連線。
    *   **測試流程錄製與回放**：支援完整記錄按鍵輸入與等待時間，並可匯出為 JSON 巨集檔案供日後回放測試。
    *   **多功能整合**：支援 Big5 編碼以防中文亂碼、終端機傳輸 Log 錄製下載，以及細緻的無光暈極簡白字顯示。

### 10. [自動化工程報告工具]
*   **定位**：工程實驗報告產生器
*   **核心功能與特色**：
    *   **自動化產圖**：自動產生 process corner split vs yield/loss/CZ 圖片。
    *   **自動化排版**：將後端匯出的圖表自動排版在Word File。
    *   **保留編輯權限**：工程師只要依照圖表，在報告上填寫結論即可完成。

### 11. [PP00 Knownledge Agent]
*   **定位**：PP00 內部知識型 Agent。
*   **核心功能與特色**：
    *   **知識搜尋**：包含測試、產品、製程等研發與製造相關知識檢索。
    *   **技能培訓**：提供新人訓練必須學習的課程與技能引導。
    *   **權限管轄**：僅限 PP00 專案團隊使用。

---

## 📄 版權與許可
*   **Author**: PP32 YPLu (Desmond Lyu)
*   **Licence**: MIT License
*   **Copyright**: Copyright © 2026 PP32 YPLu (Desmond Lyu). All rights reserved.

## 🔐 Portal 登入設定

Portal 登入使用 Supabase Edge Function 配對帳號代碼，再由 Supabase Auth 驗證密碼。使用者只需輸入 `PP00` 等帳號代碼，不需輸入 Email。

### Supabase 設定順序

1. 在 Supabase SQL Editor 執行 `supabase/migrations/20260904110000_create_portal_accounts.sql`。
2. 在 **Authentication → Users → Create new user** 建立下列內部 Auth Email：
   `pp00`、`pp11`、`pp12`、`pp31`、`pp32`、`pp21`、`pp22`、`pp23`、`pp40`、`pp41`、`pp42`、`pp50`、`pt22`、`pt12` 對應的 `@portal-internal.invalid` Email。
3. 所有 Portal Auth user 使用同一組管理者提供的密碼，並開啟 **Auto Confirm User**；`dannyowan@gmail.com` 不適用此規則。
4. 在 SQL Editor 執行 `supabase/setup/portal_accounts.sql`，建立帳號代碼與 Auth user 的私有對應。
5. 在 Dashboard 的 Edge Function 編輯器貼上 `supabase/setup/portal-login-dashboard.ts` 全部內容（Dashboard 僅支援單檔編輯），並關閉 **Verify JWT** 後部署；不要只貼 `supabase/functions/portal-login/index.ts`。
6. Edge Function 使用新版 Supabase API 金鑰：自動讀取 `SUPABASE_PUBLISHABLE_KEYS` 與 `SUPABASE_SECRET_KEYS` 的 `default` 金鑰；前端 `.env.local` 使用 `VITE_SUPABASE_PUBLISHABLE_KEY`。舊式 `anon/service_role` 僅保留相容讀取，不應再設定為主要金鑰。
7. 將 `PORTAL_ALLOWED_ORIGINS` 設為 `http://localhost:3100,http://127.0.0.1:3100,https://desmondlyu.github.io`。
8. 在本機 `.env.local` 將 `VITE_SUPABASE_ANON_KEY` 改成 Supabase **Settings → API Keys → Publishable key**，變數名稱改為 `VITE_SUPABASE_PUBLISHABLE_KEY`；不要把 Secret key 放進前端。
9. 本機測試時，在登入畫面輸入 `PP00`，不要輸入內部 Email。

### 系統管理後台設定

系統管理後台使用獨立的 Supabase Auth Session，不使用 Portal 的帳號代碼或 `portal-login` Function。目前唯一允許的後台帳號是 `dannyowan@gmail.com`。

1. 在 **Authentication → Users** 確認存在 `dannyowan@gmail.com`，並設定後台專用密碼；不可使用 Portal 帳號共用的密碼。
2. 確認該使用者的 Email 已驗證。
3. 在 SQL Editor 執行 `supabase/setup/admin_account.sql`，將該 Auth user 的 `app_metadata.role` 設為 `admin`。
4. 在 SQL Editor 執行 `supabase/migrations/20260904130000_restrict_tool_statuses_to_admin.sql`，將 `tool_statuses` 寫入權限限制為管理員角色。
5. 登出並重新登入後台一次，讓新的 JWT 載入 `app_metadata.role`。
6. 開啟「系統管理後台」，輸入完整 Email `dannyowan@gmail.com` 與後台專用密碼。
7. 後台 Toggle 成功寫入 `tool_statuses` 後，點選「安全登出」；Portal 主頁應保持登入。
8. 使用 Portal Header 的「登出」時，Portal 與後台 Session 才會一起清除。

目前只有一位管理員，因此不需要新增 `admin_accounts` table，也不需要部署 `admin-login` Edge Function。新增管理員時，應重新評估角色資料表與管理員管理流程。

Portal 與系統管理後台使用不同的瀏覽器 Session。後台的「安全登出」只會登出管理後台，Portal 主頁會保持登入；Header 的「登出」則會登出整個 Portal，並清除後台 Session。

密碼只由 Supabase Auth 儲存雜湊值；不要將密碼、service-role key 或其他秘密寫入此專案。
