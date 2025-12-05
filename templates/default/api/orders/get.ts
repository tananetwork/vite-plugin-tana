/**
 * Orders API - GET Handler (Drizzle-style)
 *
 * Demonstrates Drizzle-style type-safe queries:
 * - db.select().from(table)
 * - .where(eq(column, value))
 * - .orderBy(desc(column))
 * - .limit(n)
 *
 * Route: GET /api/orders
 */

import { db, eq, desc } from 'tana/db'
import { orders, orderItems } from '../../blockchain/schema'

export default async function GET(request: any) {
  try {
    const { status, limit } = request.query || {}

    // Drizzle-style: Type-safe query builder
    let query = db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(limit ? parseInt(limit) : 10)

    // Add filter if status provided
    if (status) {
      query = query.where(eq(orders.status, status))
    }

    const results = await query

    return {
      status: 200,
      body: {
        orders: results,
        count: results.length,
        style: 'drizzle',
      },
      headers: { 'Content-Type': 'application/json' },
    }
  } catch (error: any) {
    return {
      status: 500,
      body: { error: error.message },
      headers: { 'Content-Type': 'application/json' },
    }
  }
}
