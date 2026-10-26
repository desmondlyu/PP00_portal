-- Clean up all Gather online users, audit logs, and reset Season 2 store to clean state
TRUNCATE TABLE public.gather_online_users RESTART IDENTITY;
TRUNCATE TABLE public.gather_audit_logs RESTART IDENTITY;
UPDATE gather_private.season2_store
SET state = '{"players":{},"enemies":{},"drops":{},"tasks":{},"rate":{}}'::jsonb,
    revision = 0,
    updated_at = now()
WHERE id = true;
TRUNCATE TABLE gather_private.season2_receipts;
