// Addis Plugin Types
// Shared types and interfaces for vite-plugin-addis

export interface AddisPluginOptions {
  /**
   * Path to tana-edge binary
   * @default 'tana-edge' (assumes in PATH)
   */
  edgeBinary?: string

  /**
   * Port for tana-edge RSC server
   * @default 8516
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

export interface RouteManifest {
  routes: Array<{
    path: string
    component?: string    // page.tsx component (optional)
    get?: string         // get.ts handler (optional)
    post?: string        // post.ts handler (optional)
    layouts?: string[]   // layout chain from root → leaf (optional)
  }>
}

// Virtual module IDs for client-side hydration
export const VIRTUAL_HYDRATE_ID = 'virtual:addis-hydrate'
export const RESOLVED_VIRTUAL_HYDRATE_ID = '\0' + VIRTUAL_HYDRATE_ID
