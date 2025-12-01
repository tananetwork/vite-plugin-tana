import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tanaPlugin from '@tananetwork/vite-plugin-tana'

export default defineConfig({
  plugins: [
    react(),
    tanaPlugin(),
  ],
})
