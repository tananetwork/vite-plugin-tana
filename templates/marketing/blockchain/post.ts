// API POST handler for {{name}}
// This file handles POST /api/* requests in development
// tana-edge will execute this when API POST requests come in

export async function post(req: Request): Promise<Response> {
  // Parse the path from the request URL
  const url = new URL(req.url)
  const path = url.searchParams.get('path') || '/'

  // Parse the request body
  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    // Body might not be JSON
  }

  // Example: handle form submissions
  if (path === '/contact') {
    return Response.json({
      success: true,
      message: 'Message received',
      data: body
    })
  }

  // Default response
  return Response.json({
    success: true,
    message: 'Action processed',
    path,
    body,
    timestamp: Date.now()
  })
}
