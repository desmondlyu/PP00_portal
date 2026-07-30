# PP00 Portal Release Radar 與 Wafer Hero 設計規格

## 目標

保留現有深色 Bento Portal，將首頁首列由入口網站優先改為更新日誌優先：左側入口縮小為 5 欄，右側 Release Radar 擴至 7 欄。最新更新置頂凸顯，完整歷史保留在固定高度 scrollbar 內。

## 範圍

- 僅修改 `src/App.jsx` 與 `src/index.css`。
- 不增加相依套件、不更動工具啟動、Offline/Pending 防護、管理員登入或 iframe 行為。
- 使用既有 React state、CSS 與內嵌 SVG。

## 版面與互動

- 首列改為 Hero `col-5` 與更新日誌 `col-7`。
- `changelog[0]` 顯示為主更新卡：版本、日期、摘要與 NEW 標示。
- 所有歷史版本保留在同一張卡的固定高度 scrollbar，不新增按鈕、抽屜、路由或資料來源。
- 固定 scrollbar 高度不得改變 Hero 或晶圓的版面位置。
- Hero 標題字級縮小 20%。

## 晶圓動畫

- Hero 視覺改為暗色圓形晶圓 SVG，使用 clip path 限制 die 格線與缺陷於晶圓內。
- 外層晶圓低速旋轉；十顆 die 以深灰、白色與青色弱光交錯脈衝，模擬缺陷變化。
- 動畫為純 CSS；`prefers-reduced-motion: reduce` 時完全停用旋轉與脈衝。
- 裝飾性 SVG 保持 `aria-hidden`，不影響內容閱讀與工具操作。

## 響應式與驗證

- 既有窄螢幕 media query 下，首列維持單欄排列且更新日誌先於或緊接入口內容，無水平溢位。
- 以 `npm run build` 驗證 React 編譯。
- 在本機 Portal 中驗證最新更新置頂、歷史版本可捲動、十顆 die 動態可見，並確認 reduced motion 樣式存在。
