# Dashboard Layout Redesign

## Goal

重新整理 T5830 Dashboard 的「核心戰情總覽」與「多維度旭日圖」版面，讓每個視覺區塊有一致的寬度、層級與產品對應關係。

## Approved layout

### 核心戰情總覽

依序排列以下區塊：

1. **跨產品時間結構對比**
   - 使用整個 Dashboard content frame 的最大寬度。
   - 以單一 `1 × 1` 區塊呈現。
   - SVG 繪圖區填滿外框可用寬度；產品數較少時柱狀圖仍平均分布，不在左側留下大面積空白。
   - 產品數較多時保留最小繪圖寬度，允許水平捲動。
   - 保留現有跨產品堆疊時間圖資料與圖例，不改變計算邏輯。

2. **多維度旭日圖與關聯樹**
   - 以產品為單位建立可重排的 responsive grid。
   - 每個產品使用一張固定結構卡片。
   - 卡片內依序顯示該產品的旭日圖與自己的關聯樹。
   - 桌面寬度採 `N × N` 網格；窄螢幕自動降為單欄。
   - 關聯樹仍維持預設收合與 Mode → Operation → Test Item → Original Item 階層。

3. **時間與次數樞紐分析總表**
   - 維持 Python 風格跨產品 Pivot Table。
   - 時間與次數各自一張表，桌面寬度並排，窄螢幕上下排列。
   - 列為 `Test_Item_Merged`，欄為產品。
   - 保留產品欄總計與最下方總計列。
   - 每張 Pivot Table 的水平捲軸在表格上方與下方同步顯示，方便瀏覽寬表格。
   - 既有排序、數值與彙整邏輯不變，只調整容器與排版。

### 多維度旭日圖分頁

- 同樣使用產品卡片 grid。
- 每張產品卡片內固定放置該產品旭日圖與對應關聯樹。
- 不再將所有旭日圖集中一區、所有關聯樹集中另一區，避免產品與樹狀資料視覺上脫鉤。
- 旭日圖繪圖資料、Mapping 對應與關聯樹展開行為維持不變。

## Component and data boundaries

- `OverviewTab` 負責總覽區塊順序與版面容器。
- `SunburstTab` 負責產品分組與產品卡片排列。
- `SingleSunburst` 負責單一產品旭日圖繪製。
- `SunburstTree` 負責單一產品關聯樹。
- `StackedTimeBars` 保留現有資料計算，只套用全寬容器。
- 時間與次數 Pivot Table 元件保留既有資料呈現邏輯，只統一外層 grid 與表格樣式。
- 共用排版樣式集中於 `global.css`，不新增 UI 套件或重複的 inline layout。

## Responsive behavior

- 桌面：時間圖全寬；產品卡片依可用寬度形成兩欄以上 grid；Pivot Table 並排。
- 平板：產品卡片降為單欄或雙欄，由 CSS `minmax()` 決定。
- 手機：所有區塊單欄；表格保留水平滾動，避免壓縮欄位造成資料難讀。
- Pivot Table 上下捲軸保持同步，且不改變既有收合狀態。

## Error and empty states

- 無資料時沿用目前各元件的「無資料」訊息。
- 某產品沒有可繪製資料時，只在該產品卡片顯示空狀態，不影響其他產品卡片。
- 不改變既有篩選、Mapping 匯入、匯出與加密檔案錯誤處理。

## Verification

- 更新 Overview 與 Sunburst 相關元件測試，確認區塊順序、產品卡片與對應關聯樹存在。
- 新增時間圖全寬繪圖與 Pivot Table 上方捲軸同步的互動／結構驗證。
- 執行 T5830 現有完整測試。
- 執行 `npm run build`，確認 Portal 使用的 `dist/index.html` 指向最新 bundle。
