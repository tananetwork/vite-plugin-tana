/**
 * Unified Contract Code Generator
 *
 * Generates a single contract.js with 5 exports:
 * - init()     - On-chain initialization
 * - contract() - On-chain transaction handler
 * - ssr()      - Server-side rendering router
 * - get()      - API GET request router
 * - post()     - API POST request router
 *
 * All code is inlined for maximum performance (zero I/O during execution)
 */

import * as fs from 'fs'
import * as path from 'path'
import { build } from 'esbuild'

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
  /** SSR pages from app/ */
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

/**
 * Generate unified contract.js with all code inlined
 */
export async function generateContract(
  structure: ProjectStructure,
  outDir: string
): Promise<string> {
  const contractPath = path.join(outDir, 'contract.js')

  // Build inline bundles for each file
  const pageBundles = await Promise.all(
    structure.pages.map(page => bundleFile(page.filePath, 'page'))
  )

  const getBundles = await Promise.all(
    structure.apiGet.map(handler => bundleFile(handler.filePath, 'get'))
  )

  const postBundles = await Promise.all(
    structure.apiPost.map(handler => bundleFile(handler.filePath, 'post'))
  )

  const initBundle = structure.init
    ? await bundleFile(structure.init.filePath, 'init')
    : null

  const contractBundle = structure.contract
    ? await bundleFile(structure.contract.filePath, 'contract')
    : null

  // Generate contract.js content
  const code = [
    '// Tana Unified Contract',
    `// Generated: ${new Date().toISOString()}`,
    '',
    '// External dependencies (provided by tana-edge)',
    'import { renderToString } from "react-dom/server";',
    'import { jsx, jsxs } from "react/jsx-runtime";',
    '',
    '// ========== Blockchain Functions ==========',
    '',
    initBundle || '// No init() function defined',
    '',
    contractBundle || '// No contract() function defined',
    '',
    '// ========== SSR Router ==========',
    '',
    generateSSRRouter(structure.pages, pageBundles),
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
 * Bundle a single file inline (returns code as string)
 */
async function bundleFile(filePath: string, type: string): Promise<string> {
  const result = await build({
    entryPoints: [filePath],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    write: false,
    external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'],
    jsx: 'automatic',
    minify: false, // Never minify server bundles
    treeShaking: true,
  })

  return result.outputFiles[0].text
}

/**
 * Generate SSR router function
 */
function generateSSRRouter(pages: RouteFile[], bundles: string[]): string {
  if (pages.length === 0) {
    return `export function ssr(request) {
  return {
    status: 404,
    body: '<!DOCTYPE html><html><body><h1>404 Not Found</h1></body></html>',
    headers: { 'Content-Type': 'text/html' }
  };
}`
  }

  const cases = pages.map((page, i) => {
    if (page.params) {
      // Dynamic route - use pattern matching
      const pattern = page.routePath.split('/').map(seg =>
        seg.startsWith(':') ? '([^/]+)' : seg
      ).join('\\/')

      return `    // ${page.routePath}
    if (request.path.match(/^${pattern}$/)) {
      const params = extractParams(request.path, "${page.routePath}");
      ${bundles[i]}
      return render_${i}(request, params);
    }`
    } else {
      // Static route
      return `    case '${page.routePath}':
      ${bundles[i]}
      return render_${i}(request);`
    }
  }).join('\n\n')

  return `export function ssr(request) {
  const { path, query, headers } = request;

  // Route matching
  switch (path) {
${cases}

    default:
      return {
        status: 404,
        body: '<!DOCTYPE html><html><body><h1>404 Not Found</h1></body></html>',
        headers: { 'Content-Type': 'text/html' }
      };
  }
}

// Helper: Extract dynamic params from path
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
}`
}

/**
 * Generate API router function (get or post)
 */
function generateAPIRouter(routes: RouteFile[], bundles: string[], method: 'get' | 'post'): string {
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
    if (route.params) {
      const pattern = route.routePath.split('/').map(seg =>
        seg.startsWith(':') ? '([^/]+)' : seg
      ).join('\\/')

      return `    // ${route.routePath}
    if (request.path.match(/^${pattern}$/)) {
      const params = extractParams(request.path, "${route.routePath}");
      ${bundles[i]}
      return handler_${i}(request, params);
    }`
    } else {
      return `    case '${route.routePath}':
      ${bundles[i]}
      return handler_${i}(request);`
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
