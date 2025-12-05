/**
 * Root API - POST Handler
 *
 * Route: POST /api
 * Echo endpoint for testing POST requests
 */

export default function POST(request: any) {
  return {
    status: 200,
    body: {
      message: 'Echo POST',
      received: request.body,
      tip: 'Use /api/products or /api/orders for database operations',
      timestamp: new Date().toISOString(),
    },
    headers: {
      'Content-Type': 'application/json',
    },
  }
}
