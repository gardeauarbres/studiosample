-- Migration complète pour Studio Samples
-- À exécuter dans psql (pas dans PowerShell!)

-- 1) Create bucket if missing (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-samples', 'audio-samples', false)
ON CONFLICT (id) DO NOTHING;

-- 2) Add storage_path column if missing (idempotent)
ALTER TABLE public.samples
ADD COLUMN IF NOT EXISTS storage_path text;

-- 3) Idempotent policy creation
DO $$
BEGIN
  -- View policy
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Users can view their audio samples'
      AND c.relname = 'objects'
      AND n.nspname = 'storage'
  ) THEN
    CREATE POLICY "Users can view their audio samples"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'audio-samples'
        AND auth.uid()::text = owner_id
      );
  END IF;

  -- Upload (insert) policy
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Users can upload their audio samples'
      AND c.relname = 'objects'
      AND n.nspname = 'storage'
  ) THEN
    CREATE POLICY "Users can upload their audio samples"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'audio-samples'
        AND auth.uid()::text = owner_id
      );
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE p.polname = 'Users can delete their audio samples'
      AND c.relname = 'objects'
      AND n.nspname = 'storage'
  ) THEN
    CREATE POLICY "Users can delete their audio samples"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'audio-samples'
        AND auth.uid()::text = owner_id
      );
  END IF;

END$$;

