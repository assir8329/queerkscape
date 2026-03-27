import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [
      react(),
      tailwindcss(),

      VitePWA({
        registerType: 'autoUpdate',

        // ensures icons are included in build
        includeAssets: [
          'icons/icon-192.png',
          'icons/icon-512.png'
        ],

        manifest: {
          name: 'Hiraya',
          short_name: 'Hiraya',

          start_url: '/',        // ✅ REQUIRED
          scope: '/',            // ✅ IMPORTANT
          display: 'standalone',

          background_color: '#000000',
          theme_color: '#0f0f1a',

          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            }
          ]
        },

        // enables service worker in dev (optional but useful)
        devOptions: {
          enabled: true
        }
      })
    ],

    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});