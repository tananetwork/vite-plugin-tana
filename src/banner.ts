// Tana Terminal Banner
// ASCII art and terminal output formatting

// ANSI colors for terminal output
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
}

/**
 * Print custom Tana startup banner
 */
export function printTanaBanner(vitePort: number, edgePort: number) {
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
