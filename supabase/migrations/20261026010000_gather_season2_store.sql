-- Dedicated Gather state. No portal/booking table changes. Only the Edge service role can use this API.
create schema if not exists gather_private;
revoke all on schema gather_private from public, anon, authenticated;
create table if not exists gather_private.season2_store (
 id boolean primary key default true check (id), revision bigint not null default 0,
 enabled boolean not null default false,
 state jsonb not null default '{"players":{},"enemies":{},"drops":{},"tasks":{},"rate":{}}'::jsonb,
 updated_at timestamptz not null default now()
);
create table if not exists gather_private.season2_receipts (
 scope text not null, request_id uuid not null, result jsonb not null,
 created_at timestamptz not null default now(), primary key(scope,request_id)
);
alter table gather_private.season2_store enable row level security;
alter table gather_private.season2_receipts enable row level security;
insert into gather_private.season2_store(id) values(true) on conflict do nothing;
create or replace function public.gather_s2_load() returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('revision',revision,'enabled',enabled,'state',state,'now',floor(extract(epoch from clock_timestamp())*1000)) from gather_private.season2_store where id=true;
$$;
create or replace function public.gather_s2_receipt(p_scope text,p_request uuid) returns jsonb
language sql security definer set search_path='' as $$
 select result from gather_private.season2_receipts where scope=p_scope and request_id=p_request;
$$;
create or replace function public.gather_s2_commit(p_revision bigint,p_state jsonb,p_scope text,p_request uuid,p_result jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from gather_private.season2_store where id=true for update;
 if exists(select 1 from gather_private.season2_receipts where scope=p_scope and request_id=p_request) then return false; end if;
 update gather_private.season2_store set state=p_state, revision=revision+1,updated_at=now() where id=true and revision=p_revision and enabled;
 if not found then return false; end if;
 insert into gather_private.season2_receipts(scope,request_id,result) values(p_scope,p_request,p_result);
 return true;
end; $$;
revoke all on function public.gather_s2_load() from public,anon,authenticated;
revoke all on function public.gather_s2_receipt(text,uuid) from public,anon,authenticated;
revoke all on function public.gather_s2_commit(bigint,jsonb,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.gather_s2_load() to service_role;
grant execute on function public.gather_s2_receipt(text,uuid) to service_role;
grant execute on function public.gather_s2_commit(bigint,jsonb,text,uuid,jsonb) to service_role;
