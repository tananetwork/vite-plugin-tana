import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tanaPlugin from '@tananetwork/vite-plugin-tana'
import path from 'path'

export default defineConfig({
  // Standard Tana project structure: app/, api/, blockchain/ at project root
  // Public assets go in public/ which Vite serves automatically
  plugins: [
    react(),
    tanaPlugin({
      // Use local tana-edge binary during development
      edgeBinary: path.resolve(__dirname, '../../../edge/target/release/tana-edge'),
    }),
  ],
})
