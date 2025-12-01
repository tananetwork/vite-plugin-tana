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
    structure.pages.map((page, i) => bundleAndTransform(page.filePath, 'page', i))
  )

  const getBundles = await Promise.all(
    structure.apiGet.map((handler, i) => bundleAndTransform(handler.filePath, 'get', i))
  )

  const postBundles = await Promise.all(
    structure.apiPost.map((handler, i) => bundleAndTransform(handler.filePath, 'post', i))
  )

  const initBundle = structure.init
    ? await bundleFile(structure.init.filePath, 'init')
    : null

  const contractBundle = structure.contract
    ? await bundleFile(structure.contract.filePath, 'contract')
    : null

  // Extract top-level component definitions (outside the router functions)
  const pageDefinitions = pageBundles.map(b => b.definition).join('\n\n')
  const getDefinitions = getBundles.map(b => b.definition).join('\n\n')
  const postDefinitions = postBundles.map(b => b.definition).join('\n\n')

  // Generate contract.js content
  const code = [
    '// Tana Unified Contract',
    `// Generated: ${new Date().toISOString()}`,
    '',
    '// External dependencies (provided by tana-edge)',
    'import { renderToString } from "react-dom/server";',
    'import { jsx, jsxs, Fragment } from "react/jsx-runtime";',
    '',
    '// ========== Blockchain Functions ==========',
    '',
    initBundle || '// No init() function defined',
    '',
    contractBundle || '// No contract() function defined',
    '',
    '// ========== Page Components ==========',
    '',
    pageDefinitions || '// No pages defined',
    '',
    '// ========== API Handlers ==========',
    '',
    getDefinitions || '// No GET handlers defined',
    '',
    postDefinitions || '// No POST handlers defined',
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
 * Used for init() and contract() which export named functions
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

interface TransformedBundle {
  /** The component/handler definition to place at top level */
  definition: string
  /** The function name to call in the router */
  functionName: string
}

/**
 * Bundle and transform a file for use in router
 * Extracts the default export and renames it to a unique identifier
 */
async function bundleAndTransform(
  filePath: string,
  type: 'page' | 'get' | 'post',
  index: number
): Promise<TransformedBundle> {
  const result = await build({
    entryPoints: [filePath],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    write: false,
    external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'],
    jsx: 'automatic',
    minify: false,
    treeShaking: true,
  })

  let code = result.outputFiles[0].text
  const prefix = type === 'page' ? 'Page' : type === 'get' ? 'GetHandler' : 'PostHandler'
  const functionName = `${prefix}_${index}`

  // Transform the code:
  // 1. Remove import statements (they'll be at module top level already)
  // 2. Remove the export statement and rename the default export

  // Remove import statements (jsx runtime is already imported at module level)
  code = code.replace(/^import\s+\{[^}]+\}\s+from\s+["'][^"']+["'];\s*$/gm, '')

  // Find and extract the main function/component
  // esbuild outputs: function ComponentName() {...} then export { ComponentName as default }
  // Or: var ComponentName = ...; export { ComponentName as default }

  // Replace the export statement with our renamed version
  // Match: export { SomeName as default };
  const exportMatch = code.match(/export\s*\{\s*(\w+)\s+as\s+default\s*\};?\s*$/)
  if (exportMatch) {
    const originalName = exportMatch[1]
    // Remove the export line
    code = code.replace(/export\s*\{\s*\w+\s+as\s+default\s*\};?\s*$/m, '')
    // Rename the original function/var to our unique name
    // Be careful to only rename the definition, not usages within the function
    const funcPattern = new RegExp(`^(function\\s+)${originalName}(\\s*\\()`, 'm')
    const varPattern = new RegExp(`^(var\\s+)${originalName}(\\s*=)`, 'm')

    if (funcPattern.test(code)) {
      code = code.replace(funcPattern, `$1${functionName}$2`)
    } else if (varPattern.test(code)) {
      code = code.replace(varPattern, `$1${functionName}$2`)
    }
  } else {
    // Fallback: try to match inline export default
    // export default function Name() or export default Name
    code = code.replace(
      /export\s+default\s+function\s+(\w+)/,
      `function ${functionName}`
    )
    code = code.replace(
      /export\s+default\s+(\w+)\s*;?\s*$/m,
      '' // Remove, we already renamed
    )
  }

  // Clean up empty lines
  code = code.replace(/^\s*\n/gm, '').trim()

  return {
    definition: `// ${type} ${index}: ${path.basename(filePath)}\n${code}`,
    functionName,
  }
}

/**
 * Generate SSR router function
 */
function generateSSRRouter(pages: RouteFile[], bundles: TransformedBundle[]): string {
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
    const componentName = bundles[i].functionName

    if (page.params) {
      // Dynamic route - use pattern matching
      const pattern = page.routePath.split('/').map(seg =>
        seg.startsWith(':') ? '([^/]+)' : seg
      ).join('\\/')

      return `    // ${page.routePath}
    if (path.match(/^${pattern}$/)) {
      const params = extractParams(path, "${page.routePath}");
      const html = renderToString(jsx(${componentName}, { request, params }));
      return {
        status: 200,
        body: '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root">' + html + '</div></body></html>',
        headers: { 'Content-Type': 'text/html' }
      };
    }`
    } else {
      // Static route
      return `    case '${page.routePath}': {
      const html = renderToString(jsx(${componentName}, { request }));
      return {
        status: 200,
        body: '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root">' + html + '</div></body></html>',
        headers: { 'Content-Type': 'text/html' }
      };
    }`
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
function generateAPIRouter(routes: RouteFile[], bundles: TransformedBundle[], method: 'get' | 'post'): string {
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
    const handlerName = bundles[i].functionName

    if (route.params) {
      const pattern = route.routePath.split('/').map(seg =>
        seg.startsWith(':') ? '([^/]+)' : seg
      ).join('\\/')

      return `    // ${route.routePath}
    if (path.match(/^${pattern}$/)) {
      const params = extractParams(path, "${route.routePath}");
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
