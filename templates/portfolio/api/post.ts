/**
 * API POST Handler
 * Route: /api (accessible via HTTP POST)
 */
export default function handler(request: any) {
  return {
    status: 200,
    body: {
      message: 'Data received',
      receivedData: request.body,
      timestamp: new Date().toISOString(),
    },
    headers: {
      'Content-Type': 'application/json',
    },
  }
}
