import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import addisPlugin from '@tananetwork/vite-plugin-addis'
import path from 'path'

export default defineConfig({
  // Standard Addis project structure: app/, api/, blockchain/ at project root
  // Public assets go in public/ which Vite serves automatically
  plugins: [
    react(),
    tailwindcss(),
    addisPlugin({
      // Use local tana-edge binary during development
      edgeBinary: path.resolve(__dirname, '../../../edge/target/release/tana-edge'),
    }),
  ],
  server: {
    allowedHosts: true,
  },
})
