/**
 * API GET Handler
 * Route: /api (accessible via HTTP GET)
 */
export default function handler(request: any) {
  return {
    status: 200,
    body: {
      message: 'Hello from Tana API',
      timestamp: new Date().toISOString(),
    },
    headers: {
      'Content-Type': 'application/json',
    },
  }
}
