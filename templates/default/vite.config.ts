import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tanaPlugin from '@tananetwork/vite-plugin-tana'

export default defineConfig({
  plugins: [
    react(),
    tanaPlugin({
      // tana-edge binary is automatically resolved from node_modules
      // For local development with a custom binary, uncomment:
      // edgeBinary: '/path/to/tana-edge',
    }),
  ],
})
