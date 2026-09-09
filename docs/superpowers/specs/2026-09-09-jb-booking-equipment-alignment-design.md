# JB Booking UF3000／點針座 3D 設備與排版校正設計

## 目標

在既有 Three.js Floor Plan presentation layer 中，將 `UF3000` 與 `點針座1/2` 從低高度 generic block 改成可辨識的 3D 設備造型，並修正每排機台的視覺水平基線與框架邊界。

這不是 JB Booking 重構。Booking logic、API、資料格式、預約狀態判斷、machine ID mapping、使用者流程、Calendar、權限、路由與其他 UI 均視為 immutable。

## 已確認的設計決策

### 1. 變更邊界

主要變更限定於：

- `tool/JB_booking/static/js/floor-plan-3d.js`
- `tool/JB_booking/static/js/app.js`（只補充投影後的 DOM 銘牌定位與隱藏重複 frame outline）
- `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`
- `tool/JB_booking/static/css/style.css` 不預期需要修改；只有在瀏覽器驗證確認 3D canvas 與既有 label layer 發生層級遮擋時，才可調整 `.floor-plan-3d-host`、`.floor-plan-label-layer` 或其子元素的 presentation-only `z-index`／pointer-events。

`renderFloorPlan()` 的既有資料流保持不變；新增的 `onLayout` callback 只更新 Floor Plan presentation position／visibility：

```js
const dateAppointments = appointments[dateStr] || {};
const machineAppointments = dateAppointments[slot.tester] || [];
const hasBooking = machineAppointments.length > 0;
openAppointmentModal(slot.tester, dateStr);
```

Three.js 只接收已建立的 `machineRecords` 與 `FLOOR_PLAN_STATIC_BLOCKS`，不讀取 appointment global、不呼叫 API、不判斷 booking state。

### 2. 設備造型

新增 `createEquipmentMesh(blockDef)`，依 `blockDef.label` 選擇 presentation-only 造型：

- `UF3000`
  - 較高箱體
  - 上方控制面板
  - 前方門板／接口細節
  - 底部固定在設備 block 對應的 layout baseline
- `點針座1`／`點針座2`
  - 較矮底座
  - 垂直探針柱
  - 上方 probe head
  - 底部固定在設備 block 對應的 layout baseline
- 其他 `device`
  - 使用安全的低高度設備基座，不新增 booking 行為。

設備仍保留原本 DOM label 的文字敘述；3D mesh 不取代 label，也不成為 tester button。

### 3. 機台排版校正

新增 `createLayoutMetrics(staticBlocks, machines)`，只計算 3D world layout：

- 將原始 `slot.y` 以容差分組為視覺 row。
- 同 row 使用相同的 world Z 底部基線。
- 保留原始 `slot.x` 對應的相對水平位置。
- 所有 machine／equipment mesh 以底部對齊，不以中心點對齊。
- 高度差只向上延伸，不改變 row baseline。

此校正不修改 `slot.x`、`slot.y`、DOM button 的 CSS position、tester ID 或 booking mapping。

### 4. 框架邊界

從 `FLOOR_PLAN_STATIC_BLOCKS` 的 `kind: 'frame'` 計算可用 floor bounds，並保留 presentation inset：

- Three.js 只建立一個由所有原始 frame bounds 包絡出的 unified floor frame；不再將每個 `frame` block 各自渲染成獨立 3D 方塊。
- mesh footprint 不得超過 frame 的 X／Z 邊界。
- UF3000 的上方面板與點針座的 probe head 需納入 bounds。
- 建立 mesh 後先以 frame inset clamp group 的 X／Z 中心；若造型 footprint 仍超過可用範圍，再按同一比例縮小該 group 的 footprint，直到 geometry 完整落在 bounds 內；不得改變原始百分比資料。
- shadow 可以視覺淡出框架，但 geometry 不得越過框架。

### 4.1 銘牌投影對齊

DOM tester／設備銘牌仍保留原本文字、尺寸與可存取 button，但不再只依 2D 百分比猜測 3D 物件位置。Three.js 於 camera resize 後將 machine／device anchor 投影為 host pixel position，由 `renderFloorPlan()` 將銘牌中心同步到同一個投影座標。

- tester ID、button click handler、booking state 與資料 mapping 不變。
- 空的 DOM frame outline 隱藏，避免與 unified 3D frame 疊出拆開的雙重框架。
- 無法取得 WebGL layout 時，既有 DOM 百分比定位仍作為 fallback。

### 5. 互動與失敗安全

- Three.js hover 仍透過 Raycaster 更新 3D mesh 與 DOM `.is-hovered`。
- 真正 click target 仍為原本透明／可存取 `.tester-block` button。
- `openAppointmentModal(slot.tester, dateStr)` 呼叫契約不變。
- WebGL 初始化失敗時，DOM label／button layer 仍可操作。
- 不新增人物、圖片、移動動畫或其他 booking-adjacent state。

### 6. Responsive

維持既有 Floor Plan stage 尺寸與小螢幕水平捲動策略：

- desktop 顯示完整等角 3D floor。
- mobile 不改 button overlay 的原始比例與可點擊區域。
- 3D camera 依 host resize 更新，但不改 floor data mapping。

## 驗證策略

### 靜態 contract

更新 `threejs-floor-contract.test.mjs`，確認：

- 21 台 tester ID 唯一且原始座標不變。
- `createEquipmentMesh`、UF3000、點針座造型元件存在。
- `createUnifiedFrame`、scene projection、layout metrics、row baseline、frame bounds contract 存在。
- `app.js` 仍保留 appointments lookup、booking state 與 `openAppointmentModal` 呼叫。
- 不重新引入人物、圖片或外部 Three.js CDN。

### 執行驗證

- 現有 route／layout regression test。
- app.js 與 floor-plan-3d.js 語法檢查。
- `git diff --check`。
- 瀏覽器 desktop：確認 UF3000／點針座為 3D、每排底部水平、所有 geometry 位於 frame 內。
- 瀏覽器 mobile：確認 canvas resize、DOM button 數量與點擊能力。
- 左側與右側 tester click：確認原 modal、tester ID、日期與預約資料流不變。
- console：確認沒有本次新增的 JavaScript error。

## 不在範圍內

- 不修改 backend、API、Supabase、schema 或 appointment 資料。
- 不修改 booking state 判斷。
- 不修改 route、Calendar、權限或其他 UI。
- 不新增 Blender、人物、圖片資產、外部 CDN 或新的 3D 引擎。
- 不合併到 main，不推送 remote。
