import type { Plugin, ViteDevServer } from 'vite'
import { spawn, ChildProcess } from 'child_process'
import { request as httpRequest } from 'http'
import path from 'path'
import fs from 'fs'

export interface TanaPluginOptions {
  /**
   * Path to tana-edge binary
   * @default 'tana-edge' (assumes in PATH)
   */
  edgeBinary?: string

  /**
   * Port for tana-edge SSR server
   * @default 8506
   */
  edgePort?: number

  /**
   * Contract ID to use for SSR
   * This maps to a contract in the contracts/ directory
   * @default 'app'
   */
  contractId?: string

  /**
   * Path to contracts directory
   * @default '../contracts' relative to project root
   */
  contractsDir?: string

  /**
   * Database connection URL
   */
  database?: string

  /**
   * Enable dev mode features
   * @default true
   */
  dev?: boolean
}

interface RouteManifest {
  routes: Array<{
    path: string
    component: string
    loader?: string
  }>
}

/**
 * Vite plugin for Tana framework
 *
 * Enables Rails-like full-stack development with:
 * - SSR via tana-edge (same runtime as production)
 * - HMR for rapid development
 * - Pre-bundled React (no need to bundle React in contracts)
 */
export default function tanaPlugin(options: TanaPluginOptions = {}): Plugin {
  const {
    edgeBinary = 'tana-edge',
    edgePort = 8506,
    contractId = 'app',
    contractsDir,
    database,
    dev = true,
  } = options

  let tanaEdgeProcess: ChildProcess | null = null
  let viteServer: ViteDevServer
  let root: string
  let outDir: string
  let resolvedContractsDir: string

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
      }
    },

    configResolved(config) {
      root = config.root
      outDir = path.join(root, '.tana')
      resolvedContractsDir = contractsDir
        ? path.resolve(root, contractsDir)
        : path.resolve(root, '../contracts')
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
        startTanaEdge()
      }

      // Middleware to proxy SSR requests to tana-edge
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
          console.error('[tana] SSR Error:', error)
          next(error)
        }
      })
    },

    // Handle HMR
    handleHotUpdate({ file }) {
      // If server-side code changed, rebuild the SSR bundle
      if (
        file.includes('/app/') ||
        file.includes('/src/') ||
        file.endsWith('.tsx') ||
        file.endsWith('.ts')
      ) {
        console.log('[tana] Source changed, rebuilding SSR bundle...')
        rebuildSSRBundle()
      }

      // Let Vite handle client-side HMR normally
      return undefined
    },

    buildEnd() {
      // Clean up tana-edge process
      if (tanaEdgeProcess) {
        tanaEdgeProcess.kill()
        tanaEdgeProcess = null
      }
    },
  }

  /**
   * Start the actual tana-edge binary
   */
  function startTanaEdge() {
    console.log(`[tana] Starting tana-edge on port ${edgePort}...`)

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      EDGE_PORT: String(edgePort),
    }

    if (database) {
      env.DATABASE_URL = database
    }

    // Spawn tana-edge binary
    tanaEdgeProcess = spawn(edgeBinary, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
      cwd: path.dirname(resolvedContractsDir), // Run from parent of contracts dir
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
   * Proxy request to tana-edge's /ssr/ endpoint
   * The /ssr/ endpoint returns raw HTML (not JSON-wrapped)
   */
  async function proxyToEdge(url: string, method: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Use /ssr/:contractId endpoint which returns raw HTML
      const ssrPath = `/ssr/${contractId}${url === '/' ? '' : url}`

      const req = httpRequest(
        {
          hostname: 'localhost',
          port: edgePort,
          path: ssrPath,
          method,
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
      req.end()
    })
  }

  /**
   * Inject Vite's HMR client scripts into the HTML
   */
  function injectViteClient(html: string): string {
    // Inject Vite's HMR client and React refresh
    const viteClient = `
    <script type="module" src="/@vite/client"></script>
    <script type="module">
      import RefreshRuntime from '/@react-refresh'
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
`
    return html.replace('</head>', `${viteClient}</head>`)
  }

  /**
   * Rebuild the SSR bundle when source files change
   */
  async function rebuildSSRBundle() {
    console.log('[tana] Rebuilding SSR bundle...')
    // tana-edge creates fresh V8 isolates per request,
    // so we just need to rebuild the contract bundle
    // The esbuild script in test-edge-ssr handles this

    // In a full implementation, we'd watch and rebuild automatically
    // For now, tana-edge reloads the contract on each request
  }
}

/**
 * Scan the project for routes (file-based routing)
 */
async function scanRoutes(root: string): Promise<RouteManifest> {
  const routes: RouteManifest['routes'] = []
  const viewsDir = path.join(root, 'app', 'views')
  const srcDir = path.join(root, 'src')

  // Check both app/views (Rails-like) and src (standard React)
  const dirsToScan = [viewsDir, srcDir].filter(fs.existsSync)

  for (const dir of dirsToScan) {
    scanDir(dir, '', routes)
  }

  return { routes }
}

function scanDir(dir: string, prefix: string, routes: RouteManifest['routes']) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (['layouts', 'components', 'lib', 'utils'].includes(entry.name)) continue
      scanDir(path.join(dir, entry.name), `${prefix}/${entry.name}`, routes)
    } else if (entry.name === 'index.tsx' || entry.name === 'index.jsx') {
      routes.push({
        path: prefix || '/',
        component: path.join(dir, entry.name),
      })
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
      const name = entry.name.replace(/\.(tsx|jsx)$/, '')
      if (name.startsWith('[') && name.endsWith(']')) {
        // Dynamic route: [id].tsx -> :id
        const param = name.slice(1, -1)
        routes.push({
          path: `${prefix}/:${param}`,
          component: path.join(dir, entry.name),
        })
      } else if (name !== 'index') {
        routes.push({
          path: `${prefix}/${name}`,
          component: path.join(dir, entry.name),
        })
      }
    }
  }
}
