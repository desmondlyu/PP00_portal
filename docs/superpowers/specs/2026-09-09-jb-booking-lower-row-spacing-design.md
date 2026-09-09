# JB Booking 下方機台列間距設計

## 目標

改善 PP00 平面圖最下方兩排機台與設備的銘牌擁擠問題，同時確保第一排不覆蓋最下方走道。

## 範圍

只修改 Floor Plan presentation layer。Booking 邏輯、API、資料流、機台 ID、原始 slot 座標、預約狀態與點擊流程維持不變。

## 配置

### 第一排

順序維持：

1. T5833-6
2. T5833-1
3. UF3000
4. T5830ES_WBN8
5. UF3000

第一排 3D 物件維持目前位置，避免往上碰到走道。三台 tester 的名稱與預約狀態銘牌移到機台上方；兩台 UF3000 的設備文字同步移到上方。

### 第二排

順序維持：

1. T5781-3
2. Auto Hander
3. T5781-2

第二排 3D 物件與銘牌整組往下約 5%，拉開與第一排的距離。第二排銘牌維持放在物件下方。

## 實作邊界

- 使用 tester ID、設備 label 與原始 y 值判斷所屬視覺列。
- 位移只套用於 Three.js group 與投影後的 DOM label。
- 不修改 `FLOOR_PLAN_TESTER_SLOTS` 的 x/y mapping。
- 不修改 `appointments`、`openAppointmentModal()` 或任何 Supabase 呼叫。
- 走道維持 DOM 百分比座標，不跟隨 Three.js 投影。

## 驗證

- 21 台 tester ID 與原始 mapping 不變。
- 第一排物件不覆蓋最下方走道。
- 第一排 tester 與 UF3000 銘牌位於物件上方。
- 第二排與第一排具有清楚垂直間距。
- 第二排仍位於 PP00 外框內。
- 點擊 tester 仍呼叫原本 Booking handler。
- 桌面與 700px 寬度無新增水平溢出。
