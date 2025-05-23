import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically update service worker when new content is available
      injectRegister: 'auto', // Injects service worker registration script
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'], // Precache these file types
        cleanupOutdatedCaches: true, // Remove outdated caches
      },
      manifest: {
        name: 'Fusion SQL PWA',
        short_name: 'FusionSQL',
        description: 'A lightweight SQL query tool for Oracle Fusion HCM via BI Publisher.',
        theme_color: '#1976d2', // Example: Material-UI primary color
        background_color: '#ffffff', // White background
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    })
  ],
  server: {
    port: 3001, // Optional: define a port for the frontend dev server
    // proxy: { // Optional: configure proxy if backend is on a different port during dev
    //   '/api': {
    //     target: 'http://localhost:3000', // Your backend server
    //     changeOrigin: true,
    //     // rewrite: (path) => path.replace(/^\/api/, '') // if your backend doesn't have /api prefix
    //   }
    // }
  },
  build: {
    outDir: 'build' // Optional: specify output directory for build
  }
})
