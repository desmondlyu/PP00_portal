-- Yield Summary 的 WEC Token 改存 Supabase，只有 Portal 白名單帳號可在登入後讀取。
-- Token 值不寫在 migration 內，請在 SQL Editor 另外執行：
--   insert into private.app_secrets (name, value) values ('wec_token_cp', '<token>'), ('wec_token_ft', '<token>')
--   on conflict (name) do update set value = excluded.value, updated_at = now();

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- 白名單：沿用 Portal 帳號，可逐一關閉個別帳號的 WEC 權限
alter table public.portal_accounts
  add column if not exists can_use_wec boolean not null default true;

create table if not exists private.app_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table private.app_secrets enable row level security;
revoke all on table private.app_secrets from public, anon, authenticated;

-- portal_accounts 與 app_secrets 皆不開放前端存取，因此由 security definer 函式代為檢查並回傳
create or replace function public.get_yield_summary_tokens()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.portal_accounts p
    where p.auth_user_id = auth.uid()
      and p.is_active
      and p.can_use_wec
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return (
    select coalesce(jsonb_object_agg(s.name, s.value), '{}'::jsonb)
    from private.app_secrets s
    where s.name in ('wec_token_cp', 'wec_token_ft')
  );
end;
$$;

revoke all on function public.get_yield_summary_tokens() from public, anon, authenticated;
grant execute on function public.get_yield_summary_tokens() to authenticated;
