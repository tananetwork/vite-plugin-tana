/**
 * Unified Contract Code Generator (RSC)
 *
 * Generates a single contract.js file with 5 exports:
 * - init()     - On-chain initialization
 * - contract() - On-chain transaction handler
 * - Page()     - React Server Component page router
 * - get()      - API GET request router
 * - post()     - API POST request router
 *
 * Uses React Server Components (RSC) with Flight protocol streaming.
 * tana-edge handles the Flight serialization - we just return JSX trees.
 * All code is inlined for maximum performance (zero I/O during execution)
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { build } from 'esbuild'

// ESM __dirname polyfill - derive from import.meta.url
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface RouteFile {
  /** File path */
  filePath: string
  /** Route path (e.g., '/', '/posts', '/posts/:id') */
  routePath: string
  /** Type of file */
  type: 'page' | 'get' | 'post' | 'init' | 'contract'
  /** Dynamic params (e.g., ['id'] for /posts/:id) */
  params?: string[]
}

export interface ProjectStructure {
  /** RSC pages from app/ */
  pages: RouteFile[]
  /** API GET handlers from api/ */
  apiGet: RouteFile[]
  /** API POST handlers from api/ */
  apiPost: RouteFile[]
  /** Blockchain init from blockchain/init.ts */
  init?: RouteFile
  /** Blockchain contract handler from blockchain/contract.ts */
  contract?: RouteFile
}

/**
 * Scan project for routes and handlers
 */
export async function scanProject(root: string): Promise<ProjectStructure> {
  const structure: ProjectStructure = {
    pages: [],
    apiGet: [],
    apiPost: [],
  }

  // Scan app/ for pages
  const appDir = path.join(root, 'app')
  if (fs.existsSync(appDir)) {
    scanDir(appDir, '', structure.pages, 'page')
  }

  // Scan api/ for GET/POST handlers
  const apiDir = path.join(root, 'api')
  if (fs.existsSync(apiDir)) {
    scanDir(apiDir, '', structure.apiGet, 'get')
    scanDir(apiDir, '', structure.apiPost, 'post')
  }

  // Check for blockchain handlers
  const blockchainDir = path.join(root, 'blockchain')
  const initPath = path.join(blockchainDir, 'init.ts')
  const contractPath = path.join(blockchainDir, 'contract.ts')

  if (fs.existsSync(initPath)) {
    structure.init = {
      filePath: initPath,
      routePath: '',
      type: 'init',
    }
  }

  if (fs.existsSync(contractPath)) {
    structure.contract = {
      filePath: contractPath,
      routePath: '',
      type: 'contract',
    }
  }

  return structure
}

/**
 * Recursively scan directory for route files
 */
function scanDir(
  dir: string,
  prefix: string,
  routes: RouteFile[],
  fileType: 'page' | 'get' | 'post'
) {
  if (!fs.existsSync(dir)) return

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      // Skip utility directories
      if (['components', 'lib', 'utils', 'styles'].includes(entry.name)) {
        continue
      }

      // Handle dynamic routes: [id]/
      if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
        const param = entry.name.slice(1, -1)
        scanDir(fullPath, `${prefix}/:${param}`, routes, fileType)
      } else {
        scanDir(fullPath, `${prefix}/${entry.name}`, routes, fileType)
      }
    } else {
      // Check for route files
      const fileName = entry.name
      const expectedNames = fileType === 'page'
        ? ['page.tsx', 'page.ts', 'page.jsx', 'page.js']
        : [`${fileType}.tsx`, `${fileType}.ts`, `${fileType}.jsx`, `${fileType}.js`]

      if (expectedNames.includes(fileName)) {
        const routePath = prefix || '/'
        const params = routePath.split('/').filter(s => s.startsWith(':')).map(s => s.slice(1))

        routes.push({
          filePath: fullPath,
          routePath,
          type: fileType,
          params: params.length > 0 ? params : undefined,
        })
      }
    }
  }
}

/** Bundle result with code and component name */
interface BundleResult {
  code: string
  componentName: string
}

/**
 * Generate unified contract.js with all code inlined
 */
export async function generateContract(
  structure: ProjectStructure,
  outDir: string
): Promise<string> {
  // Output as contract.js - unified contract file for both CLI deploy and tana-edge runtime
  // The unified contract exports: ssr(), get(), post(), init(), contract()
  const contractPath = path.join(outDir, 'contract.js')

  // Build inline bundles for each file (with index for unique naming)
  const pageBundles = await Promise.all(
    structure.pages.map((page, i) => bundleFile(page.filePath, 'page', i))
  )

  const getBundles = await Promise.all(
    structure.apiGet.map((handler, i) => bundleFile(handler.filePath, 'get', i))
  )

  const postBundles = await Promise.all(
    structure.apiPost.map((handler, i) => bundleFile(handler.filePath, 'post', i))
  )

  const initBundle = structure.init
    ? await bundleFile(structure.init.filePath, 'init', 0)
    : null

  const contractBundle = structure.contract
    ? await bundleFile(structure.contract.filePath, 'contract', 0)
    : null

  // Generate contract.js content (unified RSC contract)
  const code = [
    '// Tana Unified Contract (RSC)',
    `// Generated: ${new Date().toISOString()}`,
    '',
    '// RSC uses the __rsc global provided by tana-edge rsc-runtime.js',
    '// jsx, Fragment, Suspense are available globally',
    '// No react-dom/server imports needed - tana-edge handles Flight serialization',
    '',
    '// Tana runtime modules (provided by tana-edge)',
    'import { json, status } from "tana/http";',
    '',
    '// ========== Blockchain Functions ==========',
    '',
    initBundle?.code || '// No init() function defined',
    '',
    contractBundle?.code || '// No contract() function defined',
    '',
    '// ========== Page Components (Server Components) ==========',
    '',
    ...pageBundles.map(b => b.code),
    '',
    '// ========== API Handlers ==========',
    '',
    ...getBundles.map(b => b.code),
    '',
    ...postBundles.map(b => b.code),
    '',
    '// ========== RSC Page Router ==========',
    '',
    generateRSCRouter(structure.pages, pageBundles),
    '',
    '// ========== API Routers ==========',
    '',
    generateAPIRouter(structure.apiGet, getBundles, 'get'),
    '',
    generateAPIRouter(structure.apiPost, postBundles, 'post'),
  ].join('\n')

  // Write to file
  fs.writeFileSync(contractPath, code)

  return contractPath
}

/**
 * Bundle a single file and transform it for inlining
 * Returns { code, componentName } where componentName is the unique alias for the export
 */
async function bundleFile(filePath: string, type: string, index: number): Promise<{ code: string; componentName: string }> {
  const result = await build({
    entryPoints: [filePath],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    write: false,
    external: [
      // RSC: We use the global jsx/Fragment/Suspense from tana-edge's rsc-runtime.js
      // No react-dom/server needed - tana-edge handles Flight serialization
      'react', 'react-dom', 'react/jsx-runtime',
      // Tana runtime modules (provided by tana-edge)
      // Note: tana/db is NOT external - it gets bundled from lib/db/ with query builder code
      'tana/http', 'tana/net', 'tana/kv', 'tana/block', 'tana/context', 'tana/tx', 'tana/core',
    ],
    alias: {
      // Resolve tana/db to our bundled query builder library
      'tana/db': path.resolve(__dirname, '../lib/db/index.ts'),
    },
    jsx: 'automatic',
    minify: false, // Never minify server bundles
    treeShaking: true,
  })

  let code = result.outputFiles[0].text

  // Generate unique alias name based on type and index
  const aliasName = type === 'page' ? `Page_${index}` :
                    type === 'get' ? `GetHandler_${index}` :
                    type === 'post' ? `PostHandler_${index}` :
                    type === 'init' ? 'initHandler' :
                    type === 'contract' ? 'contractHandler' : `Handler_${index}`

  // Remove import statements (they'll be at module top level)
  code = code.replace(/^import\s+.*?from\s+["'].*?["'];?\s*$/gm, '')

  // Find the original function name from the export statement and rename it
  // Pattern: export { FunctionName as default };
  let originalName: string | null = null
  code = code.replace(/export\s*\{\s*(\w+)\s+as\s+default\s*\};?\s*$/m, (match, name) => {
    originalName = name
    return '' // Remove the export statement
  })

  // Also handle: export default function Name()
  if (!originalName) {
    const match = code.match(/export\s+default\s+function\s+(\w+)/)
    if (match) {
      originalName = match[1]
      code = code.replace(/export\s+default\s+function\s+(\w+)/, 'function $1')
    }
  }

  // Also handle: export default Name (reference to existing function)
  if (!originalName) {
    code = code.replace(/export\s+default\s+(\w+);?\s*$/m, (match, name) => {
      originalName = name
      return ''
    })
  }

  // Rename the original function to the unique alias name
  // This avoids hoisting issues when multiple handlers have the same name (e.g., "handler")
  if (originalName && originalName !== aliasName) {
    // Rename function declaration: function handler( -> function GetHandler_0(
    code = code.replace(
      new RegExp(`function\\s+${originalName}\\s*\\(`),
      `function ${aliasName}(`
    )
  }

  // Clean up empty lines
  code = code.replace(/\n{3,}/g, '\n\n').trim()

  return { code, componentName: aliasName }
}

/**
 * Generate RSC page router
 * Returns async Page() function that tana-edge will render via Flight protocol
 * Components are defined at module top level, this just routes to them
 */
function generateRSCRouter(pages: RouteFile[], bundles: BundleResult[]): string {
  if (pages.length === 0) {
    return `// No pages defined
export async function Page(props) {
  return jsx('div', { children: '404 - Page Not Found' });
}

export function Get(request) {
  const { path, method } = request;

  // Handle API routes
  if (path.startsWith('/api') || path.startsWith('api')) {
    const apiPath = path.startsWith('/api') ? path.slice(4) : path.slice(3);
    const normalizedPath = apiPath === '' ? '/' : (apiPath.startsWith('/') ? apiPath : '/' + apiPath);
    const apiRequest = { ...request, path: normalizedPath };

    if (method === 'POST') {
      return post(apiRequest);
    }
    return get(apiRequest);
  }

  // For page routes, return null - tana-edge will call Page() directly
  return null;
}`
  }

  // Generate route matching for Page component
  const pageMatches = pages.map((page, i) => {
    const componentName = bundles[i].componentName

    if (page.params) {
      // Dynamic route - use pattern matching
      const pattern = page.routePath.split('/').map(seg =>
        seg.startsWith(':') ? '([^/]+)' : seg
      ).join('\\/')

      return `  // ${page.routePath}
  if (path.match(/^${pattern}$/)) {
    const params = extractParams(path, "${page.routePath}");
    return jsx(${componentName}, { request: props.request, params });
  }`
    } else {
      // Static route
      return `  if (path === '${page.routePath}') {
    return jsx(${componentName}, { request: props.request });
  }`
    }
  }).join('\n\n')

  return `// Helper: Extract dynamic params from path
function extractParams(path, pattern) {
  const segments = path.split('/').filter(Boolean);
  const patternSegments = pattern.split('/').filter(Boolean);
  const params = {};

  patternSegments.forEach((seg, i) => {
    if (seg.startsWith(':')) {
      params[seg.slice(1)] = segments[i];
    }
  });

  return params;
}

/**
 * RSC Page Router - Async Server Component
 * tana-edge calls this and serializes the result via Flight protocol
 */
export async function Page(props = {}) {
  const path = props.request?.path || '/';

${pageMatches}

  // 404 fallback
  return jsx('div', {
    style: { padding: '40px', textAlign: 'center' },
    children: [
      jsx('h1', { key: 'title', children: '404' }),
      jsx('p', { key: 'msg', children: 'Page not found: ' + path })
    ]
  });
}

/**
 * Get handler for API routes
 * Page routes are handled by Page() via RSC
 */
export function Get(request) {
  const { path, method } = request;

  // Handle API routes - delegate to get/post handlers
  if (path.startsWith('/api') || path.startsWith('api')) {
    const apiPath = path.startsWith('/api') ? path.slice(4) : path.slice(3);
    const normalizedPath = apiPath === '' ? '/' : (apiPath.startsWith('/') ? apiPath : '/' + apiPath);
    const apiRequest = { ...request, path: normalizedPath };

    if (method === 'POST') {
      return post(apiRequest);
    }
    return get(apiRequest);
  }

  // For page routes, return null - tana-edge will use Page() via RSC
  return null;
}`
}

/**
 * Generate API router function (get or post)
 * Handlers are defined at module top level, this just routes to them
 */
function generateAPIRouter(routes: RouteFile[], bundles: BundleResult[], method: 'get' | 'post'): string {
  if (routes.length === 0) {
    return `export function ${method}(request) {
  return {
    status: 404,
    body: { error: 'Not found' },
    headers: { 'Content-Type': 'application/json' }
  };
}`
  }

  const cases = routes.map((route, i) => {
    const handlerName = bundles[i].componentName

    if (route.params) {
      const pattern = route.routePath.split('/').map(seg =>
        seg.startsWith(':') ? '([^/]+)' : seg
      ).join('\\/')

      return `    // ${route.routePath}
    if (request.path.match(/^${pattern}$/)) {
      const params = extractParams(request.path, "${route.routePath}");
      return ${handlerName}({ ...request, params });
    }`
    } else {
      return `    case '${route.routePath}':
      return ${handlerName}(request);`
    }
  }).join('\n\n')

  return `export function ${method}(request) {
  const { path, query, headers, body } = request;

  // Route matching
  switch (path) {
${cases}

    default:
      return {
        status: 404,
        body: { error: 'Not found' },
        headers: { 'Content-Type': 'application/json' }
      };
  }
}`
}
