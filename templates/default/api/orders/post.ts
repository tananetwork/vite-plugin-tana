/**
 * Orders API - POST Handler (Drizzle-style)
 *
 * Demonstrates Drizzle-style record creation:
 * - db.insert(table).values({ ... })
 * - .returning() for getting inserted records
 *
 * Route: POST /api/orders
 */

import { db } from 'tana/db'
import { orders } from '../../blockchain/schema'

export default async function POST(request: any) {
  try {
    const { customerName, customerEmail, total } = request.body || {}

    if (!customerName || !customerEmail) {
      return {
        status: 400,
        body: { error: 'customerName and customerEmail are required' },
        headers: { 'Content-Type': 'application/json' },
      }
    }

    // Drizzle-style: db.insert().values().returning()
    const [order] = await db
      .insert(orders)
      .values({
        customerName,
        customerEmail,
        total: total || 0,
        status: 'pending',
      })
      .returning()

    return {
      status: 201,
      body: {
        order,
        message: 'Order created successfully',
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
