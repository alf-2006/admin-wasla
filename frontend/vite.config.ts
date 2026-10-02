import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['wasla-logo.png', 'icons/icon-192.png', 'icons/icon-512.png'],
    manifest: false,
    workbox: {
      navigateFallback: '/index.html',
      runtimeCaching: [
        { urlPattern: /^https:\/\/[^/]+\.supabase\.co\//, handler: 'NetworkOnly' },
        { urlPattern: ({ request }) => request.mode === 'navigate', handler: 'NetworkFirst' },
      ],
    },
  })],
})
