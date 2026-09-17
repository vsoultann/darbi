import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { copyFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const API_TARGET = `http://127.0.0.1:${process.env.SERVER_PORT ?? 5174}`;
/** GitHub Pages serves from /<repo>/, Replit from /. */
const BASE = process.env.VITE_BASE ?? '/';

export default defineConfig({
  root: 'client',
  base: BASE,
  publicDir: 'public',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./client/src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    // shared/ lives outside the vite root, so dev-server file access must allow it
    fs: { allow: ['..'] },
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/socket.io': { target: API_TARGET, ws: true, changeOrigin: true },
    },
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/maplibre-gl')) return 'maplibre';
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion-')) return 'motion';
          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    {
      // GitHub Pages has no SPA rewrite; a copy of the shell named 404.html is the
      // standard way to keep /track/123456 working on a deep link.
      name: 'darbi-spa-404',
      apply: 'build',
      closeBundle() {
        const dist = fileURLToPath(new URL('./dist/client/', import.meta.url));
        copyFileSync(`${dist}index.html`, `${dist}404.html`);
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Never answer an API call, a socket upgrade or a hashed asset with index.html.
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/, /^\/assets\//],
        // Activate new workers straight away, but never claim a page that is mid-load:
        // a claiming worker whose precache is not populated yet serves index.html for
        // module scripts, which blanks the app on the very first visit.
        skipWaiting: true,
        clientsClaim: false,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'darbi-fonts', expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/.*basemaps\.cartocdn\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'darbi-tiles', expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 14 } },
          },
        ],
      },
      manifest: {
        id: BASE,
        name: 'Darbi · دربي',
        short_name: 'Darbi',
        description: 'More than just a bus tracking system.. it is peace of mind.',
        lang: 'en',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F7F2E9',
        theme_color: '#A67C3D',
        categories: ['education', 'navigation', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
