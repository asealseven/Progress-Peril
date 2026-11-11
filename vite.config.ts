import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// Relative base path: the same build works at a domain root and under a
// sub-path such as GitHub Pages (/<repo>/).
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 4000,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webp,woff,woff2,ogg,json}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        name: 'Progress & Peril',
        short_name: 'Progress & Peril',
        description: 'Every discovery has a consequence.',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: './',
        scope: './',
        background_color: '#2A2118',
        theme_color: '#2A2118',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'assets/icons/app/app-icon.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
  },
});
