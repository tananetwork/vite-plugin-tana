// Addis Route Scanner
// File-based routing from app/ directory

import path from 'path'
import fs from 'fs'
import type { RouteManifest } from './types.js'

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
export async function scanRoutes(root: string): Promise<RouteManifest> {
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
