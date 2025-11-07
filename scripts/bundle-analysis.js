/**
 * Bundle Analysis Script
 * Analyzes the production build to identify optimization opportunities
 * 
 * Usage: npm run analyze
 */

import { build } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('🔍 Starting bundle analysis...\n');

try {
  // Build with visualizer
  await build({
    configFile: resolve(process.cwd(), 'vite.config.ts'),
    plugins: [
      visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // 'sunburst' | 'treemap' | 'network'
      }),
    ],
  });

  console.log('✅ Bundle analysis complete!');
  console.log('📊 Open dist/stats.html in your browser to view the analysis\n');
  
  // Try to read package.json for dependency info
  try {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')
    );
    
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});
    
    console.log('📦 Dependencies:');
    console.log(`   Production: ${dependencies.length} packages`);
    console.log(`   Development: ${devDependencies.length} packages\n`);
    
    // Identify potential tree-shaking opportunities
    const largeLibraries = [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'recharts',
      'lucide-react',
    ];
    
    const foundLargeLibs = largeLibraries.filter(lib => 
      dependencies.includes(lib) || devDependencies.includes(lib)
    );
    
    if (foundLargeLibs.length > 0) {
      console.log('💡 Potential optimization opportunities:');
      foundLargeLibs.forEach(lib => {
        console.log(`   - ${lib}: Consider tree-shaking or lazy loading`);
      });
    }
  } catch (err) {
    // Ignore if package.json can't be read
  }
  
} catch (error) {
  console.error('❌ Error during bundle analysis:', error);
  process.exit(1);
}

