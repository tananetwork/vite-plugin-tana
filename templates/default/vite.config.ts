import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import addisPlugin from '@tananetwork/vite-plugin-addis'

export default defineConfig({
  root: 'public',
  plugins: [
    react(),
    tailwindcss(),
    addisPlugin(),
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
