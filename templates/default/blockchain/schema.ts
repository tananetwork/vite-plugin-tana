/**
 * Database Schema Definition
 *
 * tana/db provides multiple ways to interact with your database:
 *
 * 1. Raw SQL - Direct queries with parameterized values
 * 2. Drizzle-style - Type-safe query builder
 * 3. Rails-style - ActiveRecord-inspired model API
 *
 * Each contract gets its own isolated PostgreSQL database.
 * tana-edge handles connection pooling and isolation.
 */

import { table, text, uuid, timestamp, boolean, integer } from 'tana/db'

// ========== Products Table ==========
export const products = table('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(), // Stored in cents
  inStock: boolean('in_stock').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ========== Orders Table ==========
export const orders = table('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  status: text('status').default('pending'), // pending, confirmed, shipped, delivered
  total: integer('total').notNull(), // Stored in cents
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ========== Order Items (Join Table) ==========
export const orderItems = table('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull().default(1),
  priceAtTime: integer('price_at_time').notNull(), // Price when ordered
})
