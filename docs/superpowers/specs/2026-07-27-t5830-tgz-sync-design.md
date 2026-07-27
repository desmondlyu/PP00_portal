# T5830 `.tgz` 支援同步設計

## 目標

將 `pp21_py` 最新 `.tgz`/`.tar.gz` 串流解析實作同步至
`PP00_Portal/tool/T5830_TTO`，並更新 Portal 卡片與 T5830 首頁文字。

## 範圍

- 同步 T5830 `.tgz` 解壓、TAR 解析、Pipeline 進度與相關測試。
- 首頁檔案說明統一使用 `.TGZ`。
- Portal 卡片描述與功能細節統一使用 `.TGZ`。
- 在 `PP00_Portal` 執行 `npm run build`，提交編譯後的 `dist/`。

## 不變更

- 不新增 npm 依賴。
- 不修改其他 Portal 工具。
- 不改變現有 Supabase 卡片狀態結構。

## 驗證

- T5830_TTO 進行型別檢查與 build。
- PP00_Portal 執行 build。
- 確認 Git push 包含 T5830_TTO 的 `dist/` 部署產物。
