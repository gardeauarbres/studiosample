-- ============================================
-- COMMANDE 1/3 - Copiez et ex?cutez dans Supabase SQL Editor
-- IMPORTANT: Ex?cutez UNE PAR UNE, pas dans une transaction
-- ============================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_objects_bucket_id
  ON storage.objects (bucket_id);

-- ============================================
-- COMMANDE 2/3 - Attendez que la premi?re soit termin?e, puis copiez et ex?cutez
-- ============================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_objects_owner_id
  ON storage.objects (owner_id);

-- ============================================
-- COMMANDE 3/3 - Attendez que la deuxi?me soit termin?e, puis copiez et ex?cutez
-- ============================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_storage_objects_bucket_owner
  ON storage.objects (bucket_id, owner_id);

-- ============================================
-- V?RIFICATION - Ex?cutez apr?s avoir cr?? les 3 index
-- ============================================
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND indexname LIKE 'idx_storage_objects%'
ORDER BY indexname;
