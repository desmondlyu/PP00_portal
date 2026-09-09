# JB Booking Three.js Floor Plan 設計規格

## 目標

將 JB Booking 的 Floor Plan 純視覺層改為 Three.js 等角 3D 工廠平面圖，以立體方塊代表既有機台。移除目前的機台圖片、工程師人物模型與人物移動效果；保留既有機台文字、預約狀態、座標 mapping 與點擊預約流程。

本次不是 JB Booking 重構。Booking business logic、API、backend、資料格式、路由、Calendar、權限與其他 UI 均視為 immutable。

## 核准的視覺方向

- 採用等角工廠方塊風格，不使用圖片機台。
- 使用固定 `OrthographicCamera`，預設不自動旋轉。
- 每台機台使用具有 top、front、side 明暗面的 `BoxGeometry`。
- T 系列與 Ms 系列只以幾何比例與面板細節區分：
  - T 系列：較高、較窄的測試機台。
  - Ms 系列：較寬、較低的主機箱。
- 地面保留既有平面比例與走道配置，增加細緻網格與低對比工廠地面材質。
- hover 只做輕微抬升、亮度與陰影變化。
- 機台名稱與「可預約／N 筆預約」維持 DOM overlay，避免 3D 文字在小尺寸下難以閱讀。
- 移除工程師 idle／running sprite、人物移動動畫與相關 DOM。

## 架構與檔案邊界

預計只修改隔離工作樹中的 Floor Plan presentation layer：

- `tool/JB_booking/static/js/floor-plan-3d.js`
  - Three.js 場景建立與釋放。
  - `Scene`、`OrthographicCamera`、`WebGLRenderer`、燈光、地板與機台 mesh。
  - `Raycaster` hover 輔助。
  - renderer resize 與 responsive camera 更新。
- `tool/JB_booking/static/js/app.js`
  - 只在 `renderFloorPlan(date)` 建立或更新 3D 視覺層。
  - 保留既有 `slot`、`machineAppointments`、`has-booking`、座標與 click callback。
  - 原 click callback 仍呼叫 `openAppointmentModal(slot.tester, dateStr)`。
- `tool/JB_booking/static/css/style.css`
  - Floor Plan canvas、DOM overlay、hover 狀態與 responsive 呈現。
  - 移除目前圖片機台與人物視覺規則。
- `tool/JB_booking/static/js/vendor/three.module.js`
  - 本地 Three.js module，避免預覽與部署依賴 CDN 或外部網路。

不修改 `index.html` 的既有入口結構、`config.js`、backend、API、資料 schema 或其他工具。

## 資料與互動契約

### 不可變資料來源

- `floorLayoutTesters` 仍是機台 layout 的來源。
- `FLOOR_PLAN_BLOCK_SIZE` 仍決定既有機台展示尺寸與點擊區。
- `slot.tester` 是唯一 machine identity。
- `slot.x` 與 `slot.y` 是唯一機台位置來源。
- `appointments[dateStr][slot.tester]` 仍決定預約文字與既有 `has-booking` 判斷。

Three.js 不重新判斷 booking state，只接收已完成判斷的展示狀態。

### 點擊與可用性

既有機台 button 與文字 overlay 保留作為可存取的 DOM 操作層。3D mesh 是主要視覺，不取代既有 booking handler。點擊機台後仍使用原本的 `openAppointmentModal(slot.tester, dateStr)`，不改變 modal、資料流或使用者流程。

Raycaster 僅用於 hover 與視覺回饋。若 WebGL 初始化失敗，DOM overlay 仍可顯示機台名稱與狀態並維持點擊預約。

## Responsive 與效能

- renderer 尺寸以 Floor Plan 容器實際尺寸更新，不以整個 viewport 尺寸取代原版 layout。
- 桌面版使用完整等角視角。
- 小螢幕保留既有可讀性與水平捲動策略，不能讓機台 overlay 失去點擊能力。
- 不使用連續相機旋轉；只在 hover 或必要 resize 時更新視覺。
- 只建立既有機台數量的 mesh，避免不必要的高面數模型。

## Fail-safe

- Three.js module 載入或 WebGL 初始化失敗時，不攔截既有 DOM rendering 與預約 click。
- 不在 Three.js 模組中呼叫 API、修改 appointments 或判斷權限。
- 不修改原始使用者提供的參考圖片；本次視覺層移除其使用，不刪除工作區外的檔案。
- render 重新執行時先清理前一個 renderer、scene 與事件 handler，避免重複 canvas、記憶體洩漏或舊日期資料殘留。

## 驗證計畫

1. 靜態檢查：
   - 21 個既有 tester ID 與順序不變。
   - `slot.x`、`slot.y`、`FLOOR_PLAN_BLOCK_SIZE` 未變更。
   - `appointments[dateStr][slot.tester]` 與 `has-booking` 契約未變更。
   - `openAppointmentModal(slot.tester, dateStr)` 簽名與呼叫保留。
2. Three.js 顯示：
   - T／Ms mesh 數量與 tester layout 一致。
   - 等角鏡頭、地板、陰影、hover 與狀態色正常。
   - 機台名稱與預約文字完整可讀。
3. 互動：
   - 桌面與小螢幕點擊機台都能開啟原預約 modal。
   - 已預約機台仍顯示原本的預約數量文字。
   - WebGL 失敗時 DOM fallback 仍可操作。
4. 回歸：
   - Calendar、其他 UI、API/data flow 與 console 不新增錯誤。
   - 只在 `design/jb-booking-playful` 隔離分支驗證，不合併、不推送。

