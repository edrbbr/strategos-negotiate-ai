ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS pipeline_error jsonb;

-- Make sure realtime delivers full new-row payloads so the UI can react to stage writes.
ALTER TABLE public.cases REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'cases'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.cases';
  END IF;
END$$;
