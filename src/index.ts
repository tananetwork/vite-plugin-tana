import type { Plugin, ViteDevServer } from 'vite'
import { spawn, ChildProcess } from 'child_process'
import { request as httpRequest } from 'http'
import path from 'path'
import fs from 'fs'
import { watch } from 'fs'
import { tanaBuild } from './build.js'
import { scanProject, generateContract, ProjectStructure } from './generator.js'

// Virtual module ID for client-side hydration
const VIRTUAL_HYDRATE_ID = 'virtual:tana-hydrate'
const RESOLVED_VIRTUAL_HYDRATE_ID = '\0' + VIRTUAL_HYDRATE_ID

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
}

export interface TanaPluginOptions {
  /**
   * Path to tana-edge binary
   * @default 'tana-edge' (assumes in PATH)
   */
  edgeBinary?: string

  /**
   * Port for tana-edge RSC server
   * @default 8506
   */
  edgePort?: number

  /**
   * Port for Vite dev server (for smart contract HTML injection)
   * @default 5173
   */
  vitePort?: number

  /**
   * Contract ID for RSC and API routing
   * In dev mode, this is the folder name (e.g., 'blockchain')
   * In production, this becomes the contract ID on the blockchain
   * @default 'blockchain'
   */
  contractId?: string

  /**
   * Path to contracts directory (parent of the contract folder)
   * tana-edge will look for {contractsDir}/{contractId}/
   * @default '.' (project root, so blockchain/ is found at ./blockchain/)
   */
  contractsDir?: string

  /**
   * Path to smart contract file (relative to project root)
   * The plugin will watch this file and copy it to the contracts directory
   * @default 'blockchain/smart-contract.tana'
   */
  smartContract?: string

  /**
   * Database connection URL
   */
  database?: string

  /**
   * Enable dev mode features
   * @default true
   */
  dev?: boolean

  /**
   * Path to main stylesheet (relative to src/)
   * Used for CSS injection to prevent Flash of Unstyled Content (FOUC)
   * If not specified, auto-detects from common paths:
   * - src/styles.css (Tailwind default)
   * - src/index.css
   * - src/main.css
   * - src/app.css
   * Set to false to disable stylesheet injection
   * @default auto-detect
   */
  stylesheet?: string | false
}

interface RouteManifest {
  routes: Array<{
    path: string
    component?: string    // page.tsx component (optional)
    get?: string         // get.ts handler (optional)
    post?: string        // post.ts handler (optional)
    layouts?: string[]   // layout chain from root → leaf (optional)
  }>
}

/**
 * Vite plugin for Tana framework
 *
 * Enables Rails-like full-stack development with:
 * - React Server Components (RSC) via tana-edge with Flight protocol streaming
 * - HMR for rapid development
 * - Pre-bundled React (no need to bundle React in contracts)
 */
/**
 * Auto-detect stylesheet path from common locations
 * Returns the first stylesheet found, or null if none exist
 */
function detectStylesheet(root: string): string | null {
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
function findTanaEdgeBinary(root: string): string {
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
function findServerEntry(root: string): string | null {
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
function findClientEntry(root: string): string | null {
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

export default function tanaPlugin(options: TanaPluginOptions = {}): Plugin {
  const {
    edgeBinary,
    edgePort = 8506,
    vitePort = 5173,
    contractId = 'blockchain',
    contractsDir,
    smartContract = 'blockchain/smart-contract.tana',
    database,
    dev = true,
    stylesheet,
  } = options

  // Will be resolved in configResolved hook
  let resolvedEdgeBinary: string
  let resolvedStylesheet: string | null = null
  let resolvedSmartContract: string
  let contractWatcher: fs.FSWatcher | null = null

  let tanaEdgeProcess: ChildProcess | null = null
  let viteServer: ViteDevServer
  let root: string
  let outDir: string
  let resolvedContractsDir: string
  let projectStructure: ProjectStructure | null = null

  // Track if tana-edge is ready
  let edgeReady = false
  let edgeReadyPromise: Promise<void>
  let resolveEdgeReady: () => void

  function resetEdgeReady() {
    edgeReady = false
    edgeReadyPromise = new Promise((resolve) => {
      resolveEdgeReady = resolve
    })
  }

  resetEdgeReady()

  return {
    name: 'vite-plugin-tana',

    config(config) {
      // Ensure React is properly configured
      return {
        esbuild: {
          jsx: 'automatic',
          jsxImportSource: 'react',
        },
        optimizeDeps: {
          include: ['react', 'react-dom', 'react-dom/client'],
        },
        build: {
          // Keep emptyOutDir false in case users have custom files in dist/
          // Our plugin writes to build/ directory (separate from Vite's dist/)
          emptyOutDir: false,
        },
      }
    },

    // Virtual module resolution for client-side hydration
    resolveId(id) {
      if (id === VIRTUAL_HYDRATE_ID) {
        return RESOLVED_VIRTUAL_HYDRATE_ID
      }
    },

    // Generate the virtual hydration module content
    load(id) {
      if (id === RESOLVED_VIRTUAL_HYDRATE_ID) {
        return generateHydrationModule(projectStructure, root)
      }
    },

    configResolved(config) {
      root = config.root
      outDir = path.join(root, '.tana')
      // Default to project root - tana-edge will look for {root}/blockchain/
      resolvedContractsDir = contractsDir
        ? path.resolve(root, contractsDir)
        : root

      // Resolve tana-edge binary: explicit option > node_modules > PATH
      resolvedEdgeBinary = edgeBinary || findTanaEdgeBinary(root)
      console.log(`[tana] Using tana-edge binary: ${resolvedEdgeBinary}`)

      // Resolve stylesheet: explicit path > auto-detect > null (disabled)
      if (stylesheet === false) {
        resolvedStylesheet = null
        console.log('[tana] Stylesheet injection disabled')
      } else if (typeof stylesheet === 'string') {
        // User specified a path - use it directly
        resolvedStylesheet = stylesheet.startsWith('/') ? stylesheet : `/${stylesheet}`
        console.log(`[tana] Using stylesheet: ${resolvedStylesheet}`)
      } else {
        // Auto-detect from common locations
        resolvedStylesheet = detectStylesheet(root)
        if (!resolvedStylesheet) {
          console.log('[tana] No stylesheet detected (Tailwind will work after creating src/styles.css)')
        }
      }
    },

    async buildStart() {
      // Ensure .tana directory exists
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true })
      }

      // Scan for routes and generate manifest
      const manifest = await scanRoutes(root)
      fs.writeFileSync(
        path.join(outDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      )

      console.log('[tana] Route manifest generated')
    },

    configureServer(server) {
      viteServer = server

      // Start tana-edge in dev mode
      if (dev) {
        // Generate initial contract before starting tana-edge
        // This ensures the contract.js exists for the first request
        // Use IIFE to properly await async operations in sync hook
        ;(async () => {
          await buildInitialContract()
          startTanaEdge()
        })()
      }

      // Print custom Tana banner when server is ready
      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address()
        const port = (typeof address === 'object' ? address?.port : undefined) ?? 5173

        // Wait a tick to let Vite print first, then override with our banner
        setTimeout(() => {
          printTanaBanner(port, edgePort)
        }, 100)
      })

      // Middleware to proxy /api requests to tana-edge
      // API requests are routed through tana-edge.
      // The generated Get() function detects /api paths and delegates to get()/post()
      server.middlewares.use(async (req, res, next) => {
        // Only handle /api/* requests
        if (!req.url || !req.url.startsWith('/api')) {
          return next()
        }

        // Wait for tana-edge to be ready
        if (!edgeReady) {
          console.log('[tana] Waiting for tana-edge to be ready...')
          await edgeReadyPromise
        }

        try {
          // Read request body for POST/PUT/PATCH requests
          let body: string | undefined
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            body = await new Promise<string>((resolve) => {
              let data = ''
              req.on('data', (chunk: Buffer) => {
                data += chunk.toString()
              })
              req.on('end', () => {
                resolve(data)
              })
            })
          }

          // Pass the full /api path to tana-edge
          // The Get() function will detect /api and route to get()/post() handlers
          const response = await proxyToEdge(req.url, req.method || 'GET', body)

          // Parse and return JSON response from API handler
          res.setHeader('Content-Type', 'application/json')
          res.end(response)
        } catch (error) {
          console.error('[tana] API Error:', error)
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'API request failed' }))
        }
      })

      // Middleware to proxy RSC page requests to tana-edge
      server.middlewares.use(async (req, res, next) => {
        // Skip for static assets, HMR, and Vite internals
        if (
          !req.url ||
          req.url.startsWith('/@') ||
          req.url.startsWith('/__') ||
          req.url.startsWith('/node_modules') ||
          req.url.startsWith('/src/') ||
          req.url.includes('.') // Has file extension
        ) {
          return next()
        }

        // Wait for tana-edge to be ready
        if (!edgeReady) {
          console.log('[tana] Waiting for tana-edge to be ready...')
          await edgeReadyPromise
        }

        try {
          // Proxy to tana-edge's /ssr/ endpoint (returns raw HTML)
          const html = await proxyToEdge(req.url, req.method || 'GET')

          // Inject Vite client scripts for HMR
          const injectedHtml = injectViteClient(html)

          res.setHeader('Content-Type', 'text/html')
          res.end(injectedHtml)
        } catch (error) {
          console.error('[tana] RSC Error:', error)
          next(error)
        }
      })
    },

    // Handle HMR (Feature #2: Watch app/, api/, blockchain/ directories)
    handleHotUpdate({ file }) {
      // If app/, api/, or blockchain/ code changed, rebuild the unified contract
      // This enables instant server-side updates during development

      // IMPORTANT: Exclude generated files to prevent infinite rebuild loops
      // The generator outputs ssr.js to blockchain/ - we must not watch it
      const isGeneratedFile = file.endsWith('/ssr.js') || file.endsWith('/contract.js')
      if (isGeneratedFile) {
        return undefined
      }

      const isAppFile = file.includes('/app/') && (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js'))
      const isApiFile = file.includes('/api/') && (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js'))
      // Only watch .ts/.tsx source files in blockchain/, not generated .js files
      const isBlockchainFile = file.includes('/blockchain/') && (file.endsWith('.tsx') || file.endsWith('.ts'))

      if (isAppFile || isApiFile || isBlockchainFile) {
        console.log(`[tana] Server code changed: ${path.relative(root, file)}`)
        rebuildUnifiedContract()
      }

      // Let Vite handle client-side HMR normally (src/ files)
      return undefined
    },

    // closeBundle is the FINAL Rollup/Vite hook - guaranteed to run after ALL
    // Rollup file operations are complete. Vite will await this if it's async.
    // We output to dist/blockchain/, then clean up Vite's redundant output.
    async closeBundle() {
      // Clean up tana-edge process
      if (tanaEdgeProcess) {
        tanaEdgeProcess.kill()
        tanaEdgeProcess = null
      }

      // Output to 'dist/' directory - same as Vite's output
      // emptyOutDir: false in config() prevents Vite from clearing our files
      const finalOutDir = contractsDir
        ? path.resolve(root, contractsDir)
        : path.join(root, 'dist')

      // Auto-detect client entry point
      let clientEntry = findClientEntry(root)
      let generatedClientEntry = false

      // If no client entry exists, generate one automatically
      // This provides the same DX as Astro/SvelteKit - no boilerplate needed
      if (!clientEntry) {
        console.log('[tana] No client entry found, generating auto-hydration entry...')

        // Scan project for pages (reuse existing structure if available)
        const structure = projectStructure || await scanProject(root)

        if (structure.pages.length === 0) {
          console.log('[tana] No pages found, skipping client bundle generation')
        } else {
          // Generate a temporary client entry file
          const tempClientPath = path.join(root, '.tana', 'client.tsx')
          fs.mkdirSync(path.dirname(tempClientPath), { recursive: true })

          const clientCode = generateClientEntryCode(structure, root)
          fs.writeFileSync(tempClientPath, clientCode)

          clientEntry = tempClientPath
          generatedClientEntry = true
          console.log(`[tana] Generated client entry: .tana/client.tsx`)
        }
      }

      if (!clientEntry) {
        console.log('[tana] ⚠️ No pages to hydrate, skipping production build')
        return
      }

      console.log('\n[tana] Production build starting...')
      console.log(`[tana] Project root: ${root}`)
      console.log(`[tana] Client entry: ${path.relative(root, clientEntry)}${generatedClientEntry ? ' (auto-generated)' : ''}`)
      console.log(`[tana] Output: ${finalOutDir}/${contractId}`)

      try {
        await tanaBuild({
          root,
          clientEntry,
          outDir: finalOutDir,
          contractId,
          minify: true,
          publicPath: '/',
        })

        // Clean up Vite's redundant output - we only need dist/blockchain/
        // Vite outputs assets/ and index.html which duplicate what's in blockchain/
        const distDir = path.join(root, 'dist')
        const assetsDir = path.join(distDir, 'assets')
        const viteIndexHtml = path.join(distDir, 'index.html')

        if (fs.existsSync(assetsDir)) {
          fs.rmSync(assetsDir, { recursive: true })
        }
        if (fs.existsSync(viteIndexHtml)) {
          fs.unlinkSync(viteIndexHtml)
        }

        console.log('[tana] ✅ Production build complete!\n')
      } catch (error) {
        console.error('[tana] ❌ Production build failed:', error)
      }
    },
  }

  /**
   * Build initial contract on dev server startup
   * This ensures contract.js exists before tana-edge starts serving requests
   */
  async function buildInitialContract() {
    try {
      console.log('[tana] Building initial contract...')

      // Scan project structure and store it for the hydration module
      projectStructure = await scanProject(root)
      const structure = projectStructure

      // Generate unified contract for dev
      const devOutDir = path.join(resolvedContractsDir, contractId)

      // Ensure output directory exists
      if (!fs.existsSync(devOutDir)) {
        fs.mkdirSync(devOutDir, { recursive: true })
      }

      // Generate the unified contract.js
      await generateContract(structure, devOutDir)

      console.log('[tana] ✅ Initial contract built')
      console.log(`[tana]    ${structure.pages.length} page(s), ${structure.apiGet.length} GET handler(s), ${structure.apiPost.length} POST handler(s)`)
    } catch (error) {
      console.error('[tana] ❌ Initial contract build failed:', error)
    }
  }

  /**
   * Start the actual tana-edge binary
   */
  function startTanaEdge() {
    console.log(`[tana] Starting tana-edge on port ${edgePort}...`)

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      EDGE_PORT: String(edgePort),
      // Tell tana-edge to look for contracts in cwd (project root)
      // So /_dev/blockchain finds ./blockchain/contract.js
      CONTRACTS_DIR: '.',
    }

    if (database) {
      env.DATABASE_URL = database
    }

    // Spawn tana-edge binary
    // Run from project root so /_dev/{contractId} finds {root}/{contractId}/contract.js
    tanaEdgeProcess = spawn(resolvedEdgeBinary, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
      cwd: resolvedContractsDir,
    })

    tanaEdgeProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      console.log('[tana-edge]', output.trim())

      // Detect when tana-edge is ready
      if (output.includes('tana-edge is running') || output.includes('listening')) {
        edgeReady = true
        resolveEdgeReady()
        console.log('[tana] ✅ tana-edge is ready!')
      }
    })

    tanaEdgeProcess.stderr?.on('data', (data) => {
      const output = data.toString()
      // tana-edge logs to stderr
      console.log('[tana-edge]', output.trim())

      // Also check stderr for ready message
      if (output.includes('tana-edge is running') || output.includes('listening')) {
        edgeReady = true
        resolveEdgeReady()
        console.log('[tana] ✅ tana-edge is ready!')
      }
    })

    tanaEdgeProcess.on('error', (error) => {
      console.error('[tana] Failed to start tana-edge:', error)
      console.error('[tana] Make sure tana-edge binary is in PATH or specify edgeBinary option')
    })

    tanaEdgeProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[tana] tana-edge exited with code ${code}`)
      }
      resetEdgeReady()
    })
  }

  /**
   * Proxy request to tana-edge's /_dev/ endpoint for local development
   * The /_dev/{contractId}/* endpoint returns raw HTML (not JSON-wrapped)
   */
  async function proxyToEdge(url: string, method: string, body?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Use /_dev/:contractId endpoint which returns raw HTML
      // /_dev is a pseudo-address for local development (no blockchain address yet)
      // tana-edge requires trailing slash for root path
      const ssrPath = `/_dev/${contractId}${url === '/' ? '/' : url}`

      const headers: Record<string, string> = {}
      if (body) {
        headers['Content-Type'] = 'application/json'
        headers['Content-Length'] = Buffer.byteLength(body).toString()
      }

      const req = httpRequest(
        {
          hostname: 'localhost',
          port: edgePort,
          path: ssrPath,
          method,
          headers,
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            // /ssr/ endpoint returns raw HTML directly
            resolve(data)
          })
        }
      )

      req.on('error', (err) => {
        reject(new Error(`Failed to proxy to tana-edge: ${err.message}`))
      })

      // Forward request body for POST/PUT/PATCH requests
      if (body) {
        req.write(body)
      }
      req.end()
    })
  }

  /**
   * Proxy API request to tana-edge
   * GET /api/* → runs blockchain/get.ts via tana-edge
   * POST /api/* → runs blockchain/post.ts via tana-edge
   */
  async function proxyApiToEdge(
    apiPath: string,
    method: string,
    req: any
  ): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
      // Determine which handler to call based on HTTP method
      const handlerFile = method === 'POST' ? 'post.js' : 'get.js'

      // tana-edge expects: /_dev/{contractId}/api/{handler}?path={apiPath}
      // /_dev is the pseudo-address for local development
      const edgePath = `/_dev/${contractId}/api/${handlerFile}${apiPath ? `?path=${encodeURIComponent(apiPath)}` : ''}`

      const headers: Record<string, string> = {
        'Content-Type': req.headers['content-type'] || 'application/json',
      }

      const proxyReq = httpRequest(
        {
          hostname: 'localhost',
          port: edgePort,
          path: edgePath,
          method,
          headers,
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            resolve({
              status: res.statusCode || 200,
              body: data,
            })
          })
        }
      )

      proxyReq.on('error', (err) => {
        reject(new Error(`Failed to proxy API to tana-edge: ${err.message}`))
      })

      // Forward request body for POST requests
      if (method === 'POST') {
        let body = ''
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString()
        })
        req.on('end', () => {
          proxyReq.write(body)
          proxyReq.end()
        })
      } else {
        proxyReq.end()
      }
    })
  }

  /**
   * Inject Vite's HMR client scripts, hydration, and stylesheet into the HTML
   */
  function injectViteClient(html: string): string {
    // Build stylesheet link if a stylesheet was detected/configured
    const stylesheetLink = resolvedStylesheet
      ? `<link rel="stylesheet" href="${resolvedStylesheet}">\n    `
      : ''

    // Inject Vite-processed stylesheet to prevent FOUC (Flash of Unstyled Content)
    // This ensures CSS loads immediately with the RSC HTML, not after JS hydration
    const viteAssets = `
    ${stylesheetLink}<script type="module" src="/@vite/client"></script>
    <script type="module">
      import RefreshRuntime from '/@react-refresh'
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="/@id/${VIRTUAL_HYDRATE_ID}"></script>
`
    return html.replace('</head>', `${viteAssets}</head>`)
  }

  /**
   * Rebuild unified contract when app/, api/, or blockchain/ files change (Feature #2: HMR)
   * This enables instant server-side updates during development
   */
  async function rebuildUnifiedContract() {
    try {
      console.log('[tana] 🔨 Rebuilding unified contract...')

      // Scan project structure and update for the hydration module
      projectStructure = await scanProject(root)
      const structure = projectStructure

      // Generate unified contract for dev
      const devOutDir = path.join(resolvedContractsDir, contractId)

      // Ensure output directory exists
      if (!fs.existsSync(devOutDir)) {
        fs.mkdirSync(devOutDir, { recursive: true })
      }

      // Generate the unified contract.js
      await generateContract(structure, devOutDir)

      console.log('[tana] ✅ Unified contract rebuilt')
      console.log(`[tana]    ${structure.pages.length} page(s), ${structure.apiGet.length} GET handler(s), ${structure.apiPost.length} POST handler(s)`)

      // Note: tana-edge creates fresh V8 isolates per request,
      // so the new bundle will be loaded automatically on next request
    } catch (error) {
      console.error('[tana] ❌ Server bundle rebuild failed:', error)
    }
  }
}

/**
 * Scan the project for routes (Feature #3: File-based routing from app/)
 *
 * Looks for:
 * - page.tsx/page.jsx - Page components
 * - get.ts/get.tsx - GET request handlers
 * - post.ts/post.tsx - POST request handlers
 *
 * Example structure:
 *   app/
 *     page.tsx       # Root page (/)
 *     get.ts         # GET handler for /
 *     blog/
 *       page.tsx     # Blog page (/blog)
 *       get.ts       # GET handler for /blog
 *       [id]/
 *         page.tsx   # Post page (/blog/:id)
 *         get.ts     # GET handler for /blog/:id
 */
async function scanRoutes(root: string): Promise<RouteManifest> {
  const routes: RouteManifest['routes'] = []
  const appDir = path.join(root, 'app')

  // Only scan app/ directory (not app/views or src)
  if (fs.existsSync(appDir)) {
    scanDir(appDir, '', routes)
  }

  return { routes }
}

/**
 * Recursively scan directory for route files
 * Supports:
 * - page.tsx/page.jsx - Page components
 * - get.ts/get.tsx - GET handlers
 * - post.ts/post.tsx - POST handlers
 * - layout.tsx/layout.jsx - Layout wrappers (nested from root → leaf)
 * - Dynamic routes: [param]/ directories
 */
function scanDir(
  dir: string,
  prefix: string,
  routes: RouteManifest['routes'],
  layouts: string[] = []  // Layout chain from root to current directory
) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  // Track handlers for this route
  let pageComponent: string | undefined
  let getHandler: string | undefined
  let postHandler: string | undefined
  let layoutComponent: string | undefined

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Skip special directories
      if (['components', 'lib', 'utils', 'styles'].includes(entry.name)) {
        continue
      }

      // Build layout chain for child directories
      // If this directory has a layout, pass it down to children
      const childLayouts = layoutComponent
        ? [...layouts, layoutComponent]
        : layouts

      // Handle dynamic route directories: [id]/
      if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
        const param = entry.name.slice(1, -1)
        scanDir(path.join(dir, entry.name), `${prefix}/:${param}`, routes, childLayouts)
      } else {
        // Regular directory
        scanDir(path.join(dir, entry.name), `${prefix}/${entry.name}`, routes, childLayouts)
      }
    } else {
      // Check for route files
      const fileName = entry.name

      if (fileName === 'page.tsx' || fileName === 'page.jsx') {
        pageComponent = path.join(dir, fileName)
      } else if (fileName === 'get.ts' || fileName === 'get.tsx') {
        getHandler = path.join(dir, fileName)
      } else if (fileName === 'post.ts' || fileName === 'post.tsx') {
        postHandler = path.join(dir, fileName)
      } else if (fileName === 'layout.tsx' || fileName === 'layout.jsx') {
        layoutComponent = path.join(dir, fileName)
      }
    }
  }

  // If we found any route files in this directory, add a route entry
  if (pageComponent || getHandler || postHandler) {
    // Add layout to the route if any exist in the chain
    const finalLayouts = layoutComponent
      ? [...layouts, layoutComponent]
      : layouts

    routes.push({
      path: prefix || '/',
      ...(pageComponent && { component: pageComponent }),
      ...(getHandler && { get: getHandler }),
      ...(postHandler && { post: postHandler }),
      ...(finalLayouts.length > 0 && { layouts: finalLayouts }),
    })
  }
}

/**
 * Print custom Tana startup banner
 */
function printTanaBanner(vitePort: number, edgePort: number) {
  const { reset, bold, magenta, cyan, green, gray, dim } = colors

  // Clear screen and move cursor to top
  console.log('\x1b[2J\x1b[H')

  // Print TANA ASCII art
  console.log(`${magenta}${bold}`)
  console.log('  ████████╗ █████╗ ███╗   ██╗ █████╗')
  console.log('  ╚══██╔══╝██╔══██╗████╗  ██║██╔══██╗')
  console.log('     ██║   ███████║██╔██╗ ██║███████║')
  console.log('     ██║   ██╔══██║██║╚██╗██║██╔══██║')
  console.log('     ██║   ██║  ██║██║ ╚████║██║  ██║')
  console.log('     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝')
  console.log(`${reset}`)

  console.log(`${gray}  React Server Components + Tailwind + TypeScript${reset}`)
  console.log()

  // Server info
  console.log(`${gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}`)
  console.log()
  console.log(`  ${green}➜${reset}  ${bold}Local:${reset}   ${cyan}http://localhost:${vitePort}/${reset}`)
  console.log(`  ${dim}➜${reset}  ${dim}Edge:${reset}    ${dim}http://localhost:${edgePort}/${reset}`)
  console.log()
  console.log(`${gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}`)
  console.log()
  console.log(`  ${gray}press${reset} ${bold}h${reset} ${gray}to show help${reset}`)
  console.log()
}

/**
 * Generate a virtual module for RSC client-side Flight parsing and hydration
 * This module fetches the Flight stream and reconstructs the React tree
 */
function generateHydrationModule(structure: ProjectStructure | null, root: string): string {
  if (!structure || structure.pages.length === 0) {
    // No pages found - return minimal module that doesn't hydrate
    return `// No pages found - nothing to hydrate
console.log('[tana] No pages to hydrate');
`
  }

  // For RSC, we don't import page components on the client
  // Server components stay on the server - we just receive the Flight stream
  // Only client components (marked with 'use client') need to be registered

  return `// Tana RSC Hydration Module (auto-generated)
// Uses Flight protocol to receive server-rendered component tree
import React from 'react';
import { createRoot } from 'react-dom/client';

// Flight protocol markers
const FLIGHT_ELEMENT = '$';
const FLIGHT_LAZY = '$L';
const FLIGHT_CLIENT_REF = '$C';
const FLIGHT_UNDEFINED = '$undefined';
const FLIGHT_PROMISE = '$@';

// Client component registry - populated by 'use client' components
const clientComponents = new Map();

// For dev, client components are registered globally by their modules
if (typeof window !== 'undefined') {
  window.__registerClientComponent = (moduleId, Component) => {
    clientComponents.set(moduleId, Component);
  };
}

// Row cache for Flight response
let rowCache = new Map();
let promiseCache = new Map();
let reactRoot = null;

function parseFlightRow(line) {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return null;
  const id = parseInt(line.slice(0, colonIndex), 10);
  const json = line.slice(colonIndex + 1);
  return { id, value: JSON.parse(json) };
}

function createStreamingPromise(id) {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  promise._resolve = resolve;
  promise._reject = reject;
  promise._id = id;
  return promise;
}

function flightToReact(value) {
  if (value === null) return null;
  if (value === FLIGHT_UNDEFINED) return undefined;

  if (typeof value === 'string') {
    if (value.startsWith(FLIGHT_LAZY)) {
      const id = parseInt(value.slice(2), 10);
      if (rowCache.has(id)) {
        return flightToReact(rowCache.get(id));
      }
      return React.createElement('div', { className: 'loading' }, 'Loading...');
    }
    if (value.startsWith(FLIGHT_PROMISE)) {
      const id = parseInt(value.slice(2), 10);
      if (!promiseCache.has(id)) {
        promiseCache.set(id, createStreamingPromise(id));
      }
      return promiseCache.get(id);
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    if (value[0] === FLIGHT_ELEMENT) {
      const [, type, key, props] = value;
      return createReactElement(type, key, props);
    }
    return value.map(item => flightToReact(item));
  }

  if (typeof value === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = flightToReact(v);
    }
    return result;
  }

  return value;
}

function createReactElement(type, key, props) {
  if (type === '$Suspense') {
    return React.createElement(
      React.Suspense,
      { key, fallback: flightToReact(props?.fallback) },
      flightToReact(props?.children)
    );
  }

  if (type.startsWith(FLIGHT_CLIENT_REF)) {
    const moduleId = type.slice(2);
    const Component = clientComponents.get(moduleId);
    if (!Component) {
      console.warn('[tana] Client component not registered:', moduleId);
      return React.createElement('div', { key, style: { color: 'red' } }, \`Missing: \${moduleId}\`);
    }
    const convertedProps = props ? flightToReact(props) : {};
    return React.createElement(Component, { key, ...convertedProps });
  }

  const convertedProps = props ? flightToReact(props) : {};
  const { children, ...restProps } = convertedProps;
  return React.createElement(type, { key, ...restProps }, children);
}

function render() {
  if (!rowCache.has(0)) return;
  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  if (!reactRoot) {
    reactRoot = createRoot(rootEl);
  }
  reactRoot.render(flightToReact(rowCache.get(0)));
}

async function loadPage() {
  // In dev mode, tana-edge serves RSC at the same path
  // The middleware handles routing to the RSC endpoint
  const pathname = window.location.pathname;

  // Fetch Flight stream from current URL
  // tana-edge returns Flight format for RSC requests
  const response = await fetch(pathname, {
    headers: { 'Accept': 'text/x-component' }
  });

  if (!response.ok) {
    console.error('[tana] RSC fetch failed:', response.status);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (line.trim()) {
        const row = parseFlightRow(line);
        if (row) {
          rowCache.set(row.id, row.value);
          render();
        }
      }
    }
  }

  if (buffer.trim()) {
    const row = parseFlightRow(buffer);
    if (row) {
      rowCache.set(row.id, row.value);
      render();
    }
  }
}

// Start loading when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadPage);
} else {
  loadPage();
}
`
}

/**
 * Generate client entry code for production RSC builds
 * This creates a standalone TypeScript file that esbuild can compile
 * Uses Flight protocol to receive and render server component output
 */
function generateClientEntryCode(structure: ProjectStructure, root: string): string {
  if (!structure || structure.pages.length === 0) {
    return `// No pages found - nothing to hydrate
console.log('[tana] No pages to hydrate');
`
  }

  // For RSC, we don't import server components
  // The Flight protocol sends the rendered tree from the server

  return `// Tana RSC Client Entry (auto-generated for production)
// Uses Flight protocol to receive server-rendered component tree
import React from 'react';
import { createRoot } from 'react-dom/client';

// Flight protocol markers
const FLIGHT_ELEMENT = '$';
const FLIGHT_LAZY = '$L';
const FLIGHT_CLIENT_REF = '$C';
const FLIGHT_UNDEFINED = '$undefined';
const FLIGHT_PROMISE = '$@';

// Client component registry
const clientComponents = new Map<string, React.ComponentType<any>>();

// Export for client components to register themselves
(window as any).__registerClientComponent = (moduleId: string, Component: React.ComponentType<any>) => {
  clientComponents.set(moduleId, Component);
};

// Row cache for Flight response
let rowCache = new Map<number, any>();
let promiseCache = new Map<number, any>();
let reactRoot: any = null;

function parseFlightRow(line: string): { id: number; value: any } | null {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return null;
  const id = parseInt(line.slice(0, colonIndex), 10);
  const json = line.slice(colonIndex + 1);
  return { id, value: JSON.parse(json) };
}

function createStreamingPromise(id: number) {
  let resolve: (value: any) => void;
  let reject: (reason: any) => void;
  const promise = new Promise((res, rej) => { resolve = res!; reject = rej!; });
  (promise as any)._resolve = resolve!;
  (promise as any)._reject = reject!;
  (promise as any)._id = id;
  return promise;
}

function flightToReact(value: any): any {
  if (value === null) return null;
  if (value === FLIGHT_UNDEFINED) return undefined;

  if (typeof value === 'string') {
    if (value.startsWith(FLIGHT_LAZY)) {
      const id = parseInt(value.slice(2), 10);
      if (rowCache.has(id)) {
        return flightToReact(rowCache.get(id));
      }
      return React.createElement('div', { className: 'loading' }, 'Loading...');
    }
    if (value.startsWith(FLIGHT_PROMISE)) {
      const id = parseInt(value.slice(2), 10);
      if (!promiseCache.has(id)) {
        promiseCache.set(id, createStreamingPromise(id));
      }
      return promiseCache.get(id);
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    if (value[0] === FLIGHT_ELEMENT) {
      const [, type, key, props] = value;
      return createReactElement(type, key, props);
    }
    return value.map(item => flightToReact(item));
  }

  if (typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = flightToReact(v);
    }
    return result;
  }

  return value;
}

function createReactElement(type: string, key: string | null, props: any) {
  if (type === '$Suspense') {
    return React.createElement(
      React.Suspense,
      { key, fallback: flightToReact(props?.fallback) },
      flightToReact(props?.children)
    );
  }

  if (type.startsWith(FLIGHT_CLIENT_REF)) {
    const moduleId = type.slice(2);
    const Component = clientComponents.get(moduleId);
    if (!Component) {
      console.warn('[tana] Client component not registered:', moduleId);
      return React.createElement('div', { key, style: { color: 'red' } }, \`Missing: \${moduleId}\`);
    }
    const convertedProps = props ? flightToReact(props) : {};
    return React.createElement(Component, { key, ...convertedProps });
  }

  const convertedProps = props ? flightToReact(props) : {};
  const { children, ...restProps } = convertedProps;
  return React.createElement(type, { key, ...restProps }, children);
}

function render() {
  if (!rowCache.has(0)) return;
  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  if (!reactRoot) {
    reactRoot = createRoot(rootEl);
  }
  reactRoot.render(flightToReact(rowCache.get(0)));
}

async function loadPage() {
  const pathname = window.location.pathname;

  // Fetch Flight stream from RSC endpoint
  const response = await fetch(pathname, {
    headers: { 'Accept': 'text/x-component' }
  });

  if (!response.ok) {
    console.error('[tana] RSC fetch failed:', response.status);
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (line.trim()) {
        const row = parseFlightRow(line);
        if (row) {
          rowCache.set(row.id, row.value);
          render();
        }
      }
    }
  }

  if (buffer.trim()) {
    const row = parseFlightRow(buffer);
    if (row) {
      rowCache.set(row.id, row.value);
      render();
    }
  }
}

// Start loading when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadPage);
} else {
  loadPage();
}
`
}
