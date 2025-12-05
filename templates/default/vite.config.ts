import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tanaPlugin from '@tananetwork/vite-plugin-tana'

export default defineConfig({
  root: 'public',
  plugins: [
    react(),
    tanaPlugin({
      // Use local tana-edge binary for development
      edgeBinary: '/Users/samifouad/Projects/tana/edge/target/release/tana-edge',
    }),
  ],
})
