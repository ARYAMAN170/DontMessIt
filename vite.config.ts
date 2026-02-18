import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'] // Caches all your UI files
      },
      manifest: {
        name: 'DontMessIt',
        short_name: 'DontMessIt',
        description: 'Campus Performance Nutrition',
        theme_color: '#0F172A',
        icons: [
          {
            src: '/image.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/image.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
