# JB Booking PC/設備/烤箱走道底色設計

## 目標

讓 `PC/設備/烤箱` 靜態 layer 與 `走道` 使用完全一致的底色與背景紋理，保留原本文字與位置，避免同一區域出現兩種不同的底板視覺。

## 範圍

- 只修改 `tool/JB_booking/static/css/style.css` 與 `tool/JB_booking/static/js/app.js` 的 presentation class wiring。
- `PC/設備/烤箱` 繼續使用既有 `kind: 'device'` 與原始座標。
- 保留 `PC/設備/烤箱` 文字。
- 移除 PC 專用實線框、背景色與陰影，改用走道的 repeating-linear-gradient。
- 不修改 Three.js、Booking、API、資料流、機台 ID、狀態判斷或 click handler。

## 實作方案

新增更具體的 `.floor-static-block.device.pc-equipment-layer` 規則，覆蓋一般 device layer 的視覺樣式：

- `border: none`
- `background` 與 `.floor-static-block.walkway` 相同
- `box-shadow: none`
- 保留既有文字顏色與置中排版

由 `app.js` 依 `blockDef.label === 'PC/設備/烤箱'` 加上 `pc-equipment-layer` class；不改變其他設備的無框文字 label 行為。

## 驗證

- DOM 仍存在 `PC/設備/烤箱` 文字。
- PC layer 與 walkway 的 computed background 相同。
- PC layer 沒有實線 border 與 box-shadow。
- Three.js presentation contract、route contract、JavaScript syntax check 與 `git diff --check` 通過。
