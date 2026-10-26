-- Clean up all Gather online users, audit logs, and reset Season 2 store to clean state
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gather_online_users') THEN
    EXECUTE 'TRUNCATE TABLE public.gather_online_users RESTART IDENTITY';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gather_audit_logs') THEN
    EXECUTE 'TRUNCATE TABLE public.gather_audit_logs RESTART IDENTITY';
  END IF;
END $$;

UPDATE gather_private.season2_store
SET state = '{"players":{},"enemies":{},"drops":{},"tasks":{},"rate":{}}'::jsonb,
    revision = 0,
    updated_at = now()
WHERE id = true;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'gather_private' AND tablename = 'season2_receipts') THEN
    EXECUTE 'TRUNCATE TABLE gather_private.season2_receipts';
  END IF;
END $$;
