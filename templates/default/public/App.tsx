'use client'
// Client Component - uses React state and effects
import React from 'react'

export function App({ url }: { url: string }) {
  // State and interactivity - available immediately in client components
  const [count, setCount] = React.useState(0)
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    setHydrated(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Hello from tana-edge!
        </h1>
        <p className="text-slate-300 mb-2">
          This page uses React Server Components with Flight protocol streaming.
        </p>
        <p className="text-slate-400 mb-6">
          Route: <code className="bg-slate-700 px-2 py-1 rounded text-purple-300">{url}</code>
        </p>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-emerald-400">Client Component Test</h2>
          <p className="mb-4">
            Status:{' '}
            <span className={`font-bold ${hydrated ? 'text-emerald-400' : 'text-amber-400'}`}>
              {hydrated ? '✅ Mounted - Interactive!' : '⏳ Loading...'}
            </span>
          </p>
          <button
            onClick={() => setCount(c => c + 1)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
          >
            Count: {count}
          </button>
          <p className="text-xs text-slate-500 mt-4">
            This is a client component - click to test interactivity
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-cyan-400">How RSC works:</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-300">
            <li>Server Components render on the server only</li>
            <li>Flight protocol streams the component tree</li>
            <li>Client Components (like this) run in browser</li>
            <li>Progressive loading with Suspense boundaries</li>
            <li>Smaller client bundle - server code stays on server</li>
          </ol>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          Built with Tailwind CSS + Tana Framework (RSC)
        </p>
      </div>
    </div>
  )
}
