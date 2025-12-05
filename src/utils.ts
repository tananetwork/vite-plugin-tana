// Tana Plugin Utilities
// File detection, binary finding, and other helper functions

import path from 'path'
import fs from 'fs'

/**
 * Auto-detect stylesheet path from common locations
 * Returns the first stylesheet found, or null if none exist
 */
export function detectStylesheet(root: string): string | null {
  const commonPaths = [
    'src/styles.css',     // Tailwind default
    'src/index.css',      // Create React App default
    'src/main.css',       // Common alternative
    'src/app.css',        // Another common name
    'src/global.css',     // Global styles
    'styles/globals.css', // Next.js convention
  ]

  for (const stylePath of commonPaths) {
    const fullPath = path.join(root, stylePath)
    if (fs.existsSync(fullPath)) {
      console.log(`[tana] Auto-detected stylesheet: ${stylePath}`)
      return `/${stylePath}`
    }
  }

  return null
}

/**
 * Find tana-edge binary - checks node_modules first, then PATH
 */
export function findTanaEdgeBinary(root: string): string {
  // Check node_modules/.bin first (where npm/bun links binaries)
  const binPath = path.join(root, 'node_modules', '.bin', 'tana-edge')
  if (fs.existsSync(binPath)) {
    return binPath
  }

  // Check platform-specific package directly
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

  if (platformPkg) {
    const platformBinPath = path.join(
      root,
      'node_modules',
      '@tananetwork',
      `tana-${platformPkg}`,
      'tana-edge'
    )
    if (fs.existsSync(platformBinPath)) {
      return platformBinPath
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
