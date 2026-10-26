-- Keep polling transient; retain durable receipts only for transactions.
create or replace function public.gather_s2_commit(p_revision bigint,p_state jsonb,p_scope text,p_request uuid,p_result jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from gather_private.season2_store where id=true for update;
 if exists(select 1 from gather_private.season2_receipts where scope=p_scope and request_id=p_request) then return false; end if;
 update gather_private.season2_store set state=p_state, revision=revision+1,updated_at=now() where id=true and revision=p_revision and enabled;
 if not found then return false; end if;
 if p_result is not null then
   insert into gather_private.season2_receipts(scope,request_id,result) values(p_scope,p_request,p_result);
 end if;
 return true;
end; $$;
