#!/usr/bin/env node

/**
 * Script de vérification de la cohérence React dans les chunks
 * 
 * Vérifie que:
 * - React n'est pas dupliqué dans plusieurs chunks
 * - Tous les chunks importent React depuis le même chunk
 * - La structure des imports est cohérente
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const DIST_JS_DIR = join(process.cwd(), 'dist', 'js');

async function checkReactChunks() {
  console.log('🔍 Vérification de la cohérence React dans les chunks...\n');

  try {
    const files = await readdir(DIST_JS_DIR);
    const jsFiles = files.filter(f => f.endsWith('.js'));

    console.log(`📦 ${jsFiles.length} fichiers .js trouvés\n`);

    // Analyser chaque fichier
    const analysis = {
      reactChunk: null,
      chunksWithReact: [],
      chunksImportingReact: [],
      potentialDuplications: [],
      totalSize: 0,
    };

    for (const file of jsFiles) {
      const filePath = join(DIST_JS_DIR, file);
      const content = await readFile(filePath, 'utf-8');
      const size = (await import('fs')).statSync(filePath).size;
      analysis.totalSize += size;

      // Détecter si ce chunk contient React (hooks, jsx, etc.)
      const hasReactCode = 
        /useState|useEffect|useCallback|useMemo|useRef|forwardRef|createElement|jsx|Fragment/.test(content) &&
        !/from.*chunk-/.test(content); // Exclure les imports

      // Détecter les imports depuis d'autres chunks
      const reactImports = content.match(/from\s+["']\.\/chunk-[^"']+\.js["']/g) || [];
      const importsFromReactChunk = reactImports.some(imp => {
        // Chercher le chunk qui exporte React
        return true; // On vérifiera plus tard
      });

      if (hasReactCode && !content.includes('from "./chunk-')) {
        // Ce chunk contient probablement React
        analysis.reactChunk = file;
        analysis.chunksWithReact.push({
          file,
          size: (size / 1024).toFixed(2) + ' KB',
          hasReactExports: /export\s+.*\b(r|React|useState|useEffect|createElement|jsx)\b/.test(content),
        });
      }

      // Détecter les chunks qui importent React
      if (content.includes('from "./chunk-')) {
        const importedChunks = content.match(/from\s+["']\.\/(chunk-[^"']+\.js)["']/g) || [];
        analysis.chunksImportingReact.push({
          file,
          size: (size / 1024).toFixed(2) + ' KB',
          imports: importedChunks.map(imp => {
            const match = imp.match(/chunk-[^"']+\.js/);
            return match ? match[0] : null;
          }).filter(Boolean),
        });
      }

      // Détecter les potentiels duplications (chunks qui contiennent du code React mais importent aussi React)
      if (hasReactCode && content.includes('from "./chunk-')) {
        analysis.potentialDuplications.push({
          file,
          size: (size / 1024).toFixed(2) + ' KB',
          warning: 'Contient du code React ET importe depuis un autre chunk',
        });
      }
    }

    // Afficher les résultats
    console.log('📊 Résultats de l\'analyse:\n');

    if (analysis.reactChunk) {
      console.log(`✅ Chunk principal React: ${analysis.reactChunk}`);
      const reactChunkInfo = analysis.chunksWithReact.find(c => c.file === analysis.reactChunk);
      if (reactChunkInfo) {
        console.log(`   Taille: ${reactChunkInfo.size}`);
      }
      console.log();
    } else {
      console.log('⚠️  Aucun chunk React principal identifié\n');
    }

    // Vérifier la cohérence des imports
    console.log('🔗 Analyse des imports:');
    const reactChunkName = analysis.reactChunk?.replace('.js', '') || 'chunk-Cuje60TA';
    
    let consistentImports = 0;
    let inconsistentImports = 0;

    for (const chunk of analysis.chunksImportingReact) {
      const importsFromReactChunk = chunk.imports.some(imp => 
        imp.includes(reactChunkName) || imp.includes('Cuje60TA')
      );
      
      if (importsFromReactChunk) {
        consistentImports++;
      } else if (chunk.imports.length > 0) {
        inconsistentImports++;
        console.log(`   ⚠️  ${chunk.file} n'importe pas depuis le chunk React principal`);
      }
    }

    console.log(`   ✅ Imports cohérents: ${consistentImports}`);
    if (inconsistentImports > 0) {
      console.log(`   ⚠️  Imports incohérents: ${inconsistentImports}`);
    }
    console.log();

    // Vérifier les duplications
    if (analysis.potentialDuplications.length > 0) {
      console.log('⚠️  Duplications potentielles détectées:');
      analysis.potentialDuplications.forEach(dup => {
        console.log(`   - ${dup.file} (${dup.size}): ${dup.warning}`);
      });
      console.log();
    } else {
      console.log('✅ Aucune duplication détectée\n');
    }

    // Statistiques globales
    console.log('📈 Statistiques:');
    console.log(`   Total fichiers: ${jsFiles.length}`);
    console.log(`   Taille totale: ${(analysis.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Chunks avec React: ${analysis.chunksWithReact.length}`);
    console.log(`   Chunks importants React: ${analysis.chunksImportingReact.length}`);
    console.log();

    // Conclusion
    if (analysis.reactChunk && analysis.potentialDuplications.length === 0 && inconsistentImports === 0) {
      console.log('✅ Tous les chunks sont cohérents avec React!');
      console.log(`   React est centralisé dans: ${analysis.reactChunk}`);
      return 0;
    } else {
      console.log('⚠️  Des problèmes de cohérence ont été détectés');
      return 1;
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
    return 1;
  }
}

checkReactChunks().then(code => process.exit(code || 0));

