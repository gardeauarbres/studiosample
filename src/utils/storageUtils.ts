/**
 * Utilitaires pour Supabase Storage
 * Gère l'upload, le téléchargement et la suppression de fichiers audio
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Génère le chemin de stockage pour un sample
 * Format: {user_id}/{sample_id}.{ext}
 */
export const generateStoragePath = (
  userId: string,
  sampleId: string,
  mimeType: string = 'audio/wav'
): string => {
  // Déterminer l'extension selon le type MIME
  let extension = 'wav';
  if (mimeType.includes('webm')) extension = 'webm';
  else if (mimeType.includes('mp3')) extension = 'mp3';
  else if (mimeType.includes('m4a')) extension = 'm4a';
  else if (mimeType.includes('ogg')) extension = 'ogg';
  
  return `${userId}/${sampleId}.${extension}`;
};

/**
 * Upload un blob audio vers Supabase Storage
 * @param blob - Le blob audio à uploader
 * @param userId - ID de l'utilisateur
 * @param sampleId - ID du sample
 * @param mimeType - Type MIME du fichier
 * @returns Le chemin de stockage si succès, null si erreur
 */
export const uploadAudioToStorage = async (
  blob: Blob,
  userId: string,
  sampleId: string,
  mimeType: string = 'audio/wav'
): Promise<string | null> => {
  try {
    const storagePath = generateStoragePath(userId, sampleId, mimeType);
    
    const { error } = await supabase.storage
      .from('samples')
      .upload(storagePath, blob, {
        contentType: mimeType,
        upsert: true, // Écrase si le fichier existe déjà
      });

    if (error) {
      console.error('[Storage] Upload error:', {
        path: storagePath,
        error: error.message,
      });
      
      // Messages d'erreur spécifiques
      if (error.message?.includes('Bucket not found')) {
        console.error('[Storage] ❌ BUCKET MANQUANT: Le bucket "samples" n\'existe pas dans Supabase Storage');
        console.error('[Storage] 🔧 SOLUTION: Exécutez QUICK_FIX_STORAGE.sql dans Supabase SQL Editor');
      } else if (error.message?.includes('Access forbidden') || error.message?.includes('permission')) {
        console.error('[Storage] ❌ ACCÈS REFUSÉ: Vérifiez les RLS policies du bucket');
      } else if (error.message?.includes('Unauthorized') || error.message?.includes('authentication')) {
        console.error('[Storage] ❌ NON AUTORISÉ: Vérifiez votre authentification');
      }
      
      return null;
    }

    return storagePath;
  } catch (error) {
    console.error('Error in uploadAudioToStorage:', error);
    return null;
  }
};

/**
 * Télécharge un blob audio depuis Supabase Storage
 * @param storagePath - Chemin du fichier dans Storage (format: {user_id}/{sample_id}.{ext})
 * @returns Le blob audio si succès, null si erreur
 */
export const downloadAudioFromStorage = async (
  storagePath: string
): Promise<Blob | null> => {
  try {
    console.log('[Storage] Downloading:', storagePath);
    
    const { data, error } = await supabase.storage
      .from('samples')
      .download(storagePath);

    if (error) {
      console.error('[Storage] Download error:', {
        path: storagePath,
        error: error.message,
      });
      
      // Log spécifique selon le type d'erreur
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        console.error('[Storage] File not found:', storagePath);
      } else if (error.message?.includes('forbidden') || error.message?.includes('permission')) {
        console.error('[Storage] Access forbidden - Check RLS policies');
      } else if (error.message?.includes('Unauthorized') || error.message?.includes('authentication')) {
        console.error('[Storage] Unauthorized - Check authentication');
      }
      
      return null;
    }

    if (!data) {
      console.warn('[Storage] No data returned for:', storagePath);
      return null;
    }

    console.log('[Storage] Successfully downloaded:', storagePath, `(${data.size} bytes)`);
    return data;
  } catch (error: any) {
    console.error('[Storage] Exception in downloadAudioFromStorage:', {
      path: storagePath,
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
};

/**
 * Supprime un fichier audio de Supabase Storage
 * @param storagePath - Chemin du fichier dans Storage
 * @returns true si succès, false si erreur
 */
export const deleteAudioFromStorage = async (
  storagePath: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('samples')
      .remove([storagePath]);

    if (error) {
      console.error('Error deleting from Storage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteAudioFromStorage:', error);
    return false;
  }
};

/**
 * Obtient l'URL publique d'un fichier (pour les buckets publics)
 * Note: Notre bucket est privé, donc cette fonction retourne null
 * Pour les buckets privés, utilisez downloadAudioFromStorage
 */
export const getPublicUrl = (_storagePath: string): string | null => {
  // Notre bucket est privé, donc on ne peut pas utiliser getPublicUrl
  // Utilisez downloadAudioFromStorage à la place
  return null;
};

