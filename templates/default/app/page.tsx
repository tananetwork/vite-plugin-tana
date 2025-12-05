/**
 * Home Page - Server Component
 *
 * This is a React Server Component rendered by tana-edge.
 * Server components run on the server and stream HTML via Flight protocol.
 * Client components (marked with 'use client') hydrate in the browser.
 */

// Import client component - this will be hydrated in the browser
import App from '../public/App'

export default function Page() {
  // This runs on the server only - safe to log server-only info
  const serverTimestamp = new Date().toISOString()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Server Component Section */}
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              Tana Framework Demo
            </h1>
            <p className="text-xl text-slate-600">
              Server Components + Client Components side by side
            </p>
          </header>

          {/* Server vs Client Comparison */}
          <section className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Server Component Info */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">🖥️</span>
                  <h2 className="text-2xl font-bold text-blue-800">Server Component</h2>
                </div>
                <div className="space-y-3">
                  <p className="text-slate-600">
                    This section rendered <strong>on the server</strong>.
                    No JavaScript shipped to client for this code.
                  </p>
                  <div className="bg-blue-50 rounded-lg p-4 font-mono text-sm">
                    <p className="text-blue-600">Server time:</p>
                    <p className="text-blue-800 font-bold">{serverTimestamp}</p>
                  </div>
                  <ul className="text-sm text-slate-500 space-y-1">
                    <li>✓ Zero client bundle size</li>
                    <li>✓ Direct database access</li>
                    <li>✓ Secrets stay on server</li>
                    <li>✓ SEO friendly (real HTML)</li>
                  </ul>
                </div>
              </div>

              {/* Client Component Info */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">🌐</span>
                  <h2 className="text-2xl font-bold text-purple-800">Client Component</h2>
                </div>
                <div className="space-y-3">
                  <p className="text-slate-600">
                    Components with <code className="bg-slate-100 px-1 rounded">'use client'</code>
                    run in browser. Used for interactivity.
                  </p>
                  <div className="bg-purple-50 rounded-lg p-4 font-mono text-sm">
                    <p className="text-purple-600">Directive:</p>
                    <p className="text-purple-800 font-bold">'use client'</p>
                  </div>
                  <ul className="text-sm text-slate-500 space-y-1">
                    <li>✓ useState, useEffect</li>
                    <li>✓ Event handlers (onClick)</li>
                    <li>✓ Browser APIs</li>
                    <li>✓ Real-time updates</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Database APIs Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">
              Database Access Patterns
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono">
                <p className="text-emerald-400 mb-2">// Rails-style</p>
                <pre className="text-slate-300">{`const Product = model(products)
await Product.where({ inStock: true })`}</pre>
                <p className="text-slate-500 mt-2">GET /api/products</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-4 text-sm font-mono">
                <p className="text-cyan-400 mb-2">// Drizzle-style</p>
                <pre className="text-slate-300">{`await db.select().from(orders)
  .where(eq(orders.status, 'pending'))`}</pre>
                <p className="text-slate-500 mt-2">GET /api/orders</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Client Component - Interactive Section */}
      <div className="border-t-4 border-purple-400">
        <App url="/" />
      </div>
    </div>
  )
}
