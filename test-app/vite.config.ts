import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Import our plugin from parent directory's dist (built output)
// In production, this would be: import tana from '@tananetwork/vite-plugin-tana'
import tana from '../dist/index.js'

export default defineConfig({
  plugins: [
    react(),
    tana({
      edgePort: 8082,
      dev: true,
    }),
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
    },
  },
})
