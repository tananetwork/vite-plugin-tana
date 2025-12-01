/**
 * Example API GET Handler
 * File location: api/get.ts
 * Route: /api/get (accessible via HTTP GET)
 */
export default function GET(request: any) {
  return {
    status: 200,
    body: {
      message: 'Hello from API GET handler!',
      timestamp: new Date().toISOString(),
      path: request.path,
      query: request.query,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  }
}
