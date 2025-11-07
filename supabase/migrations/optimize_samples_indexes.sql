-- ============================================
-- OPTIMISATIONS SUPABASE POUR VIRTUALISATION
-- Date: 2025-11-02
-- Description: Index pour améliorer les performances des requêtes samples
-- ============================================

-- 1. Index composite sur user_id + timestamp (RECOMMANDÉ - HAUTE PRIORITÉ)
-- Améliore les requêtes: .eq('user_id', userId).order('timestamp', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_samples_user_timestamp 
ON public.samples(user_id, timestamp DESC);

-- 2. Index partiel pour les favoris (OPTIONNEL - BASSE PRIORITÉ)
-- Améliore les requêtes filtrant par is_favorite = true
CREATE INDEX IF NOT EXISTS idx_samples_favorites 
ON public.samples(user_id, is_favorite) 
WHERE is_favorite = true;

-- 3. Index sur user_id seul (déjà peut-être présent, mais utile pour les jointures)
CREATE INDEX IF NOT EXISTS idx_samples_user_id 
ON public.samples(user_id);

-- 4. Vérifier et ajouter mime_type si nécessaire
-- Le code utilise mime_type mais la colonne peut ne pas exister dans certaines migrations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'samples' 
        AND column_name = 'mime_type'
    ) THEN
        ALTER TABLE public.samples 
        ADD COLUMN mime_type TEXT DEFAULT 'audio/webm';
        
        RAISE NOTICE 'Colonne mime_type ajoutée à la table samples';
    ELSE
        RAISE NOTICE 'Colonne mime_type existe déjà';
    END IF;
END $$;

-- ============================================
-- VÉRIFICATION DES INDEX CRÉÉS
-- ============================================
-- Pour vérifier après exécution, exécutez cette requête :
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'samples' ORDER BY indexname;

