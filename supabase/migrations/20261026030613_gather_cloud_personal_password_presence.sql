-- 確保 public.gather_online_users 與 public.gather_audit_logs 資料表存在
create table if not exists public.gather_online_users (
  client_id text primary key,
  user_name text not null,
  unit text,
  avatar_id text,
  status text default 'active',
  x numeric default 0,
  y numeric default 0,
  dir text default 'down',
  action_state text,
  held_item text,
  equipped_slots jsonb default '[]'::jsonb,
  last_heartbeat timestamptz default now()
);

create table if not exists public.gather_audit_logs (
  id bigint generated always as identity primary key,
  client_id text,
  user_name text,
  unit text,
  event_type text not null,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Presence and history are written with the same cloud commit as the game state.
-- Old browser tabs may read records, but cannot repopulate a reset via anonymous writes.
do $$
begin
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'gather_online_users') then
    execute 'grant select on table public.gather_online_users to anon, authenticated';
    execute 'revoke insert, update, delete, truncate, references, trigger on public.gather_online_users from public, anon, authenticated';
  end if;
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'gather_audit_logs') then
    execute 'grant select on table public.gather_audit_logs to anon, authenticated';
    execute 'revoke insert, update, delete, truncate, references, trigger on public.gather_audit_logs from public, anon, authenticated';
  end if;
end $$;
create or replace function public.gather_s2_commit(p_revision bigint,p_state jsonb,p_scope text,p_request uuid,p_result jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare
 stamp timestamptz:=clock_timestamp();
 clock_ms bigint:=floor(extract(epoch from stamp)*1000);
 p record;
 gone record;
 active_players jsonb:='{}'::jsonb;
 equip jsonb;
 held text;
begin
 perform 1 from gather_private.season2_store where id=true for update;
 if exists(select 1 from gather_private.season2_receipts where scope=p_scope and request_id=p_request) then return false; end if;
 update gather_private.season2_store set state=p_state,revision=revision+1,updated_at=stamp where id=true and revision=p_revision and enabled;
 if not found then return false; end if;
 if p_result is not null then
  insert into gather_private.season2_receipts(scope,request_id,result) values(p_scope,p_request,p_result);
 end if;
 for p in select key,value from jsonb_each(coalesce(p_state->'players','{}'::jsonb)) loop
  if p.value->>'tokenHash' is not null and coalesce((p.value->>'sessionUntil')::bigint,0)>clock_ms and coalesce((p.value->>'lastSeen')::bigint,0)>clock_ms-35000 then
   active_players:=active_players||jsonb_build_object(p.key,p.value);
  end if;
 end loop;
 for gone in delete from public.gather_online_users u where not exists(select 1 from jsonb_each(active_players) a where a.value->>'connection'=u.client_id) returning u.* loop
  insert into public.gather_audit_logs(client_id,user_name,unit,event_type,meta) values(gone.client_id,gone.user_name,gone.unit,'logout','{"source":"cloud"}'::jsonb);
 end loop;
 for p in select value from jsonb_each(active_players) loop
  if not exists(select 1 from public.gather_online_users u where u.client_id=p.value->>'connection') then
   insert into public.gather_audit_logs(client_id,user_name,unit,event_type,meta) values(p.value->>'connection',p.value->>'name',p.value->>'unit','login','{"source":"cloud"}'::jsonb);
  end if;
  select coalesce(jsonb_agg(i),'[]'::jsonb) into equip from jsonb_array_elements(coalesce(p.value->'items','[]'::jsonb)) i where i->>'slot' is not null;
  select i->>'emoji' into held from jsonb_array_elements(coalesce(p.value->'items','[]'::jsonb)) i where i->>'slot'=coalesce(p.value->>'activeSlot','0') limit 1;
  insert into public.gather_online_users as online(client_id,user_name,unit,avatar_id,status,x,y,dir,action_state,held_item,equipped_slots,last_heartbeat)
  values(p.value->>'connection',p.value->>'name',p.value->>'unit',p.value->>'avatarId','active',(p.value->>'x')::numeric,(p.value->>'y')::numeric,'down',p.value->>'action',coalesce(held,''),equip,to_timestamp((p.value->>'lastSeen')::numeric/1000))
  on conflict(client_id) do update set user_name=excluded.user_name,unit=excluded.unit,avatar_id=excluded.avatar_id,x=excluded.x,y=excluded.y,action_state=excluded.action_state,held_item=excluded.held_item,equipped_slots=excluded.equipped_slots,last_heartbeat=excluded.last_heartbeat
  where online.last_heartbeat is distinct from excluded.last_heartbeat or online.equipped_slots is distinct from excluded.equipped_slots or online.action_state is distinct from excluded.action_state;
 end loop;
 return true;
end; $$;
revoke all on function public.gather_s2_commit(bigint,jsonb,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.gather_s2_commit(bigint,jsonb,text,uuid,jsonb) to service_role;
