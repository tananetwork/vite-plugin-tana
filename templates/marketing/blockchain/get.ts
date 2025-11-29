// API GET handler for {{name}}
// This file handles GET /api/* requests in development
// tana-edge will execute this when API GET requests come in

export function get(req: Request): Response {
  // Parse the path from the request URL
  const url = new URL(req.url)
  const path = url.searchParams.get('path') || '/'

  // Example: return different data based on path
  if (path === '/users') {
    return Response.json({
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]
    })
  }

  // Default response
  return Response.json({
    message: 'Hello from {{name}} API',
    path,
    timestamp: Date.now()
  })
}
