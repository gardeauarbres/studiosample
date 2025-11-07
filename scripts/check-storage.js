#!/usr/bin/env node

/**
 * Script de v?rification rapide du syst?me de stockage
 * 
 * Usage: node scripts/check-storage.js
 * 
 * Ce script v?rifie que:
 * - Les migrations sont appliqu?es
 * - Le bucket Storage existe
 * - Les fonctions de stockage sont accessibles
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('? Variables d\'environnement manquantes');
  console.error('Assurez-vous d\'avoir VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
  console.log('?? V?rification du syst?me de stockage...\n');

  // V?rifier que le bucket existe
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('? Erreur lors de la v?rification des buckets:', error.message);
      return;
    }

    const audioBucket = buckets.find(b => b.id === 'audio-samples');
    
    if (audioBucket) {
      console.log('? Bucket "audio-samples" existe');
      console.log(`   - Public: ${audioBucket.public}`);
      console.log(`   - Cr?? le: ${audioBucket.created_at}`);
    } else {
      console.log('? Bucket "audio-samples" introuvable');
      console.log('   ? Ex?cutez la migration: supabase/migrations/20241103000000_audio_storage_migration.sql');
    }
  } catch (error) {
    console.error('? Erreur:', error.message);
  }

  // V?rifier la colonne storage_path
  try {
    const { data, error } = await supabase
      .from('samples')
      .select('storage_path, blob_data')
      .limit(1);

    if (error) {
      console.error('? Erreur lors de la v?rification de la table samples:', error.message);
      return;
    }

    console.log('\n? Table "samples" accessible');
    console.log('   - Colonne storage_path disponible');
  } catch (error) {
    console.error('? Erreur:', error.message);
  }

  // Statistiques
  try {
    const { count, error } = await supabase
      .from('samples')
      .select('*', { count: 'exact', head: true });

    if (!error) {
      console.log(`\n?? Statistiques:`);
      console.log(`   - Total samples: ${count || 0}`);
    }
  } catch (error) {
    console.error('? Erreur lors du comptage:', error.message);
  }

  console.log('\n? V?rification termin?e!');
}

checkStorage().catch(console.error);
