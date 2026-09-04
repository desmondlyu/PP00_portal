# PP00 Portal 帳號代碼登入設計規格

## 目標

讓使用者只輸入既有帳號代碼與密碼，例如 `PP00`，由 Supabase Edge Function 在後端查詢帳號並驗證密碼；成功後建立 Supabase Auth Session，才允許進入 Portal。

登入頁維持既有 PP00 Portal Bento／霓虹科技風格、Header Logo、Footer 作者與版權資訊。

## 範圍

- 保留既有登入頁、Session Gate、登出與 `tool_statuses` 流程。
- 移除前端 `@winbond.com` 帳號 mapping。
- 新增私有 `public.portal_accounts` 對應表。
- 新增公開登入用 Edge Function `portal-login`。
- Supabase Auth 繼續負責密碼雜湊與 Session，不在自訂資料表保存明文或自行實作密碼雜湊。
- 帳號代碼清單只存在 Supabase 資料表與一次性設定 SQL，不在前端 UI 或 JavaScript Bundle 列出。
- 既有管理員 Modal 也改走同一個後端登入 helper，避免留下前端直接驗證路徑。
- 不新增註冊、忘記密碼、角色權限、Router 或新的前端依賴。

## 帳號資料模型

`public.portal_accounts` 欄位：

| 欄位 | 型別 | 用途 |
|---|---|---|
| `account_code` | `text` PK | 小寫帳號代碼，例如 `pp00` |
| `auth_user_id` | `uuid` UNIQUE | 對應 `auth.users.id` |
| `is_active` | `boolean` | 後端停用帳號 |
| `created_at` | `timestamptz` | 建立時間 |

Supabase Auth 使用內部識別 Email，例如 `pp00@portal-internal.invalid`。這只是 Auth 的內部識別值，不顯示在登入頁、不要求使用者輸入，也不使用 `@winbond.com`。

密碼只建立在 Supabase Auth，由 Supabase 儲存雜湊值。`portal_accounts` 不保存密碼欄位。

## 架構

### Edge Function `portal-login`

Function 設為登入前可呼叫，因此部署時使用 `--no-verify-jwt`；Function 自己執行以下驗證：

1. 僅接受 `POST`。
2. 驗證 `Origin` 是否為本機 Portal 或正式 GitHub Pages origin。
3. 解析 `{ account, password }`，帳號轉小寫並限制為英數代碼。
4. 使用 service-role client 查詢 `portal_accounts`，只接受 `is_active = true`。
5. 使用 `auth_user_id` 取得對應 Auth user 的內部 Email。
6. 使用 anon client 呼叫 `signInWithPassword` 驗證密碼。
7. 成功時只回傳 Supabase Session；失敗時回傳不區分「帳號不存在」或「密碼錯誤」的通用訊息。

Service-role key 只存在 Edge Function 執行環境，絕不進入前端 `.env` 或 Bundle。

### Portal 前端

共用 `signInWithPortalAccount(account, password)` helper：

1. 呼叫 `supabase.functions.invoke('portal-login', { body: { account, password } })`。
2. 取得 `access_token` 與 `refresh_token`。
3. 呼叫 `supabase.auth.setSession(...)`，交給既有 Auth listener 更新 Portal。
4. 不保存帳號清單與明文密碼。

`LoginView` 與管理員 Modal 共用此 helper；既有 `getSession()`、`onAuthStateChange()`、`signOut()` 與登入後工具狀態查詢維持不變。

## 資料流

```text
帳號代碼 + 密碼
        |
        v
Portal 呼叫 portal-login Edge Function
        |
        v
portal_accounts 查詢 account_code / auth_user_id
        |
        v
Supabase Auth signInWithPassword
        |
   +----+----+
   |         |
成功        失敗
   |         |
setSession  通用錯誤
   |
Portal 主頁
```

## Supabase 設定流程

1. 在 Authentication → Users 建立 14 個 Auth user，使用內部 Email：
   `pp00`、`pp11`、`pp12`、`pp31`、`pp32`、`pp21`、`pp22`、`pp23`、`pp40`、`pp41`、`pp42`、`pp50`、`pt22`、`pt12`。
2. 每個 Auth user 使用使用者提供的相同密碼，並開啟 Auto Confirm User。
3. 執行 `supabase/setup/portal_accounts.sql`，將帳號代碼對應到 Auth user id。
4. 部署 `supabase/functions/portal-login/index.ts`，並設定登入 Function 的允許來源。
5. 本機以 `PP00` 測試，不輸入任何 Email。

## 錯誤與安全處理

- 空白或格式不符的帳號：前端與 Function 都拒絕。
- 帳號不存在、停用或密碼錯誤：統一顯示「帳號或密碼錯誤，請確認後再試」。
- Supabase 未設定：前端明確顯示無法登入。
- Function 連線失敗：前端顯示 Supabase 連線錯誤。
- Function 不記錄密碼、完整 credential 或登入輸入內容。
- `portal_accounts` 啟用 RLS，撤銷 `anon` 與 `authenticated` 直接存取；只有 Edge Function service role 可查詢。
- CORS 僅允許本機 Portal 與正式 Portal origin。
- 登入按鈕在驗證期間停用，避免重複送出。

## 相容性與安全邊界

- Supabase anon key 可保留在前端；service-role key 不可放入前端。
- Session 仍由 Supabase Auth SDK 持久化與更新。
- 入口網站 React UI 受登入閘門保護；GitHub Pages 下 `tool/` 靜態檔案仍可能被直接開啟。若未來要保護子工具本身，需使用受保護後端部署，不在本次範圍。
- 不改變既有工具卡片、iframe、離線狀態與管理後台功能。

## 驗收

- 未登入開啟 `http://localhost:3100` 時只看到登入頁，Header／Footer 完整。
- 前端沒有 `@winbond.com` mapping、帳號清單或 `<select>`。
- 輸入 `PP00` 與正確密碼可登入。
- 輸入不存在帳號或錯誤密碼不能登入，且錯誤訊息不洩露帳號是否存在。
- 登入成功後既有 `tool_statuses` 查詢與 Portal 主頁正常。
- 登出後回到登入頁。
- 桌面與窄螢幕無水平溢位。
- `npm run build` 成功。
