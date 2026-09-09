# JB Booking 3D 走道與設備層設計

## 目標

將走道與 `PC/設備/烤箱` 建立為 Three.js 平面物件，讓機台、設備與環境區塊使用同一套世界座標與投影系統，避免 DOM 百分比位置和 3D 投影位置互相重疊。

## 視覺

- 四條走道使用低高度、透明淺青灰色 3D 平面。
- `PC/設備/烤箱` 使用相同材質，但以略不同透明度區分用途。
- 不建立厚重底板、圍牆或額外框架。
- 原本「走道」與 `PC/設備/烤箱` 文字保留，由 DOM label 投影到對應 3D 物件中心。
- 平面物件不攔截滑鼠、不參與 tester hover、點擊或 Booking。

## 相對定位

- 走道與 PC layer 由原本 `FLOOR_PLAN_STATIC_BLOCKS` 的 x、y、w、h 建立，不修改資料格式。
- 機台仍保留原始 tester ID 與 x/y mapping。
- 最下方第一排以最下方走道的 3D 邊界為基準，放在走道下方並保留安全間距。
- 第二排以第一排 3D footprint 的下緣為基準再往下排列。
- 第一排銘牌顯示在機台上方；第二排銘牌維持在機台下方。
- UF3000 與 Auto Hander 文字採用與所在列相同的銘牌方向。

## 邏輯邊界

- 不修改 appointments、Supabase、API、Booking state 或 `openAppointmentModal()`。
- 不修改 `FLOOR_PLAN_TESTER_SLOTS` 的 tester 名稱與原始座標。
- Three.js presentation module只接收既有 machines 與 staticBlocks。
- 走道與 PC layer 不加入 raycaster targets。
- 若 WebGL 載入失敗，原始 DOM static blocks 與 tester buttons 仍可作為 fallback。

## 驗證

- 21 台 tester 與 ID mapping 不變。
- 最上方走道與 PC layer 之間有可見間距。
- 最下方第一排完全位於走道下方。
- 第二排與第一排銘牌不重疊。
- 四條走道與 PC layer 可見但透明、不干擾辨識。
- tester 點擊仍開啟既有預約視窗。
- 桌面與 700px 寬度無新增水平溢出。
