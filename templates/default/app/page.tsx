/**
 * Home Page - Server Component
 *
 * This is a React Server Component rendered by tana-edge.
 * It can directly access the database and return HTML via Flight protocol.
 */

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Welcome to Tana
          </h1>
          <p className="text-xl text-slate-600">
            React Server Components on the blockchain with streaming Flight protocol
          </p>
        </header>

        {/* Database APIs Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-semibold text-slate-800 mb-6">
            Database Access Patterns
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rails-style Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">💎</span>
                <h3 className="text-xl font-semibold text-slate-800">Rails-style</h3>
              </div>
              <p className="text-slate-600 mb-4">
                ActiveRecord-inspired API for familiar, readable queries
              </p>
              <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono overflow-x-auto">
                <pre className="text-green-400">{`import { model } from 'tana/db'
import { products } from './schema'

const Product = model(products)

// Find all products
await Product.all()

// Filter with where
await Product.where({ inStock: true })

// Create a record
await Product.create({ name: 'Widget' })`}</pre>
              </div>
              <p className="text-slate-500 text-sm mt-4">
                Try: <code className="bg-slate-100 px-2 py-1 rounded">GET /api/products</code>
              </p>
            </div>

            {/* Drizzle-style Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🔷</span>
                <h3 className="text-xl font-semibold text-slate-800">Drizzle-style</h3>
              </div>
              <p className="text-slate-600 mb-4">
                Type-safe query builder with full SQL expressiveness
              </p>
              <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono overflow-x-auto">
                <pre className="text-blue-400">{`import { db, eq, desc } from 'tana/db'
import { orders } from './schema'

// Select with type safety
await db.select()
  .from(orders)
  .where(eq(orders.status, 'pending'))
  .orderBy(desc(orders.createdAt))

// Insert with returning
await db.insert(orders)
  .values({ customerName: 'John' })
  .returning()`}</pre>
              </div>
              <p className="text-slate-500 text-sm mt-4">
                Try: <code className="bg-slate-100 px-2 py-1 rounded">GET /api/orders</code>
              </p>
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-semibold text-slate-800 mb-6">
            How It Works
          </h2>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">📁</div>
                <h4 className="font-semibold text-slate-800 mb-2">File-based Routing</h4>
                <p className="text-slate-600 text-sm">
                  <code className="bg-slate-100 px-1 rounded">app/page.tsx</code> → Pages<br />
                  <code className="bg-slate-100 px-1 rounded">api/get.ts</code> → API routes
                </p>
              </div>

              <div className="text-center">
                <div className="text-4xl mb-3">⚡</div>
                <h4 className="font-semibold text-slate-800 mb-2">RSC + Flight</h4>
                <p className="text-slate-600 text-sm">
                  Server components stream via Flight protocol.
                  Zero client-side bundling for server code.
                </p>
              </div>

              <div className="text-center">
                <div className="text-4xl mb-3">🔐</div>
                <h4 className="font-semibold text-slate-800 mb-2">Isolated DB</h4>
                <p className="text-slate-600 text-sm">
                  Each contract gets its own PostgreSQL database.
                  Automatic connection pooling.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* File Structure Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-semibold text-slate-800 mb-6">
            Project Structure
          </h2>

          <div className="bg-slate-900 rounded-xl p-6 font-mono text-sm overflow-x-auto">
            <pre className="text-slate-300">{`my-app/
├── app/
│   └── page.tsx           # Server Component (this page)
├── api/
│   ├── get.ts             # Root API handler
│   ├── products/
│   │   ├── get.ts         # Rails-style: GET /api/products
│   │   └── post.ts        # Rails-style: POST /api/products
│   └── orders/
│       ├── get.ts         # Drizzle-style: GET /api/orders
│       └── post.ts        # Drizzle-style: POST /api/orders
├── blockchain/
│   └── schema.ts          # Database schema definition
└── public/
    └── App.tsx            # Client component ('use client')`}</pre>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-sm">
          <p>
            Built with <span className="text-red-500">♥</span> using{' '}
            <a href="https://tana.network" className="text-blue-600 hover:underline">
              Tana Framework
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}
