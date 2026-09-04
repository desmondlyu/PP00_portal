insert into public.portal_accounts (account_code, auth_user_id)
select accounts.account_code, users.id
from (
  values
    ('pp00', 'pp00@portal-internal.invalid'),
    ('pp11', 'pp11@portal-internal.invalid'),
    ('pp12', 'pp12@portal-internal.invalid'),
    ('pp31', 'pp31@portal-internal.invalid'),
    ('pp32', 'pp32@portal-internal.invalid'),
    ('pp21', 'pp21@portal-internal.invalid'),
    ('pp22', 'pp22@portal-internal.invalid'),
    ('pp23', 'pp23@portal-internal.invalid'),
    ('pp40', 'pp40@portal-internal.invalid'),
    ('pp41', 'pp41@portal-internal.invalid'),
    ('pp42', 'pp42@portal-internal.invalid'),
    ('pp50', 'pp50@portal-internal.invalid'),
    ('pt22', 'pt22@portal-internal.invalid'),
    ('pt12', 'pt12@portal-internal.invalid')
) as accounts(account_code, internal_email)
join auth.users as users
  on lower(users.email) = accounts.internal_email
on conflict (account_code) do update
set auth_user_id = excluded.auth_user_id,
    is_active = true;

select account_code, auth_user_id, is_active
from public.portal_accounts
order by account_code;
