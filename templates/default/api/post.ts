/**
 * Example API POST Handler
 * File location: api/post.ts
 * Route: /api/post (accessible via HTTP POST)
 */
export default function handler(request: any) {
  return {
    status: 200,
    body: {
      message: 'Data received via POST!',
      receivedData: request.body,
      timestamp: new Date().toISOString(),
    },
    headers: {
      'Content-Type': 'application/json',
    },
  }
}
