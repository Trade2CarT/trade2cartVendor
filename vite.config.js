import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import sitemapPlugin from 'vite-plugin-sitemap'
import { VitePWA } from 'vite-plugin-pwa' // <-- IMPORT PWA PLUGIN

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    sitemapPlugin({
      hostname: 'https://vendor.trade2cart.in',
      // This will GENERATE a robots.txt file for you
      robots: [
        {
          userAgent: '*',
          allow: '/',
        }
      ]
    }),
    // --- ADD THIS PWA PLUGIN CONFIG ---
    VitePWA({
      registerType: 'autoUpdate',
      // This manifest will make your app installable
      manifest: {
        name: 'Trade2Cart Vendor',
        short_name: 'T2C Vendor',
        description: 'Manage scrap pickup leads for Trade2Cart.',
        theme_color: '#ffffff',
        // This uses the logo you have in /public/logo.PNG
        icons: [
          {
            src: 'logo.PNG',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.PNG',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})