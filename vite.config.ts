import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';
import MagicString from 'magic-string';
import { init, parse } from 'es-module-lexer';

const reactCdnModuleGlobals: Record<string, string> = {
  'react': 'window.React',
  'react/jsx-runtime': 'window.ReactJSXRuntime',
  'react/jsx-dev-runtime': 'window.ReactJSXRuntime',
  'react-dom': 'window.ReactDOM',
  'react-dom/client': 'window.ReactDOM',
};

function buildReactCdnReplacement(importStatement: string, globalVar: string): string {
  const trimmed = importStatement.trim();
  // side-effect only import, nothing to replace
  if (/^import\s+['"].*['"];?$/s.test(trimmed)) {
    return '';
  }
  const match = trimmed.match(/^import\s*(.*?)\s*from\s*['"].*['"];?$/s);
  if (!match) {
    return '';
  }
  let clause = match[1]?.trim() ?? '';
  if (!clause) {
    return '';
  }
  const replacements: string[] = [];

  // Namespace import: * as React
  if (clause.startsWith('*')) {
    const nsMatch = clause.match(/^\*\s+as\s+([A-Za-z0-9_$]+)/);
    if (nsMatch) {
      replacements.push(`const ${nsMatch[1]} = ${globalVar};`);
    }
    return replacements.join('\n');
  }

  // Default + named imports
  let defaultImport = '';
  let namedImports = '';
  const hasBraces = clause.includes('{');

  if (hasBraces) {
    const beforeBrace = clause.slice(0, clause.indexOf('{')).trim();
    const braceContent = clause.slice(clause.indexOf('{') + 1, clause.lastIndexOf('}')).trim();
    if (beforeBrace) {
      defaultImport = beforeBrace.replace(/,$/, '').trim();
    }
    if (braceContent) {
      namedImports = braceContent;
    }
  } else {
    defaultImport = clause.replace(/,$/, '').trim();
  }

  if (defaultImport && !/^type\b/.test(defaultImport)) {
    replacements.push(`const ${defaultImport} = ${globalVar};`);
  }

  if (namedImports) {
    const destructured = namedImports
      .split(',')
      .map((spec) => spec.trim())
      .filter(Boolean)
      .map((spec) => {
        if (/^type\b/.test(spec)) {
          return '';
        }
        if (spec.includes(' as ')) {
          const [original, alias] = spec.split(' as ').map((part) => part.trim());
          return `${original}: ${alias}`;
        }
        return spec;
      })
      .filter(Boolean)
      .join(', ');

    if (destructured) {
      replacements.push(`const { ${destructured} } = ${globalVar};`);
    }
  }

  return replacements.join('\n');
}

function reactCdnImportsPlugin() {
  return {
    name: 'react-cdn-imports',
    enforce: 'post' as const,
    resolveId(source: string) {
      if (source in reactCdnModuleGlobals) {
        return { id: source, external: true };
      }
      return null;
    },
    async transform(code: string, id: string) {
      if (!code.includes('react')) {
        return null;
      }

      if (id.endsWith('.json')) {
        return null;
      }

      if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
        return null;
      }

      await init;
      const [imports] = parse(code);
      if (!imports.length) {
        return null;
      }

      let magic: MagicString | null = null;
      let mutated = false;

      for (const imp of imports) {
        if (imp.d !== -1) {
          continue; // skip dynamic imports
        }

        const source = code.slice(imp.s, imp.e);
        const globalVar = reactCdnModuleGlobals[source];
        if (!globalVar) {
          continue;
        }

        const statement = code.slice(imp.ss, imp.se);

        if (/^import\s+type\b/.test(statement.trim())) {
          magic = magic || new MagicString(code);
          magic.remove(imp.ss, imp.se);
          mutated = true;
          continue;
        }

        const replacement = buildReactCdnReplacement(statement, globalVar);
        magic = magic || new MagicString(code);
        magic.remove(imp.ss, imp.se);
        if (replacement) {
          magic.appendLeft(imp.se, `${replacement}\n`);
        }
        mutated = true;
      }

      if (!mutated || !magic) {
        return null;
      }

      return {
        code: magic.toString(),
        map: magic.generateMap({ hires: true })
      };
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    reactCdnImportsPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'Studio Samples',
        short_name: 'Studio Samples',
        description: 'Enregistrez, gérez et téléchargez vos samples audio',
        theme_color: '#1c1917',
        background_color: '#1c1917',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache Supabase Storage audio files (priorité haute pour offline)
            // Format: https://ttlureonwctkvkqfklxy.supabase.co/storage/v1/object/samples/...
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/samples\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-audio-cache',
              expiration: {
                maxEntries: 200, // Augmenté pour plus de samples en cache
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 jours (fichiers audio ne changent pas)
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache Supabase Edge Functions (NetworkFirst avec timeout court)
            // Format: https://ttlureonwctkvkqfklxy.supabase.co/functions/v1/...
            urlPattern: /^https:\/\/.*\.supabase\.co\/functions\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-functions-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 // 1 heure (les fonctions peuvent changer)
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 5 // Timeout plus long pour les Edge Functions
            }
          },
          {
            // Cache Supabase REST API (exclut Storage et Functions déjà gérés)
            // Format: https://ttlureonwctkvkqfklxy.supabase.co/rest/v1/...
            urlPattern: /^https:\/\/.*\.supabase\.co\/(?!storage\/v1|functions\/v1).*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 jour
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 3
            }
          },
          {
            // Cache audio files par extension (pour fichiers audio externes)
            urlPattern: /\.(webm|wav|mp3|m4a|ogg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-external-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 jours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Force deduplication of React to prevent multiple instances
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Force React to be pre-bundled and deduplicated
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    exclude: [],
  },
  build: {
    // SOLUTION CDN: React est chargé depuis le CDN dans index.html
    // Le bundle contient toujours React, mais le CDN est chargé en premier
    // Le navigateur utilisera le React du CDN (déjà chargé) au lieu de le recharger
    rollupOptions: {
      output: {
        // Manual chunks pour optimiser le code splitting
        // React n'est plus dans les chunks car il vient du CDN
        manualChunks: (id) => {
          // Séparer les node_modules en chunks logiques
          if (id.includes('node_modules')) {
            // Ignorer les fichiers de service worker et PWA
            if (id.includes('workbox') || id.includes('vite-plugin-pwa')) {
              return;
            }
            
            // SOLUTION CDN: React est externalisé et chargé depuis le CDN
            // Plus besoin de gérer React dans les chunks
            // (React est maintenant dans index.html via CDN)
            if (
              id.includes('react/') || 
              id.includes('react-dom/') || 
              id.includes('scheduler/') ||
              id.includes('react/jsx-runtime') ||
              id.includes('react/index') ||
              id.includes('react-dom/index') ||
              id === 'react' ||
              id === 'react-dom' ||
              id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('react/jsx-dev-runtime')
            ) {
              // React est externalisé, ne pas le mettre dans un chunk
              // Il sera chargé depuis le CDN dans index.html
              return;
            }
            
            // Supabase - indépendant (~100 KB)
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            
            // React Query - dépend de React (~80 KB)
            if (id.includes('@tanstack')) {
              return 'vendor-query';
            }
            
            // Radix UI - dépend de React (~120 KB)
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            
            // React Router - dépend de React (~50 KB)
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            
            // Lucide React - indépendant (~80 KB)
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            
            // Dnd Kit - dépend de React (~40 KB)
            if (id.includes('@dnd-kit')) {
              return 'vendor-dnd';
            }
            
            // Recharts - peut dépendre de React (~150 KB)
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            
            // React Window - dépend de React (~30 KB)
            if (id.includes('react-window')) {
              return 'vendor-window';
            }
            
            // React Hook Form - dépend de React
            if (id.includes('react-hook-form')) {
              return 'vendor-forms';
            }
            
            // Utilitaires lourds
            if (
              id.includes('zod') ||
              id.includes('date-fns') ||
              id.includes('qrcode') ||
              id.includes('dompurify') ||
              id.includes('sonner')
            ) {
              return 'vendor-utils';
            }
            
            // Tout le reste
            return 'vendor-other';
          }
          
          // Séparer les composants audio lourds
          if (id.includes('/components/') && (
            id.includes('AudioRecorder') ||
            id.includes('RealtimeCollaborativeStudio') ||
            id.includes('MultiTrackMixer') ||
            id.includes('Sequencer')
          )) {
            return 'audio-features';
          }
        },
        
        // Optimisation des noms de fichiers pour un meilleur cache
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId 
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '') || 'chunk'
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Ne pas modifier les fichiers CSS - ils doivent rester dans assets/
          if (assetInfo.name && /\.css$/i.test(assetInfo.name)) {
            return 'assets/[name]-[hash][extname]';
          }
          
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `img/[name]-[hash][extname]`;
          }
          if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `fonts/[name]-[hash][extname]`;
          }
          // Par défaut, garder dans assets/ pour compatibilité
          return `assets/[name]-[hash][extname]`;
        },
      },
      
        // Garantir l'ordre de chargement des chunks
        // React doit être chargé avant tous les autres chunks
        preserveEntrySignatures: false,
    },
    
    // Compression avec esbuild (plus rapide que terser)
    minify: 'esbuild',
    target: 'esnext',
    
    // Source maps désactivés en production pour de meilleures performances
    sourcemap: false,
    
    // Limite de taille pour les warnings (500 KB par défaut)
    // Augmenté légèrement pour permettre des chunks jusqu'à 600 KB avant warning
    // Mais on vise à rester sous 500 KB avec la configuration manualChunks
    chunkSizeWarningLimit: 600,
    
    // Optimisation du CSS
    cssCodeSplit: true,
  },
}));
