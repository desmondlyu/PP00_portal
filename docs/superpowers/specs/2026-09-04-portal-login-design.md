# PP00 Portal 登入頁設計規格

## 目標

在 `PP00_Portal` 首頁前加入 Supabase Auth 登入閘門。登入前顯示與主頁一致的深色 Bento／霓虹科技風格，保留 Header 的 Logo 與品牌資訊，以及 Footer 的作者版權資訊；登入成功後顯示既有工具入口，不改變既有工具卡片、iframe 與管理後台流程。

## 範圍

- 新增登入前畫面與登入後 session gate。
- 使用既有 `@supabase/supabase-js` 與 `src/utils/supabaseClient.js`。
- 提供固定帳號下拉清單：
  `PP00`、`PP11`、`PP12`、`PP31`、`PP32`、`PP21`、`PP22`、`PP23`、`PP40`、`PP41`、`PP42`、`PP50`、`PT22`、`PT12`。
- 由 Supabase Auth 驗證密碼；密碼不寫入程式碼、不預填、不顯示於畫面。
- 登入成功後保留 Supabase 預設 session 持久化；登出後回到登入畫面。
- 不新增註冊、忘記密碼、角色權限或新的路由套件。

## 帳號對應假設

Supabase Auth 使用 email 登入，因此 UI 顯示帳號代碼，送出的 email 以小寫帳號加上 `@winbond.com` 組成，例如 `PP00` 對應 `pp00@winbond.com`。若 Supabase 既有使用者的 email domain 不同，只需調整單一 mapping 函式，不需改動 UI 或 session 流程。

## 架構

### App session gate

`App` 啟動時：

1. 讀取既有 Supabase client。
2. 呼叫 `supabase.auth.getSession()` 還原目前 session。
3. 訂閱 `supabase.auth.onAuthStateChange()`，讓登入、登出與 token refresh 反映到畫面。
4. `session` 為空時渲染登入頁；有 session 時渲染目前 Portal 主頁。
5. Supabase 未設定時仍可渲染登入頁，但提交時顯示明確設定錯誤，不進入主頁。

既有 `tool_statuses` 載入與管理員操作僅在主頁流程使用，避免登入前不必要地查詢工具狀態。

### LoginView

登入頁沿用既有 CSS token 與背景：

- Header：沿用 Logo、`PP00 Tool Portal`、`PP00 NOR FLASH 應用程式入口網站系統`；右側狀態顯示 `SECURE ACCESS · SUPABASE AUTH`。
- Main：置中 Bento 卡片，包含鎖頭圖示、標題、帳號下拉、密碼欄位、顯示／隱藏密碼按鈕與登入按鈕。
- 輔助資訊：顯示「請使用 PP00 Portal 授權帳號登入」，不顯示帳號密碼。
- Footer：沿用現有作者、Copyright、MIT License 與版本文字。

### 登出

登入後在 Header 提供登出按鈕。按下後呼叫 `supabase.auth.signOut()`，session 清除後由 session gate 自動回到登入頁。

## 資料流

```text
帳號代碼 + 密碼
        |
        v
accountToEmail()
        |
        v
supabase.auth.signInWithPassword()
        |
   +----+----+
   |         |
成功        失敗
   |         |
session     顯示可讀錯誤
   |
Portal 主頁
```

## 錯誤與狀態

- 登入中：停用提交按鈕並顯示「登入驗證中…」，避免重複送出。
- Supabase 未設定：顯示「尚未設定 Supabase 連線，無法登入」。
- 帳密錯誤：顯示不暴露帳號存在性的通用錯誤訊息。
- 網路／服務錯誤：顯示「Supabase 連線失敗，請稍後再試」。
- 密碼欄位使用原生 `required` 與 `autoComplete="current-password"`。
- 錯誤訊息不輸出密碼或完整 credential。

## 相容性與安全邊界

- 不在 bundle、localStorage 或 UI 中保存明文密碼。
- 使用既有 anon key client；Supabase Auth session 由 SDK 管理。
- 此登入閘門只保護 React Portal 畫面；GitHub Pages 下 `tool/` 內的靜態檔案仍可被直接開啟，若未來要求真正保護子工具，需改用後端或受保護部署，不在本次範圍。
- 不改變既有管理員 Modal 的 Supabase 驗證與工具狀態功能。

## 驗收

- 未登入開啟 `http://localhost:3100` 時只看到登入頁，Header／Footer 資訊完整。
- 14 個帳號代碼都可在下拉選單選取。
- Supabase 未設定時，登入操作不會顯示成功或進入主頁。
- Supabase 驗證成功後顯示既有 Portal 主頁。
- 登出後回到登入頁。
- 登入頁在桌面與窄螢幕無水平溢位，鍵盤可完成表單操作。
- `npm run build` 成功。
