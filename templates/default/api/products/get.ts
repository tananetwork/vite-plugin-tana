/**
 * Products API - GET Handler (Rails-style)
 *
 * Demonstrates Rails-style ActiveRecord-inspired queries:
 * - Product.all() - Get all records
 * - Product.where() - Filter by conditions
 * - Product.find() - Find by ID
 * - Product.first() / Product.last()
 *
 * Route: GET /api/products
 */

import { model } from 'tana/db'
import { products } from '../../blockchain/schema'

// Create a Rails-style model from the Drizzle table
const Product = model(products)

export default async function GET(request: any) {
  try {
    // Parse query parameters for filtering
    const { inStock, limit } = request.query || {}

    let results

    if (inStock === 'true') {
      // Rails-style: Product.where({ condition })
      results = await Product
        .where({ inStock: true })
        .limit(limit ? parseInt(limit) : 10)
    } else {
      // Rails-style: Product.all() with limit
      results = await Product.all().limit(limit ? parseInt(limit) : 10)
    }

    return {
      status: 200,
      body: {
        products: results,
        count: results.length,
        style: 'rails',
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
