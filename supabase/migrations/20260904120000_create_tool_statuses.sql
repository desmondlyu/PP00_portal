create table if not exists public.tool_statuses (
  id text primary key,
  is_offline boolean not null default false,
  updated_at timestamptz not null default now()
);
