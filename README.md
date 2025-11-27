# @tananetwork/vite-plugin-tana

Vite plugin for building full-stack applications on the Tana blockchain platform with React SSR.

## Status: MVP Complete!

**What works today:**
- React SSR running inside tana-edge's V8 runtime (same runtime in dev and prod)
- Pre-bundled React (~77KB) embedded in tana-edge - contracts don't need to bundle React
- Vite HMR for instant client-side updates
- React hydration after SSR
- Contract size reduced from ~567KB to ~3.6KB (158x smaller!)

## Quick Start

```bash
# In test-edge-ssr/
npm install
npm run bundle:server  # Build SSR contract
npm run dev            # Start Vite + tana-edge
```

Open http://localhost:5173/ to see React SSR + hydration in action!

## Architecture

```
Browser Request → Vite (5173)
                    │
                    ├── Page Request → proxy to tana-edge (8506)
                    │                    └── /ssr/react-ssr endpoint
                    │                    └── V8 runs contract + pre-bundled React
                    │                    └── Returns raw HTML
                    │
                    └── Inject HMR scripts into HTML
                    └── Static Assets → Vite serves /src/*.tsx with HMR
                                      → React hydrateRoot() picks up SSR HTML
```

## Key Design Decisions

### Same Runtime in Dev and Prod

Unlike other frameworks that use Node.js for dev SSR and a different runtime for production, Tana uses tana-edge for both. This eliminates "works locally, breaks in prod" issues.

### Pre-bundled React

React + react-dom/server + jsx-runtime are bundled into the tana-edge binary at compile time using Rust's `include_str!`. User contracts only need their own application code.

**Before:** Contract bundles React → ~567KB
**After:** Contract uses tana-edge's React → ~3.6KB

### Smart Import Rewriting

tana-edge rewrites import statements at runtime:

```javascript
// User writes:
import { useState } from 'react'
import { renderToString } from 'react-dom/server'
import { jsx as jsx2 } from 'react/jsx-runtime'

// tana-edge transforms to:
const { useState } = globalThis.__TANA_REACT__
const { renderToString } = globalThis.__TANA_REACT_DOM_SERVER__
const { jsx: jsx2 } = globalThis.__TANA_JSX_RUNTIME__
```

## Project Structure

```
vite-plugin-tana/
├── src/
│   └── index.ts          # Vite plugin - spawns tana-edge, proxies SSR
├── test-edge-ssr/        # Test app demonstrating full stack
│   ├── src/
│   │   ├── App.tsx       # React component (shared between SSR and client)
│   │   ├── get.tsx       # SSR contract (runs in tana-edge)
│   │   └── client.tsx    # Client entry (hydrates SSR HTML)
│   └── vite.config.ts    # Plugin configuration
└── dist/                 # Built plugin
```

## Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tanaPlugin from 'vite-plugin-tana'

export default defineConfig({
  plugins: [
    react(),
    tanaPlugin({
      // Path to tana-edge binary
      edgeBinary: '/path/to/tana-edge',
      // Port for tana-edge SSR server
      edgePort: 8506,
      // Contract ID - maps to contracts/{contractId}/
      contractId: 'react-ssr',
      // Contracts directory
      contractsDir: '../../contracts',
    }),
  ],
})
```

## How SSR Works

### 1. SSR Contract (get.tsx)

```typescript
import { renderToString } from 'react-dom/server'
import { App } from './App.tsx'

export function Get(request: { path: string }) {
  const url = request?.path || '/'
  const appHtml = renderToString(<App url={url} />)

  return {
    status: 200,
    body: `<!DOCTYPE html>
      <html>
        <body>
          <div id="root">${appHtml}</div>
          <script>window.__TANA_DATA__ = { url: "${url}" }</script>
          <script type="module" src="/src/client.tsx"></script>
        </body>
      </html>`,
    headers: { 'Content-Type': 'text/html' }
  }
}
```

### 2. Client Hydration (client.tsx)

```typescript
import { hydrateRoot } from 'react-dom/client'
import { App } from './App.tsx'

const data = window.__TANA_DATA__ || { url: '/' }
hydrateRoot(document.getElementById('root')!, <App url={data.url} />)
```

### 3. Vite Plugin Flow

1. Plugin spawns tana-edge on startup
2. Detects when tana-edge is ready via stdout parsing
3. Page requests are proxied to tana-edge's `/ssr/{contractId}` endpoint
4. tana-edge returns raw HTML (no scripts injected)
5. Plugin injects Vite HMR client into `<head>`
6. Vite serves client assets with HMR enabled

## Development Roadmap

### v0.1.0 - Foundation (MVP Complete)
- [x] Basic Vite plugin structure
- [x] tana-edge spawn and management
- [x] SSR proxy to `/ssr/` endpoint
- [x] Pre-bundled React in tana-edge
- [x] Import rewriting for React modules
- [x] HMR script injection
- [x] Client hydration working

### v0.2.0 - DX Polish (Next)
- [ ] File-based routing from `app/views/`
- [ ] Auto-rebuild SSR contract on file changes
- [ ] Error overlay with stack traces
- [ ] TypeScript support for routes

### v0.3.0 - Framework Integration
- [ ] Controller pattern
- [ ] Model → schema extraction
- [ ] `tana/db` Active Record integration
- [ ] Route manifest from `config/routes.ts`

### v0.4.0 - Production
- [ ] Production build optimization
- [ ] Code splitting
- [ ] Asset fingerprinting
- [ ] Deploy command integration

## tana-edge Changes for SSR

The following was added to tana-edge to support this plugin:

### `/ssr/{contract_id}` Endpoint

Returns raw HTML without wrapping - suitable for Vite's HTML transform middleware.

### Pre-bundled React

```rust
// Embedded at compile time (~77KB minified)
const REACT_SSR_BUNDLE: &str = include_str!("react-ssr-bundle.js");
```

Provides globals:
- `globalThis.__TANA_REACT__` - React module
- `globalThis.__TANA_REACT_DOM_SERVER__` - ReactDOMServer module
- `globalThis.__TANA_JSX_RUNTIME__` - jsx, jsxs, Fragment

### Import Rewriting

Transforms ES6 imports to global access, including `as` alias support:

```javascript
// Handles:
import React from 'react'                    // default import
import { useState } from 'react'             // named import
import { jsx as jsx2 } from 'react/jsx-runtime' // aliased import
import * as ReactDOMServer from 'react-dom/server' // namespace import
```

## Related Packages

- `tana-edge` - Rust SSR server with embedded V8
- `@tananetwork/types` - TypeScript definitions
- `@tananetwork/crypto` - Ed25519 signing utilities

## License

MIT
