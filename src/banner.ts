// Addis Terminal Banner
// ASCII art and terminal output formatting using @tananetwork/stdio

import os from 'os'
import { ascii } from '@tananetwork/stdio'

// ANSI colors for terminal output
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
}

/**
 * Get the primary network IP address (non-internal IPv4)
 */
function getNetworkAddress(): string | null {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return null
}

interface BannerOptions {
  vitePort: number
  edgePort: number
  host?: boolean | string
}

/**
 * Print Addis startup banner
 * Uses @tananetwork/stdio for consistent styling
 */
export function printAddisBanner(options: BannerOptions) {
  const { vitePort, edgePort, host } = options
  const { reset, bold, cyan, green, gray, dim } = colors

  // Clear screen and move cursor to top
  console.log('\x1b[2J\x1b[H')

  // Print ADDIS ASCII art using stdio
  console.log(ascii('addis'))

  console.log(`${gray}  React Server Components + Tailwind + TypeScript${reset}`)
  console.log()

  // Server info
  console.log(`${gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}`)
  console.log()
  console.log(`  ${green}➜${reset}  ${bold}Local:${reset}   ${cyan}http://localhost:${vitePort}/${reset}`)

  // Show network URL if host mode is enabled
  if (host) {
    const networkAddress = getNetworkAddress()
    if (networkAddress) {
      console.log(`  ${dim}➜${reset}  ${dim}Network:${reset} ${dim}http://${networkAddress}:${vitePort}/${reset}`)
    }
  }

  console.log(`  ${dim}➜${reset}  ${dim}Edge:${reset}    ${dim}http://localhost:${edgePort}/${reset}`)
  console.log()
  console.log(`${gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${reset}`)
  console.log()
  console.log(`  ${gray}press${reset} ${bold}h${reset} ${gray}to show help${reset}`)
  console.log()
}
