-- Créer le bucket pour les samples audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('samples', 'samples', false)
ON CONFLICT (id) DO NOTHING;

-- Ajouter la colonne storage_path si elle n'existe pas
ALTER TABLE public.samples
ADD COLUMN IF NOT EXISTS storage_path text;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view their audio samples" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their audio samples" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their audio samples" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their audio samples" ON storage.objects;

-- Créer les policies pour le bucket samples
CREATE POLICY "Users can view their audio samples"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'samples'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their audio samples"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'samples'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their audio samples"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'samples'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their audio samples"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'samples'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );