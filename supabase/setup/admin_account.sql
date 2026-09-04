do $$
begin
  if not exists (
    select 1
    from auth.users
    where lower(email) = lower('dannyowan@gmail.com')
  ) then
    raise exception '找不到 Supabase Auth 使用者 dannyowan@gmail.com，請先在 Authentication -> Users 建立帳號。';
  end if;
end
$$;

update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin')
where lower(email) = lower('dannyowan@gmail.com');

select
  id,
  email,
  email_confirmed_at,
  raw_app_meta_data ->> 'role' as app_role
from auth.users
where lower(email) = lower('dannyowan@gmail.com');
