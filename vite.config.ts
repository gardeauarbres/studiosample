import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
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
    rollupOptions: {
      output: {
        // Manual chunks pour optimiser le code splitting
        manualChunks: (id) => {
          // Séparer les node_modules en chunks logiques
          if (id.includes('node_modules')) {
            // Ignorer les fichiers de service worker et PWA
            if (id.includes('workbox') || id.includes('vite-plugin-pwa')) {
              return;
            }

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
