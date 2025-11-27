// SSR contract for tana-edge
// Note: Uses pre-bundled React from tana-edge! No bundling needed.

import React from 'react'
import { renderToString } from 'react-dom/server'
import { App } from './App.tsx'

// tana-edge contract entry point
export function Get(request: { path: string }) {
  const url = request?.path || '/'

  // Render React to HTML string
  const appHtml = renderToString(<App url={url} />)

  // Full HTML with client hydration script
  // In dev: Vite serves /src/client.tsx with HMR
  // In prod: Bundled client.js would be served from CDN/static
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tana React SSR</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    button {
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
    }
    .status {
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
    }
    .status.hydrated {
      background: #d4edda;
      color: #155724;
    }
    .status.ssr {
      background: #fff3cd;
      color: #856404;
    }
  </style>
</head>
<body>
  <div id="root">${appHtml}</div>
  <script>window.__TANA_DATA__ = { url: "${url}" };</script>
  <script type="module" src="/src/client.tsx"></script>
</body>
</html>`

  return {
    status: 200,
    body: html,
    headers: {
      'Content-Type': 'text/html'
    }
  }
}
