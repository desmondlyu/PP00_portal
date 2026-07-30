# PP00 Portal 工程入口網站視覺設計規格

## 目標

將 PP00 Portal 從一般工具卡片首頁提升為半導體晶圓製造廠工程師使用的高科技工作入口。首要任務是快速搜尋與啟動工具；第二任務是讓使用者第一眼看到應用程式更新。

## 共用資訊架構

- Header：保留 `logo.png`、`PP00 Tool Portal`、`PP00 NOR FLASH 應用程式入口網站系統` 與系統 Online/Offline 狀態。
- 搜尋：首屏提供工具、資料格式與工作目的搜尋入口。
- 工程任務：提供分析 CP/FT Yield、轉換 Datalog、產生工程報告、操作現場設備四個入口。
- Release Radar：首屏主要資訊模組，顯示最新版本、日期、更新摘要與完整 Changelog 入口。
- 工具目錄：保留現有工具名稱、狀態與啟動行為。
- 作者介紹：獨立 Maintainer Profile，顯示 Desmond Lyu、PP32 YPLu、職能、Email 與 GitHub。
- Footer：保留 `© 2026 PP32 YPLu (Desmond Lyu). All rights reserved.`、MIT License 與版本資訊。

## 三種模板

### A. Neon Fab Console

深色工程控制台。左側或中央提供工程任務與工具搜尋，右側使用高對比 Release Radar。主色為螢光綠、電光藍與深 navy；適合日常高頻使用。

### B. Wafer Orbit

以晶圓資料流為主視覺。工具分類以節點與軌道呈現，Release Radar 位於中央核心，使用低速資料線、脈衝光點與節點高亮；搜尋與清單仍需保留，避免只靠圖形導航。

### C. Engineering SaaS Workspace

明亮企業 SaaS 工作區。左側是 Recommended Tools，右側是固定 Latest Release 面板，更新內容以側邊抽屜展開；適合主管、新進工程師與跨團隊使用。

## Release Radar 行為

- 最新版本顯示大字版本號、`NEW RELEASE` 標籤、日期與更新摘要。
- 最新項目使用邊框、光暈或狀態燈突出，但不以快速閃爍造成干擾。
- 歷史版本以可掃讀的列表或時間軸呈現。
- 點擊完整更新入口後，以抽屜或展開區顯示完整 Changelog。

## 動態與安全邊界

- 優先使用 CSS、SVG 與既有 React state；不新增動畫套件。
- 動畫只用於 hover、面板展開、狀態變化與低速背景資料線。
- 保留現有工具 Offline/Pending 防護、iframe 啟動流程、管理後台與外部連結行為。
- 支援 `prefers-reduced-motion`，降低動態效果。

## 草稿驗收

- 三個模板可在同一個本機預覽頁切換。
- 三個模板都清楚看見 Release Radar。
- 作者介紹不是只有 Footer 文字，而是獨立視覺區塊。
- Footer 保留作者與版權資訊。
- 桌面與窄螢幕下不出現水平溢位。
