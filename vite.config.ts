/// <reference types="node" />
import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

const ASSET_MODULE = 'virtual:asset-files';
const RESOLVED_ASSET_MODULE = `\0${ASSET_MODULE}`;
const PUBLIC_DIR = join(process.cwd(), 'public');
const ASSET_DIR = join(PUBLIC_DIR, 'assets');

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const path = join(dir, item.name);
    return item.isDirectory() ? listFiles(path) : [relative(PUBLIC_DIR, path).split(sep).join('/')];
  });
}

/**
 * Lists the generated images and music in public/assets (CLAUDE.md rule 8),
 * so the game loads only files that exist. A file added during development
 * reloads the page. A new file needs no code change.
 */
function assetFiles(): Plugin {
  return {
    name: 'asset-files',
    resolveId: (id) => (id === ASSET_MODULE ? RESOLVED_ASSET_MODULE : undefined),
    load: (id) => (id === RESOLVED_ASSET_MODULE ? `export default ${JSON.stringify(listFiles(ASSET_DIR))};` : undefined),
    configureServer(server) {
      server.watcher.add(ASSET_DIR);
      const refresh = (path: string): void => {
        if (!path.startsWith(ASSET_DIR)) return;
        const module = server.moduleGraph.getModuleById(RESOLVED_ASSET_MODULE);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}

// Relative base path: the same build works at a domain root and under a
// sub-path such as GitHub Pages (/<repo>/).
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 4000,
  },
  plugins: [
    assetFiles(),
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
