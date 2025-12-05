/**
 * Root API - GET Handler
 *
 * Route: GET /api
 * Returns API documentation and available endpoints
 */

export default function GET(request: any) {
  return {
    status: 200,
    body: {
      name: 'Tana API',
      version: '1.0.0',
      endpoints: {
        '/api/products': {
          GET: 'List products (Rails-style)',
          POST: 'Create product (Rails-style)',
        },
        '/api/orders': {
          GET: 'List orders (Drizzle-style)',
          POST: 'Create order (Drizzle-style)',
        },
      },
      database: {
        rails: 'model(table).where({}).limit(10)',
        drizzle: 'db.select().from(table).where(eq(...))',
      },
      timestamp: new Date().toISOString(),
    },
    headers: {
      'Content-Type': 'application/json',
    },
  }
}
