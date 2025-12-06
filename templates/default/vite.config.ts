import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tanaPlugin from '@tananetwork/vite-plugin-tana'

export default defineConfig({
  root: 'public',
  plugins: [
    react(),
    tailwindcss(),
    tanaPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    allowedHosts: true, // Allow access from any hostname in dev mode
  },
})
