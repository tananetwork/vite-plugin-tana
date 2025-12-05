/**
 * Orders API - POST Handler (Drizzle-style)
 *
 * Demonstrates Drizzle-style record creation:
 * - db.insert(table).values({ ... })
 * - .returning() for getting inserted records
 * - Transaction support for atomicity
 *
 * Route: POST /api/orders
 */

import { db, transaction } from 'tana/db'
import { orders, orderItems } from '../../blockchain/schema'

interface OrderItem {
  productId: string
  quantity: number
  price: number
}

export default async function POST(request: any) {
  try {
    const { customerName, customerEmail, items } = request.body || {}

    if (!customerName || !customerEmail || !items?.length) {
      return {
        status: 400,
        body: { error: 'customerName, customerEmail, and items are required' },
        headers: { 'Content-Type': 'application/json' },
      }
    }

    // Calculate total from items
    const total = items.reduce(
      (sum: number, item: OrderItem) => sum + item.price * item.quantity,
      0
    )

    // Use transaction for atomic order creation
    const result = await transaction(async (tx) => {
      // Drizzle-style: db.insert().values().returning()
      const [order] = await tx
        .insert(orders)
        .values({
          customerName,
          customerEmail,
          total,
          status: 'pending',
        })
        .returning()

      // Insert order items
      const insertedItems = await tx
        .insert(orderItems)
        .values(
          items.map((item: OrderItem) => ({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            priceAtTime: item.price,
          }))
        )
        .returning()

      return { order, items: insertedItems }
    })

    return {
      status: 201,
      body: {
        order: result.order,
        items: result.items,
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
