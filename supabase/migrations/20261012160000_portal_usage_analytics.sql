-- Independent click analytics. Does not alter tool_statuses or its policies.
begin;
create table if not exists public.portal_tool_clicks (
  event_id uuid primary key,
  tool_id text not null check (tool_id in (
    'tto-analysis','jb-booking','dl-to-excel','cz-dataset','dl-analysis',
    'yield-summary','cp-mss-converter','dongle-summary','writer','eng_report',
    'te_tto','pp00-knowledge-agent'
  )),
  clicked_at timestamptz not null default now()
);
create index if not exists portal_tool_clicks_time_tool_idx
  on public.portal_tool_clicks (clicked_at, tool_id);
alter table public.portal_tool_clicks enable row level security;
-- No direct reads/writes: both operations go through narrowly scoped functions.
revoke all on table public.portal_tool_clicks from public, anon, authenticated;

create or replace function public.record_portal_tool_click(p_tool_id text, p_event_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  insert into public.portal_tool_clicks(event_id, tool_id)
  values (p_event_id, p_tool_id)
  on conflict (event_id) do nothing;
end;
$$;
revoke all on function public.record_portal_tool_click(text, uuid) from public, anon, authenticated;
grant execute on function public.record_portal_tool_click(text, uuid) to authenticated;

create or replace function public.get_portal_tool_clicks(p_year integer)
returns table(month integer, tool_id text, clicks bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_year < 2026 or p_year > 2100 then
    raise exception 'Invalid year' using errcode = '22023';
  end if;
  return query
    select extract(month from c.clicked_at at time zone 'Asia/Taipei')::integer,
           c.tool_id, count(*)
    from public.portal_tool_clicks c
    where c.clicked_at >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'Asia/Taipei')
      and c.clicked_at < make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'Asia/Taipei')
    group by 1, 2;
end;
$$;
revoke all on function public.get_portal_tool_clicks(integer) from public, anon, authenticated;
grant execute on function public.get_portal_tool_clicks(integer) to authenticated;
notify pgrst, 'reload schema';
commit;
