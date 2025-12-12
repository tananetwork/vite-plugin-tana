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
  server: {
    allowedHosts: true,
  },
})
