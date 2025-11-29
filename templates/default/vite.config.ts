import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tanaPlugin from 'vite-plugin-tana'

export default defineConfig({
  plugins: [
    react(),
    tanaPlugin({
      // Path to tana-edge binary (absolute or in PATH)
      edgeBinary: '/Users/samifouad/Projects/tana/edge/target/release/tana-edge',
      // Port for tana-edge
      edgePort: 8506,
      // Contract ID - maps to contracts/app/
      contractId: 'react-ssr',
      // Contracts directory (relative to this project)
      contractsDir: '../../contracts',
    }),
  ],
})
