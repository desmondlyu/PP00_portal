alter table public.tool_statuses enable row level security;

drop policy if exists "Allow admin write access"
on public.tool_statuses;

create policy "Allow admin write access"
on public.tool_statuses
for all
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select on table public.tool_statuses to anon, authenticated;
grant insert, update, delete on table public.tool_statuses to authenticated;
