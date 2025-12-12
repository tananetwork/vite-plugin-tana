/**
 * Tana Framework Production Build Script (RSC)
 *
 * Produces a unified contract bundle that runs on tana-edge:
 *   - contract.js : Unified RSC contract with 5 exports (init, contract, Page, get, post)
 *   - client.js   : Client bundle for browser hydration via Flight protocol
 *   - index.html  : HTML shell with proper references
 *   - styles.css  : Extracted CSS (when applicable)
 *
 * Usage:
 *   npx tana-build --root ./my-app --out dist --id my-app
 *   npm run build  (with package.json configuration)
 */

import { build, BuildOptions } from 'esbuild'
import * as fs from 'fs'
import * as path from 'path'
import { scanProject, generateContract } from './generator.js'

export interface TanaBuildConfig {
  /** Project root directory (containing app/, api/, blockchain/ folders) */
  root: string
  /** Entry point for client (hydration code) */
  clientEntry: string
  /** Output directory */
  outDir: string
  /** Contract ID (used in tana-edge routing) */
  contractId: string
  /** Minify client bundle for production (server bundle is never minified for tana-edge compatibility) */
  minify?: boolean
  /** Base URL for static assets */
  publicPath?: string
  /** CSS entry file (optional - if not provided, extracts from components) */
  cssEntry?: string
}

export interface BuildResult {
  contractBundle: string
  clientBundle: string
  htmlShell: string
  cssBundle: string | null
  contractDir: string
  stats: {
    contractSize: number
    clientSize: number
    cssSize: number
    buildTime: number
  }
}

/**
 * Build a Tana app for production deployment
 */
export async function tanaBuild(config: TanaBuildConfig): Promise<BuildResult> {
  const startTime = Date.now()
  const {
    root,
    clientEntry,
    outDir,
    contractId,
    minify = true,
    publicPath = '/',
  } = config

  const contractDir = path.join(outDir, contractId)

  // Determine actual project root: if root is a subdirectory (e.g., 'public'),
  // look for app/api/blockchain directories in the parent
  const potentialProjectRoot = path.dirname(root)
  const hasAppDir = fs.existsSync(path.join(potentialProjectRoot, 'app'))
  const hasApiDir = fs.existsSync(path.join(potentialProjectRoot, 'api'))
  const hasBlockchainDir = fs.existsSync(path.join(potentialProjectRoot, 'blockchain'))

  const projectRoot = (hasAppDir || hasApiDir || hasBlockchainDir)
    ? potentialProjectRoot
    : root

  // Ensure output directory exists
  fs.mkdirSync(contractDir, { recursive: true })

  console.log(`\n🔨 Building ${contractId}`)

  // ========== 1. Scan Project Structure ==========
  const structure = await scanProject(projectRoot)

  // ========== 2. Generate Unified Contract ==========
  // IMPORTANT: Server bundles are NEVER minified because tana-edge's ESM import
  // rewriter uses regex patterns that expect imports on separate lines.
  // All code is inlined for maximum performance (zero I/O during execution)
  console.log('\n📦 Generating unified contract.js...')

  const { contractPath, clientBundlePath: clientComponentsPath } = await generateContract(structure, contractDir)
  const contractSize = fs.statSync(contractPath).size

  console.log(`   ✓ Contract: ${(contractSize / 1024).toFixed(1)} KB`)

  if (clientComponentsPath) {
    const clientComponentsSize = fs.statSync(clientComponentsPath).size
    console.log(`   ✓ Client Components: ${(clientComponentsSize / 1024).toFixed(1)} KB`)
  }

  // ========== 2. Build Client Bundle ==========
  // Full React bundle for browser - needs to match server rendering
  console.log('📦 Building client bundle (client.js)...')

  const clientBuildOptions: BuildOptions = {
    entryPoints: [clientEntry],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    outfile: path.join(contractDir, 'client.js'),
    jsx: 'automatic',
    minify,
    sourcemap: !minify,
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    banner: {
      js: `// Tana Client Bundle - Contract: ${contractId}\n`
    }
  }

  await build(clientBuildOptions)
  const clientBundle = path.join(contractDir, 'client.js')
  const clientSize = fs.statSync(clientBundle).size

  console.log(`   ✓ Client: ${(clientSize / 1024).toFixed(1)} KB`)

  // ========== 3. Extract/Build CSS ==========
  // For now, we'll check if a CSS file exists alongside the entry
  let cssBundle: string | null = null
  let cssSize = 0

  const possibleCssFiles = [
    config.cssEntry,
    path.join(root, 'styles.css'),
    path.join(root, 'src/styles.css'),
    path.join(root, 'index.css'),
    path.join(root, 'src/index.css'),
  ].filter(Boolean) as string[]

  for (const cssFile of possibleCssFiles) {
    if (fs.existsSync(cssFile)) {
      console.log('📦 Copying CSS bundle (styles.css)...')
      const cssContent = fs.readFileSync(cssFile, 'utf8')
      cssBundle = path.join(contractDir, 'styles.css')
      fs.writeFileSync(cssBundle, cssContent)
      cssSize = cssContent.length
      console.log(`   ✓ CSS: ${(cssSize / 1024).toFixed(1)} KB`)
      break
    }
  }

  // ========== 4. Generate HTML Shell ==========
  console.log('📦 Generating HTML shell (index.html)...')

  const htmlShell = generateHtmlShell({
    contractId,
    publicPath,
    hasCSS: cssBundle !== null,
  })

  const htmlPath = path.join(contractDir, 'index.html')
  fs.writeFileSync(htmlPath, htmlShell)
  console.log(`   ✓ HTML: ${(htmlShell.length / 1024).toFixed(1)} KB`)

  // ========== Build Complete ==========
  const buildTime = Date.now() - startTime

  console.log(`\n✅ Build complete in ${buildTime}ms`)
  console.log(`\n📁 Output: ${contractDir}/`)
  console.log(`   contract.js - Unified RSC contract (5 exports: init, contract, Page, get, post)`)
  console.log(`   client.js   - Client bundle (hydration)`)
  console.log(`   index.html  - HTML shell`)
  if (cssBundle) {
    console.log(`   styles.css  - Styles`)
  }

  console.log(`\n🚀 Deploy to tana-edge:`)
  console.log(`   cp -r ${contractDir} /path/to/contracts/`)
  console.log(`   # RSC requests: http://localhost:8516/rsc/${contractId}`)
  console.log(`   # API requests: http://localhost:8516/${contractId}/api/*\n`)

  return {
    contractBundle: contractPath,
    clientBundle,
    htmlShell: htmlPath,
    cssBundle,
    contractDir,
    stats: {
      contractSize,
      clientSize,
      cssSize,
      buildTime,
    }
  }
}

/**
 * Generate the HTML shell document
 * This is what gets served on initial page load
 *
 * For tana-edge, static files are served from the same path as the contract.
 * In production: https://{contractId}.tana.network/client.js
 * In local dev:  http://localhost:8516/{contractId}/client.js
 *
 * Paths are relative so they work in both scenarios.
 */
function generateHtmlShell(options: {
  contractId: string
  publicPath: string
  hasCSS: boolean
}): string {
  const { contractId, hasCSS } = options

  // Use relative paths so they work with both:
  // - subdomain routing (https://my-app.tana.network/client.js)
  // - path routing (http://localhost:8516/rsc/my-app/client.js)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${contractId}</title>
  ${hasCSS ? `<link rel="stylesheet" href="styles.css">` : ''}
  <script type="module" src="client.js" defer></script>
</head>
<body>
  <div id="root">
    <!-- Server-rendered content will be streamed here -->
    <div class="loading" style="padding: 20px; text-align: center; color: #666;">
      Loading...
    </div>
  </div>
</body>
</html>
`
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2)

  // Parse CLI arguments
  const getArg = (name: string): string | undefined => {
    const idx = args.indexOf(`--${name}`)
    if (idx !== -1 && args[idx + 1]) {
      return args[idx + 1]
    }
    return undefined
  }

  const hasFlag = (name: string): boolean => {
    return args.includes(`--${name}`)
  }

  if (hasFlag('help') || args.length === 0) {
    console.log(`
Tana Build - Production bundler for tana-edge

Usage:
  tana-build --root ./my-app --client src/client.tsx --out dist --id my-app

Options:
  --root <path>     Project root (containing app/, api/, blockchain/ folders)
  --client <path>   Client entry point (hydration code)
  --out <dir>       Output directory
  --id <name>       Contract ID (folder name in contracts/)
  --no-minify       Skip client bundle minification (server is never minified)
  --public <path>   Public path for assets (default: /)
  --help            Show this help

Directory Structure:
  app/              RSC pages (file-based routing)
  api/              API endpoints (get.ts, post.ts per route)
  blockchain/       On-chain logic (init.ts, contract.ts)

Output:
  contract.js       Unified RSC contract with 5 exports (init, contract, Page, get, post)
  client.js         Client bundle for browser hydration
  index.html        HTML shell
  styles.css        Extracted styles (if present)

Note: Server bundles are never minified for tana-edge ESM import compatibility.
Client bundles are minified by default for optimal browser delivery.

Example:
  tana-build --root ./my-app --client src/client.tsx --out dist --id blog-app
`)
    process.exit(0)
  }

  const root = getArg('root') || process.cwd()
  const clientEntry = getArg('client')
  const outDir = getArg('out') || 'dist'
  const contractId = getArg('id') || path.basename(process.cwd())
  const minify = !hasFlag('no-minify')
  const publicPath = getArg('public') || '/'

  if (!clientEntry) {
    console.error('Error: --client is required')
    process.exit(1)
  }

  try {
    await tanaBuild({
      root,
      clientEntry,
      outDir,
      contractId,
      minify,
      publicPath,
    })
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

// Run CLI if executed directly (ESM way)
// Check if this file is the entry point by checking for CLI arguments
const isMainModule = process.argv[1]?.includes('build')

if (isMainModule) {
  main()
}
