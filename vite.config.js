import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        globIgnores: ['**/screenshots/**', '**/sw.js'],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          store: ['./src/store/idb.js'],
        },
      },
    },
    chunkSizeWarningLimit: 200,
  },
  worker: { format: 'es' },
});
