// Addis Plugin Utilities
// File detection, binary finding, and other helper functions

import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { out } from '@tananetwork/stdio'

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Auto-detect stylesheet path from common locations
 * Returns the first stylesheet found, or null if none exist
 */
export function detectStylesheet(root: string): string | null {
  // Paths relative to Vite's root directory
  // Note: When root is 'public/', files there are served directly (styles.css → /styles.css)
  // When root is '.', public/ files are served without prefix (public/styles.css → /styles.css)
  const commonPaths = [
    'styles.css',         // Direct in root (when root: 'public')
    'index.css',          // Alternative direct in root
    'public/styles.css',  // Tana default (when root: '.')
    'public/index.css',   // Alternative in public
    'src/styles.css',     // Tailwind default (deprecated)
    'src/index.css',      // Create React App default
    'src/main.css',       // Common alternative
    'src/app.css',        // Another common name
    'src/global.css',     // Global styles
    'styles/globals.css', // Next.js convention
  ]

  for (const stylePath of commonPaths) {
    const fullPath = path.join(root, stylePath)
    if (fs.existsSync(fullPath)) {
      out.log('config', `auto-detected stylesheet: ${stylePath}`)
      // Files in public/ are served at root URL (without public/ prefix)
      if (stylePath.startsWith('public/')) {
        return `/${stylePath.slice(7)}` // Remove 'public/' prefix
      }
      // Direct files in root are served at their path
      return `/${stylePath}`
    }
  }

  return null
}

/**
 * Find tana-edge binary - checks node_modules first, then plugin's own node_modules, then PATH
 */
export function findTanaEdgeBinary(root: string): string {
  const platform = process.platform
  const arch = process.arch
  const platformMap: Record<string, string> = {
    'darwin-arm64': 'darwin-arm64',
    'darwin-x64': 'darwin-x64',
    'linux-x64': 'linux-x64',
    'linux-arm64': 'linux-arm64',
    'win32-x64': 'windows-x64',
  }
  const platformKey = `${platform}-${arch}`
  const platformPkg = platformMap[platformKey]

  // Check node_modules/.bin first (where npm/bun links binaries)
  const binPath = path.join(root, 'node_modules', '.bin', 'tana-edge')
  if (fs.existsSync(binPath)) {
    return binPath
  }

  if (platformPkg) {
    // Check consumer's node_modules for tana-edge-* packages
    const edgeBinPath = path.join(
      root,
      'node_modules',
      '@tananetwork',
      `tana-edge-${platformPkg}`,
      'tana-edge'
    )
    if (fs.existsSync(edgeBinPath)) {
      return edgeBinPath
    }

    // Check plugin's own node_modules (for file: linked installs)
    // __dirname in ESM is not available, so we use a path relative to this file
    const pluginRoot = path.resolve(__dirname, '..')
    const pluginEdgePath = path.join(
      pluginRoot,
      'node_modules',
      '@tananetwork',
      `tana-edge-${platformPkg}`,
      'tana-edge'
    )
    if (fs.existsSync(pluginEdgePath)) {
      return pluginEdgePath
    }

    // Fall back to legacy tana-* packages in consumer
    const legacyBinPath = path.join(
      root,
      'node_modules',
      '@tananetwork',
      `tana-${platformPkg}`,
      'tana-edge'
    )
    if (fs.existsSync(legacyBinPath)) {
      return legacyBinPath
    }
  }

  // Fall back to PATH
  return 'tana-edge'
}

/**
 * Auto-detect server entry point
 * Looks for: blockchain/get.tsx, blockchain/get.ts, src/get.tsx, src/get.ts
 */
export function findServerEntry(root: string): string | null {
  const candidates = [
    'blockchain/get.tsx',
    'blockchain/get.ts',
    'src/get.tsx',
    'src/get.ts',
  ]

  for (const candidate of candidates) {
    const fullPath = path.join(root, candidate)
    if (fs.existsSync(fullPath)) {
      return fullPath
    }
  }

  return null
}

/**
 * Auto-detect client entry point
 * Looks for: src/client.tsx, src/client.ts
 */
export function findClientEntry(root: string): string | null {
  const candidates = [
    'src/client.tsx',
    'src/client.ts',
  ]

  for (const candidate of candidates) {
    const fullPath = path.join(root, candidate)
    if (fs.existsSync(fullPath)) {
      return fullPath
    }
  }

  return null
}
