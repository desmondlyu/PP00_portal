# JB Booking 七欄平面圖網格設計

## 目標

依使用者提供的配置圖，將 PP00 平面圖改為固定七欄的 Three.js presentation grid。所有機台、設備、走道、PC/設備/烤箱與管線共用同一套網格與投影座標，避免圖層重疊。

## 架構

- 新增獨立的 presentation-only `visualGrid`。
- `visualGrid` 以 tester ID 或設備名稱對應列與欄。
- 不修改 `FLOOR_PLAN_TESTER_SLOTS` 的 tester、x、y 或 Booking mapping。
- `floor-plan-3d.js` 根據 `visualGrid` 建立與排列 3D 物件。
- `app.js` 保留原本 tester button、Booking click handler 與狀態資料，只接收投影位置。

## 固定七欄配置

每一機台列使用七個等寬欄位；空白欄位必須保留，不得自動補位。

| 順序 | 類型 | 欄 1 | 欄 2 | 欄 3 | 欄 4 | 欄 5 | 欄 6 | 欄 7 |
|---|---|---|---|---|---|---|---|---|
| 1 | 走道 | 橫跨七欄 |  |  |  |  |  |  |
| 2 | PC/設備/烤箱 | 橫跨七欄 |  |  |  |  |  |  |
| 3 | 機台列 | T5833-2 | T5830ES_WBN12 | 點針座2 | Ms3490#3 | T5830ES_WBN10 | T5385ES_WBN1 | UF3000 |
| 4 | 走道 | 橫跨七欄 |  |  |  |  |  |  |
| 5 | 機台列 | T5833-3 | Ms3490#2 | UF3000 | T5830ES_WBN15 | T5385ES_WBN6 | 點針座1 | Ms3480#1 |
| 6 | 管線 | 橫跨七欄 |  |  |  |  |  |  |
| 7 | 機台列 | T5385ES_PT22 | T5833-4 | T5833-5 | T5830ES_WBN11 | 空白 | T5830ES_WBN3 | UF3000 |
| 8 | 走道 | 橫跨七欄 |  |  |  |  |  |  |
| 9 | 機台列 | 空白 | T5833-6 | T5833-1 | UF3000 | T5830ES_WBN8 | UF3000 | 空白 |
| 10 | 管線 | 橫跨七欄 |  |  |  |  |  |  |
| 11 | 機台列 | 空白 | 空白 | T5781-3 | Auto Hander | T5781-2 | 空白 | 空白 |

實際 tester ID 保留完整名稱，例如 `T5833-6(.98)`、`T5830ES_WBN8(.75)`。

## 視覺

- 走道：低高度、透明淺青灰 3D 平面，保留「走道」文字。
- PC/設備/烤箱：低高度、透明淺青灰平面，透明度略高於走道，保留文字。
- 管線：較窄的透明淺藍灰平面帶，保留「管線」文字。
- 所有文字使用對應 3D 物件的投影中心，不再用獨立百分比猜位置。
- 機台與設備置中於各自欄位；同一列共用水平 baseline。
- 機台銘牌不得跨入走道或管線列。

## 互動與資料邊界

- tester ID、Booking state、appointments 與 click handler 不變。
- 走道、PC 與管線不加入 raycaster target，不接收點擊。
- UF3000、點針座與 Auto Hander 僅為視覺物件。
- WebGL 失敗時保留 DOM fallback。
- 不新增 Three.js 之外的相依套件。

## Responsive

- 桌面版完整呈現七欄。
- 小螢幕沿用目前可縮放／容器裁切策略。
- 不新增 document-level 水平 overflow。
- tester button hitbox 必須仍與機台投影位置一致。

## 驗證

- 21 台 tester 均存在且 ID 唯一。
- 每列內容與空白欄位符合配置表。
- 走道、PC 與管線文字及透明物件對齊。
- 機台與走道／管線無重疊。
- tester click 仍呼叫 `openAppointmentModal(slot.tester, dateStr)`。
- Booking、API、Calendar、權限與其他 UI 不受影響。
