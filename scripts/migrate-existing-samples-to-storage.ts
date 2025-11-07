/**
 * Script de migration des blobs existants vers Supabase Storage
 * 
 * Ce script migre tous les samples qui ont blob_data mais pas storage_path
 * vers Supabase Storage, puis met à jour la base de données.
 * 
 * Usage:
 * 1. Installer les dépendances: npm install
 * 2. Configurer les variables d'environnement dans .env.local
 * 3. Exécuter: npx tsx scripts/migrate-existing-samples-to-storage.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Charger les variables d'environnement
dotenv.config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Utiliser service role key pour bypass RLS

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('  - VITE_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n💡 Créez un fichier .env.local avec ces variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Sample {
  id: string;
  user_id: string;
  name: string;
  blob_data: string;
  mime_type: string | null;
  storage_path: string | null;
}

/**
 * Convertit base64 en Buffer (Node.js)
 */
function base64ToBuffer(base64: string): Buffer {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  return Buffer.from(base64Data, 'base64');
}

/**
 * Génère le chemin de stockage
 */
function generateStoragePath(userId: string, sampleId: string, mimeType: string = 'audio/wav'): string {
  let extension = 'wav';
  if (mimeType.includes('webm')) extension = 'webm';
  else if (mimeType.includes('mp3')) extension = 'mp3';
  else if (mimeType.includes('m4a')) extension = 'm4a';
  else if (mimeType.includes('ogg')) extension = 'ogg';
  
  return `${userId}/${sampleId}.${extension}`;
}

/**
 * Migre un sample vers Storage
 */
async function migrateSample(sample: Sample): Promise<boolean> {
  try {
    // Vérifier si déjà migré
    if (sample.storage_path) {
      console.log(`  ⏭️  Sample ${sample.id} déjà migré, ignoré`);
      return true;
    }

    // Vérifier si blob_data existe
    if (!sample.blob_data) {
      console.log(`  ⚠️  Sample ${sample.id} n'a pas de blob_data, ignoré`);
      return false;
    }

    // Convertir base64 en Buffer
    const mimeType = sample.mime_type || 'audio/webm';
    const buffer = base64ToBuffer(sample.blob_data);

    // Générer le chemin de stockage
    const storagePath = generateStoragePath(sample.user_id, sample.id, mimeType);

    // Upload vers Storage (le client Supabase Node.js accepte Buffer directement)
    const { error: uploadError } = await supabase.storage
      .from('samples')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`  ❌ Erreur upload Storage pour ${sample.id}:`, uploadError.message);
      return false;
    }

    // Mettre à jour la DB avec storage_path et supprimer blob_data
    const { error: updateError } = await supabase
      .from('samples')
      .update({
        storage_path: storagePath,
        blob_data: null, // Supprimer blob_data après migration
      })
      .eq('id', sample.id);

    if (updateError) {
      console.error(`  ❌ Erreur mise à jour DB pour ${sample.id}:`, updateError.message);
      // Essayer de supprimer le fichier Storage en cas d'erreur
      await supabase.storage.from('samples').remove([storagePath]);
      return false;
    }

    console.log(`  ✅ Sample ${sample.id} migré: ${(buffer.length / 1024).toFixed(2)} KB`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ Erreur lors de la migration de ${sample.id}:`, error.message);
    return false;
  }
}

/**
 * Migration principale
 */
async function migrateAllSamples() {
  console.log('🚀 Début de la migration vers Supabase Storage\n');

  try {
    // Récupérer tous les samples avec blob_data mais sans storage_path
    const { data: samples, error: fetchError } = await supabase
      .from('samples')
      .select('id, user_id, name, blob_data, mime_type, storage_path')
      .not('blob_data', 'is', null)
      .is('storage_path', null);

    if (fetchError) {
      console.error('❌ Erreur lors de la récupération des samples:', fetchError.message);
      process.exit(1);
    }

    if (!samples || samples.length === 0) {
      console.log('✅ Aucun sample à migrer !');
      return;
    }

    console.log(`📊 ${samples.length} samples à migrer\n`);

    let successCount = 0;
    let errorCount = 0;
    const batchSize = 10; // Traiter par batch pour éviter la surcharge

    // Traiter par batch
    for (let i = 0; i < samples.length; i += batchSize) {
      const batch = samples.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(samples.length / batchSize);

      console.log(`📦 Batch ${batchNumber}/${totalBatches} (${batch.length} samples)...`);

      const results = await Promise.all(
        batch.map(sample => migrateSample(sample as Sample))
      );

      successCount += results.filter(r => r).length;
      errorCount += results.filter(r => !r).length;

      // Pause entre les batches pour éviter la surcharge
      if (i + batchSize < samples.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n📊 Résumé de la migration:');
    console.log(`  ✅ Succès: ${successCount}`);
    console.log(`  ❌ Erreurs: ${errorCount}`);
    console.log(`  📦 Total: ${samples.length}`);

    if (errorCount === 0) {
      console.log('\n🎉 Migration terminée avec succès !');
    } else {
      console.log('\n⚠️  Migration terminée avec des erreurs. Vérifiez les logs ci-dessus.');
    }
  } catch (error: any) {
    console.error('\n❌ Erreur fatale lors de la migration:', error.message);
    process.exit(1);
  }
}

// Exécuter la migration
migrateAllSamples()
  .then(() => {
    console.log('\n✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  });

