import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import sitemapPlugin from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    sitemapPlugin({
      hostname: 'https://vendor.trade2cart.in',
      robots: false
    })
  ],
})
