/**
 * Products API - POST Handler (Rails-style)
 *
 * Demonstrates Rails-style record creation:
 * - Product.create() - Insert a new record
 * - Product.update() - Update existing record
 * - Product.destroy() - Delete a record
 *
 * Route: POST /api/products
 */

import { model } from 'tana/db'
import { products } from '../../blockchain/schema'

const Product = model(products)

export default async function POST(request: any) {
  try {
    const { name, description, price, inStock } = request.body || {}

    if (!name || typeof price !== 'number') {
      return {
        status: 400,
        body: { error: 'name and price are required' },
        headers: { 'Content-Type': 'application/json' },
      }
    }

    // Rails-style: Product.create({ attributes })
    const product = await Product.create({
      name,
      description: description || null,
      price, // Price in cents
      inStock: inStock !== false,
    })

    return {
      status: 201,
      body: {
        product,
        message: 'Product created successfully',
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
