// vite-plugin-tana
// Main Vite plugin for Tana framework with RSC support

import type { Plugin, ViteDevServer } from 'vite'
import { spawn, ChildProcess } from 'child_process'
import { request as httpRequest } from 'http'
import path from 'path'
import fs from 'fs'

// Internal modules
import type { TanaPluginOptions } from './types.js'
import { VIRTUAL_HYDRATE_ID, RESOLVED_VIRTUAL_HYDRATE_ID } from './types.js'
import { detectStylesheet, findTanaEdgeBinary, findClientEntry } from './utils.js'
import { scanRoutes } from './routes.js'
import { printTanaBanner } from './banner.js'
import { generateHydrationModule, generateClientEntryCode } from './hydration.js'
import { out } from '@tananetwork/stdio'

// External modules
import { tanaBuild } from './build.js'
import { scanProject, generateContract, ProjectStructure } from './generator.js'

// Re-export types for consumers
export type { TanaPluginOptions } from './types.js'

/**
 * Vite plugin for Tana framework
 *
 * Enables Rails-like full-stack development with:
 * - React Server Components (RSC) via tana-edge with Flight protocol streaming
 * - HMR for rapid development
 * - Pre-bundled React (no need to bundle React in contracts)
 */
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
  let root: string          // Vite's configured root (may be a subdirectory like 'public')
  let projectRoot: string   // Actual project root (where app/, api/, blockchain/ live)
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

  /**
   * Build initial contract on dev server startup
   */
  async function buildInitialContract() {
    try {
      out.log('build', 'contract...')

      // Scan project structure and store it for the hydration module
      projectStructure = await scanProject(projectRoot)
      const structure = projectStructure

      // Generate unified contract for dev
      const devOutDir = path.join(resolvedContractsDir, contractId)

      // Ensure output directory exists
      if (!fs.existsSync(devOutDir)) {
        fs.mkdirSync(devOutDir, { recursive: true })
      }

      // Generate the unified contract.js
      await generateContract(structure, devOutDir)

      out.log('ready', 'contract built')
      out.log('info', `${structure.pages.length} page(s), ${structure.apiGet.length} GET handler(s), ${structure.apiPost.length} POST handler(s)`)
    } catch (error) {
      out.error('build', `contract failed: ${error}`)
    }
  }

  /**
   * Poll tana-edge health endpoint until it responds
   * Much more reliable than parsing stdout - tests actual server readiness
   */
  function waitForEdgeHealth(maxAttempts = 50, intervalMs = 100): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0

      const check = () => {
        attempts++
        const req = httpRequest(
          {
            hostname: 'localhost',
            port: edgePort,
            path: '/health',
            method: 'GET',
            timeout: 500,
          },
          (res) => {
            // Any response means edge is up and accepting connections
            resolve()
          }
        )

        req.on('error', () => {
          if (attempts >= maxAttempts) {
            reject(new Error(`tana-edge failed to start after ${attempts} attempts`))
          } else {
            setTimeout(check, intervalMs)
          }
        })

        req.on('timeout', () => {
          req.destroy()
          if (attempts >= maxAttempts) {
            reject(new Error(`tana-edge failed to start after ${attempts} attempts`))
          } else {
            setTimeout(check, intervalMs)
          }
        })

        req.end()
      }

      check()
    })
  }

  /**
   * Start the tana-edge binary
   */
  function startTanaEdge() {
    out.log('start', `tana-edge on port ${edgePort}`)

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      EDGE_PORT: String(edgePort),
      CONTRACTS_DIR: '.',
      // Default to info level (clean logs). Set LOG_LEVEL=debug for verbose output.
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    }

    if (database) {
      env.DATABASE_URL = database
    }

    // Use inherit for stdio - simpler and avoids pipe issues
    tanaEdgeProcess = spawn(resolvedEdgeBinary, [], {
      stdio: ['ignore', 'inherit', 'inherit'],
      env,
      cwd: resolvedContractsDir,
    })

    tanaEdgeProcess.on('error', (error) => {
      out.error('edge', `failed to start: ${error}`)
      out.error('hint', 'make sure tana-edge binary is in PATH or specify edgeBinary option')
    })

    tanaEdgeProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        out.error('edge', `exited with code ${code}`)
      }
      resetEdgeReady()
    })

    // Poll health endpoint instead of parsing stdout
    waitForEdgeHealth()
      .then(() => {
        edgeReady = true
        resolveEdgeReady()
        out.log('ready', 'tana-edge')
      })
      .catch((error) => {
        out.error('edge', `${error.message}`)
      })
  }

  /**
   * Proxy request to tana-edge's /_dev/ endpoint
   */
  async function proxyToEdge(url: string, method: string, body?: string): Promise<string> {
    return new Promise((resolve, reject) => {
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
          res.on('end', () => resolve(data))
        }
      )

      req.on('error', (err) => {
        reject(new Error(`Failed to proxy to tana-edge: ${err.message}`))
      })

      if (body) {
        req.write(body)
      }
      req.end()
    })
  }

  /**
   * Inject Vite's HMR client scripts and stylesheet into HTML
   * If response is Flight JSON (not HTML), wrap it in an HTML shell first
   */
  function injectViteClient(response: string): string {
    const stylesheetLink = resolvedStylesheet
      ? `<link rel="stylesheet" href="${resolvedStylesheet}">`
      : ''

    // Check if response is already HTML or raw Flight JSON
    const isHtml = response.trim().startsWith('<!DOCTYPE') || response.trim().startsWith('<html')

    if (!isHtml) {
      // Flight JSON response - wrap in HTML shell
      // The Flight payload is embedded as a script that the hydration module will parse
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tana App</title>
  ${stylesheetLink}
  <script type="module" src="/@vite/client"></script>
  <script type="module">
    import RefreshRuntime from '/@react-refresh'
    RefreshRuntime.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => (type) => type
    window.__vite_plugin_react_preamble_installed__ = true
  </script>
</head>
<body>
  <div id="root"></div>
  <script id="__FLIGHT_DATA__" type="application/json">${response.replace(/</g, '\\u003c')}</script>
  <script type="module" src="/@id/${VIRTUAL_HYDRATE_ID}"></script>
</body>
</html>`
    }

    // Already HTML - inject Vite assets
    const viteAssets = `
    ${stylesheetLink}
    <script type="module" src="/@vite/client"></script>
    <script type="module">
      import RefreshRuntime from '/@react-refresh'
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="/@id/${VIRTUAL_HYDRATE_ID}"></script>
`
    return response.replace('</head>', `${viteAssets}</head>`)
  }

  /**
   * Rebuild unified contract when files change (HMR)
   */
  async function rebuildUnifiedContract() {
    try {
      out.log('rebuild', 'contract...')

      projectStructure = await scanProject(projectRoot)
      const structure = projectStructure

      const devOutDir = path.join(resolvedContractsDir, contractId)

      if (!fs.existsSync(devOutDir)) {
        fs.mkdirSync(devOutDir, { recursive: true })
      }

      await generateContract(structure, devOutDir)

      out.log('ready', 'contract rebuilt')
      out.log('info', `${structure.pages.length} page(s), ${structure.apiGet.length} GET handler(s), ${structure.apiPost.length} POST handler(s)`)
    } catch (error) {
      out.error('rebuild', `contract failed: ${error}`)
    }
  }

  return {
    name: 'vite-plugin-tana',

    config(config) {
      return {
        esbuild: {
          jsx: 'automatic',
          jsxImportSource: 'react',
        },
        optimizeDeps: {
          include: ['react', 'react-dom', 'react-dom/client'],
        },
        build: {
          emptyOutDir: false,
        },
      }
    },

    resolveId(id) {
      if (id === VIRTUAL_HYDRATE_ID) {
        return RESOLVED_VIRTUAL_HYDRATE_ID
      }
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_HYDRATE_ID) {
        return generateHydrationModule(projectStructure, projectRoot)
      }
    },

    configResolved(config) {
      root = config.root

      // Determine project root
      const potentialProjectRoot = path.dirname(root)
      const hasAppDir = fs.existsSync(path.join(potentialProjectRoot, 'app'))
      const hasApiDir = fs.existsSync(path.join(potentialProjectRoot, 'api'))
      const hasBlockchainDir = fs.existsSync(path.join(potentialProjectRoot, 'blockchain'))

      projectRoot = (hasAppDir || hasApiDir || hasBlockchainDir)
        ? potentialProjectRoot
        : root

      outDir = path.join(projectRoot, '.tana')
      resolvedContractsDir = contractsDir
        ? path.resolve(projectRoot, contractsDir)
        : projectRoot

      // Use projectRoot (not Vite's root) since node_modules is at project level
      resolvedEdgeBinary = edgeBinary || findTanaEdgeBinary(projectRoot)
      out.log('config', `tana-edge binary: ${resolvedEdgeBinary}`)

      if (stylesheet === false) {
        resolvedStylesheet = null
        out.log('config', 'stylesheet injection disabled')
      } else if (typeof stylesheet === 'string') {
        resolvedStylesheet = stylesheet.startsWith('/') ? stylesheet : `/${stylesheet}`
        out.log('config', `stylesheet: ${resolvedStylesheet}`)
      } else {
        resolvedStylesheet = detectStylesheet(root)
        if (!resolvedStylesheet) {
          out.log('config', 'no stylesheet detected')
        }
      }
    },

    async buildStart() {
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true })
      }

      const manifest = await scanRoutes(projectRoot)
      fs.writeFileSync(
        path.join(outDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      )

      out.log('ready', 'route manifest generated')
    },

    configureServer(server) {
      viteServer = server

      if (dev) {
        ;(async () => {
          await buildInitialContract()
          startTanaEdge()
        })()
      }

      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address()
        const port = (typeof address === 'object' ? address?.port : undefined) ?? 5173
        const host = server.config.server.host

        setTimeout(() => {
          printTanaBanner({ vitePort: port, edgePort, host })
        }, 100)
      })

      // API middleware
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api')) {
          return next()
        }

        if (!edgeReady) {
          out.log('wait', 'tana-edge to be ready...')
          await edgeReadyPromise
        }

        try {
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

          const response = await proxyToEdge(req.url, req.method || 'GET', body)

          res.setHeader('Content-Type', 'application/json')
          res.end(response)
        } catch (error) {
          out.error('api', `${error}`)
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'API request failed' }))
        }
      })

      // RSC page middleware
      server.middlewares.use(async (req, res, next) => {
        if (
          !req.url ||
          req.url.startsWith('/@') ||
          req.url.startsWith('/__') ||
          req.url.startsWith('/node_modules') ||
          req.url.startsWith('/src/') ||
          req.url.includes('.')
        ) {
          return next()
        }

        if (!edgeReady) {
          out.log('wait', 'tana-edge to be ready...')
          await edgeReadyPromise
        }

        try {
          const html = await proxyToEdge(req.url, req.method || 'GET')
          const injectedHtml = injectViteClient(html)

          res.setHeader('Content-Type', 'text/html')
          res.end(injectedHtml)
        } catch (error) {
          out.error('rsc', `${error}`)
          next(error)
        }
      })
    },

    handleHotUpdate({ file }) {
      const isGeneratedFile = file.endsWith('/ssr.js') || file.endsWith('/contract.js')
      if (isGeneratedFile) {
        return undefined
      }

      const isAppFile = file.includes('/app/') && (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js'))
      const isApiFile = file.includes('/api/') && (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js'))
      const isBlockchainFile = file.includes('/blockchain/') && (file.endsWith('.tsx') || file.endsWith('.ts'))

      if (isAppFile || isApiFile || isBlockchainFile) {
        out.log('change', path.relative(root, file))
        rebuildUnifiedContract()
      }

      return undefined
    },

    async closeBundle() {
      if (tanaEdgeProcess) {
        tanaEdgeProcess.kill()
        tanaEdgeProcess = null
      }

      const finalOutDir = contractsDir
        ? path.resolve(root, contractsDir)
        : path.join(root, 'dist')

      let clientEntry = findClientEntry(root)
      let generatedClientEntry = false

      if (!clientEntry) {
        out.log('info', 'no client entry found, generating auto-hydration entry...')

        const structure = projectStructure || await scanProject(projectRoot)

        if (structure.pages.length === 0) {
          out.log('info', 'no pages found, skipping client bundle generation')
        } else {
          const tempClientPath = path.join(projectRoot, '.tana', 'client.tsx')
          fs.mkdirSync(path.dirname(tempClientPath), { recursive: true })

          const clientCode = generateClientEntryCode(structure, projectRoot)
          fs.writeFileSync(tempClientPath, clientCode)

          clientEntry = tempClientPath
          generatedClientEntry = true
          out.log('ready', 'generated client entry: .tana/client.tsx')
        }
      }

      if (!clientEntry) {
        out.warn('build', 'no pages to hydrate, skipping production build')
        return
      }

      out.log('build', 'production starting...')
      out.log('info', `project root: ${root}`)
      out.log('info', `client entry: ${path.relative(root, clientEntry)}${generatedClientEntry ? ' (auto-generated)' : ''}`)
      out.log('info', `output: ${finalOutDir}/${contractId}`)

      try {
        await tanaBuild({
          root,
          clientEntry,
          outDir: finalOutDir,
          contractId,
          minify: true,
          publicPath: '/',
        })

        // Clean up Vite's redundant output
        const distDir = path.join(root, 'dist')
        const assetsDir = path.join(distDir, 'assets')
        const viteIndexHtml = path.join(distDir, 'index.html')

        if (fs.existsSync(assetsDir)) {
          fs.rmSync(assetsDir, { recursive: true })
        }
        if (fs.existsSync(viteIndexHtml)) {
          fs.unlinkSync(viteIndexHtml)
        }

        out.log('ready', 'production build complete!')
      } catch (error) {
        out.error('build', `production failed: ${error}`)
      }
    },
  }
}
