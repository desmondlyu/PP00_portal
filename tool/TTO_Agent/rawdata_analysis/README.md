## 系統介紹

本工具用於分析 NOR Flash CP 測試資料，提供：
- 站點與產品維度的統計比較
- 單一統計報表中的 Group 分層展開（Group → Test Item）
- 模擬欄位調整後的即時圖表變化

重點頁面包含：
1. **統計圖表**
2. **統計報表**
3. **Site / Touch Down 熱圖**

---

## 操作方式

1. 匯入資料（資料夾、TXT 或匯入既有 XLSX）。
   - 多產品資料夾建議格式：

```text
資料夾根目錄/
├─ AAG106/
│  ├─ RW_*_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS/
│  │  └─ home/*/rawdata/*.TXT
│  └─ ...
├─ EAG119/
│  ├─ RW_*_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS/
│  │  └─ home/*/rawdata/*.TXT
│  └─ ...
└─ FAG102/
   └─ RW_*_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS/
      └─ home/*/rawdata/*.TXT
```

2. 選擇要分析的產品與站點後按「開始分析」。
3. 在「統計圖表」可查看：
   - 測試項圖表
   - 群組化圖表
4. 在「統計報表」中先看 Group 彙總列，再按 `+` 展開該 Group 的 Test Item 詳細值與模擬欄位。
5. 需要模擬時，在展開後的 Test Item 輸入「模擬 Mean / 模擬 Range」，圖表會同步更新。
6. 需要回到原始值時，按「重置模擬」。

### 步驟三(Option)：關鍵字分析（功能目的）

- 目的 1：快速從大量 RAWDATA 中，鎖定你指定關鍵字的命中內容，減少人工逐行檢查時間。
- 目的 2：把命中結果直接對應到站點、Site、UTL_DUT、BIN，讓異常現象可直接定位到測試脈絡。
- 目的 3：可搭配 BIN 篩選，專注在特定 Bin 的命中事件，提升問題追查效率。
- 目的 4：此功能定位為「分析輔助視窗」，主要用於快速排查與比對，不影響既有統計與模擬流程。

---

---

## 統計報表介紹

### Group 分層顯示
- 第一層：`Group` 彙總列（依 Mapping 將 Test Item 併入群組）
- 第二層：展開後顯示 `Test Item` 明細與模擬欄位

### Group 統計邏輯
- Group 總測試時間（欄位顯示在 `Mean(s)`）：
  - `Group TT Total(s) = Σ(Mean_i × Count_i)`
- Group TT Ratio/站點(%)：
  - `Group TT Ratio(%) = Group TT Total / Σ(Mean_j × Count_j) × 100`
- 其中 `i` 為該 Group 內的 Test Item，`j` 為該站點全部 Test Item。

### Test Item 模擬統計邏輯
- `Scenario Effective Mean = Scenario Mean × (Scenario Range / Base Range)`（Base Range = 0 時倍率視為 1）
- `Scenario TT Ratio(%) = Scenario Effective Mean × Count / Σ(Base Mean × Count) × 100`
- 分母固定為 Baseline 站點總量，因此只會反映被調整項目，不會因分母連動影響其他項。

---

## 重要說明

1. 模擬值只影響畫面計算，不會改動原始資料。
2. 群組化規則已內建於程式靜態檔，不需讀取外部 Mapping 檔。
3. 匯出結果以系統當前支援內容為準；若未看到預期欄位，請先確認目前版本說明。

---

## 常見問題

### Q1：為什麼統計報表的 Group 會出現「未分組」？
A：代表該站點下的 Test Item 沒命中內建對照規則，或名稱不完全一致。

### Q2：為什麼降低百分比圖沒有 bar？
A：通常是尚未在對應報表輸入模擬值，或篩選條件把產品過濾掉。

### Q3：我只改一個產品，為什麼看不到其他產品 bar？
A：目前圖表會保留所有產品。未輸入模擬值的產品會以 `0%` 顯示；有輸入模擬值的產品會顯示對應縮減比例。

### Q4：為什麼 Group 列沒有模擬輸入框？
A：Group 僅做彙總，模擬調整在展開後的 Test Item 層操作，Group 會即時反映彙總結果。

### Q5：如何快速恢復原始結果？
A：按「重置模擬」即可。

---

## 版本歷史

| 版本 | 日期 | 說明 |
|---|---|---|
| 1.0 | 2026-05-27 | 初版上線 |
| 1.5 | 2026-05-29 | 新增模擬欄位、降低百分比圖、多產品比較 |
| 1.6 | 2026-05-29 | 新增群組化圖表與群組化報表（雙標籤） |
| 1.7 | 2026-05-29 | 新增群組化報表專用降低百分比圖，並修正僅顯示有模擬變更產品的 bar |
| 1.8 | 2026-05-29 | 統計報表改為 Group 分層展開（Group→Test Item），移除群組化報表模擬圖與報表分頁，補充統計公式 |
| 1.9 | 2026-06-01 | 新增步驟三(Option)關鍵字分析用途說明與操作目的描述 |
