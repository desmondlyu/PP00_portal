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
- 管理員 Modal 使用獨立 Supabase Auth client，僅接受 `dannyowan@gmail.com`，不共用 Portal 的 `portal-login`。
- `tool_statuses` 寫入由 Supabase RLS 的 `app_metadata.role = 'admin'` 強制限制。
- 不新增註冊、忘記密碼、`admin_accounts` table、`admin-login` Function、Router 或新的前端依賴。

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
6. 使用 publishable client 呼叫 `signInWithPassword` 驗證密碼。
7. 成功時只回傳 Supabase Session；失敗時回傳不區分「帳號不存在」或「密碼錯誤」的通用訊息。

Service-role key 只存在 Edge Function 執行環境，絕不進入前端 `.env` 或 Bundle。

### Portal 前端

共用 `signInWithPortalAccount(account, password)` helper：

1. 呼叫 `supabase.functions.invoke('portal-login', { body: { account, password } })`。
2. 取得 `access_token` 與 `refresh_token`。
3. 呼叫 `supabase.auth.setSession(...)`，交給既有 Auth listener 更新 Portal。
4. 不保存帳號清單與明文密碼。

`LoginView` 使用 Portal client。管理員 Modal 使用獨立的 `supabaseAdmin` client，直接呼叫 `signInWithPassword`，並由前端 Email 白名單限制為 `dannyowan@gmail.com`。管理員 client 使用不同的 `storageKey` 與 `sessionStorage`，因此後台 `signOut({ scope: 'local' })` 不會清除 Portal Session。Header 的 Portal 登出仍使用 Portal client，並同時清除管理後台 Session。

### 管理後台前端

`signInWithAdminAccount(account, password)` 的流程：

1. 先確認輸入的 Email（忽略大小寫與前後空白）是 `dannyowan@gmail.com`。
2. 使用獨立 `supabaseAdmin.auth.signInWithPassword(...)` 驗證後台專用密碼。
3. Supabase Auth SDK 將 Session 保存至 `sessionStorage` 的 `pp00-admin-auth` key。
4. 後台透過同一個 Session upsert `tool_statuses`；資料庫 RLS 再檢查 JWT 的 `app_metadata.role`。

## 資料流

```text
Portal：
帳號代碼 + 密碼
        |
        v
portal-login Edge Function
        |
        v
portal_accounts 查詢對應 Auth user
        |
        v
Supabase Auth signInWithPassword
        |
        v
Portal Session → Portal 主頁

後台：
dannyowan@gmail.com + 後台密碼
        |
        v
獨立 supabaseAdmin Auth client
        |
        v
pp00-admin-auth Session → 管理後台
        |
        v
tool_statuses RLS：app_metadata.role = admin
```

## Supabase 設定流程

1. 在 Authentication → Users 建立 14 個 Auth user，使用內部 Email：
   `pp00`、`pp11`、`pp12`、`pp31`、`pp32`、`pp21`、`pp22`、`pp23`、`pp40`、`pp41`、`pp42`、`pp50`、`pt22`、`pt12`。
2. 每個 Auth user 使用使用者提供的相同密碼，並開啟 Auto Confirm User。
3. 執行 `supabase/setup/portal_accounts.sql`，將帳號代碼對應到 Auth user id。
4. 部署 `supabase/functions/portal-login/index.ts`，並設定登入 Function 的允許來源。
5. 本機以 `PP00` 測試，不輸入任何 Email。
6. 在 Authentication → Users 確認 `dannyowan@gmail.com` 已建立、Email 已驗證，並設定與 Portal 不同的後台專用密碼。
7. 執行 `supabase/setup/admin_account.sql`，設定 `app_metadata.role = 'admin'`。
8. 執行 `supabase/migrations/20260904130000_restrict_tool_statuses_to_admin.sql`，替換原本允許所有 authenticated 寫入的 `tool_statuses` policy。
9. 後台登出後重新登入，讓新的 JWT 載入管理員角色；不需要部署 `admin-login` Function。

## 錯誤與安全處理

- 空白或格式不符的帳號：前端與 Function 都拒絕。
- 帳號不存在、停用或密碼錯誤：統一顯示「帳號或密碼錯誤，請確認後再試」。
- Supabase 未設定：前端明確顯示無法登入。
- Function 連線失敗：前端顯示 Supabase 連線錯誤。
- Function 不記錄密碼、完整 credential 或登入輸入內容。
- `portal_accounts` 啟用 RLS，撤銷 `anon` 與 `authenticated` 直接存取；只有 Edge Function service role 可查詢。
- CORS 僅允許本機 Portal 與正式 Portal origin。
- 登入按鈕在驗證期間停用，避免重複送出。
- 管理員登入只接受 `dannyowan@gmail.com`；Portal Auth user 即使知道後台表單，也不能通過 Email 白名單。
- `tool_statuses` 的公開 SELECT 保留；INSERT、UPDATE、DELETE 只允許 JWT `app_metadata.role = 'admin'`。

## 相容性與安全邊界

- Supabase publishable key 可保留在前端；secret key 不可放入前端。
- Portal Session 與管理後台 Session 由 Supabase Auth SDK 分開持久化與更新。
- 前端 Email 白名單只是 UX 與流程分流；真正的資料寫入授權由 Supabase RLS 強制執行。
- 入口網站 React UI 受登入閘門保護；GitHub Pages 下 `tool/` 靜態檔案仍可能被直接開啟。若未來要保護子工具本身，需使用受保護後端部署，不在本次範圍。
- 不改變既有工具卡片、iframe 與離線狀態；管理後台需獨立驗證，且其安全登出不影響 Portal。

## 驗收

- 未登入開啟 `http://localhost:3100` 時只看到登入頁，Header／Footer 完整。
- 前端沒有 `@winbond.com` mapping、帳號清單或 `<select>`。
- 輸入 `PP00` 與正確密碼可登入。
- 輸入不存在帳號或錯誤密碼不能登入，且錯誤訊息不洩露帳號是否存在。
- 登入成功後既有 `tool_statuses` 查詢與 Portal 主頁正常。
- `dannyowan@gmail.com` 使用後台專用密碼可登入管理後台；Portal Auth Email 不可通過後台登入。
- 具 `app_metadata.role = 'admin'` 的 Session 可更新 `tool_statuses`，沒有該 role 的 Session 會被 RLS 拒絕。
- 後台安全登出不清除 Portal Session；Portal Header 登出會清除兩邊 Session。
- 登出後回到登入頁。
- 桌面與窄螢幕無水平溢位。
- `npm run build` 成功。
