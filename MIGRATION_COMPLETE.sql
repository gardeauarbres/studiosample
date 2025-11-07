-- ============================================
-- MIGRATION COMPLÈTE - Studio Samples
-- ============================================
-- Copiez-collez ce fichier dans Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- ÉTAPE 1 : Migration principale
-- ============================================
-- Copiez-collez tout ce bloc et exécutez-le

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

-- ============================================
-- ÉTAPE 2 : Index de performance
-- ============================================
-- ⚠️ IMPORTANT : Exécutez CHAQUE commande UNE PAR UNE
-- Attendez que chaque index soit créé avant de passer au suivant
-- ============================================

-- INDEX 1/3 - Exécutez cette commande et attendez qu'elle se termine
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_objects_bucket_id
  ON storage.objects (bucket_id);

-- INDEX 2/3 - Exécutez APRÈS que le premier soit terminé
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_objects_owner_id
  ON storage.objects (owner_id);

-- INDEX 3/3 - Exécutez APRÈS que le deuxième soit terminé
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_objects_bucket_owner
  ON storage.objects (bucket_id, owner_id);

-- ============================================
-- ÉTAPE 3 : Vérification
-- ============================================
-- Exécutez ces requêtes pour vérifier que tout est OK

-- Vérifier le bucket
SELECT id, name, public FROM storage.buckets WHERE id = 'audio-samples';

-- Vérifier la colonne storage_path
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'samples' AND column_name = 'storage_path';

-- Vérifier les policies (doit retourner 3 lignes)
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%audio samples%'
ORDER BY policyname;

-- Vérifier les index (doit retourner 3 lignes)
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND indexname LIKE 'idx_storage_objects%'
ORDER BY indexname;

