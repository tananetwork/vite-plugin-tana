
import { createServer } from 'http'
import { renderToString } from 'react-dom/server'
import React from 'react'

// Simple router for dev testing
const routes = {}

// Will be populated by the plugin
export function registerRoute(path, component) {
  routes[path] = component
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')

  try {
    // For now, return a simple React-rendered page
    const App = routes[url.pathname] || routes['/'] || DefaultPage

    const html = renderToString(React.createElement(App, { url: url.pathname }))

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tana App</title>
</head>
<body>
  <div id="root">${html}</div>
  <script>window.__TANA_DATA__ = {}</script>
</body>
</html>`

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(fullHtml)
  } catch (error) {
    console.error('SSR Error:', error)
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('SSR Error: ' + error.message)
  }
})

function DefaultPage({ url }) {
  return React.createElement('div', null,
    React.createElement('h1', null, 'Tana Framework'),
    React.createElement('p', null, 'Route: ' + url),
    React.createElement('p', null, 'SSR is working!')
  )
}

server.listen(8506, () => {
  console.log('[tana-dev-ssr] Server running on port 8506')
})
