import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  // Vercel aur modern hosting ke liye '/' behtar hai './' se
  base: '/', 
  server: {
    proxy: {
      // Ye proxy sirf LOCAL testing (npm run dev) ke waqt kaam karegi
      '/web': {
        target: 'https://test88.odoo.com',
        changeOrigin: true,
        secure: true, // Odoo HTTPS hai isliye true rakhen
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Digital Ledger',
        short_name: 'Ledger',
        description: 'Secure Odoo ERP Authentication for administrative ledger access',
        theme_color: '#f7f9fb',
        background_color: '#f7f9fb',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
