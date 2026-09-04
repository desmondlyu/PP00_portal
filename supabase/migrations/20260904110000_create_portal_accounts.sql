create table if not exists public.portal_accounts (
  account_code text primary key
    check (account_code = lower(account_code))
    check (account_code ~ '^[a-z0-9]{2,32}$'),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.portal_accounts enable row level security;

revoke all on table public.portal_accounts from anon, authenticated;
