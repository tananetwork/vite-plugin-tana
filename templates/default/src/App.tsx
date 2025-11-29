// Shared component - used by both SSR and client hydration
import React from 'react'

export function App({ url }: { url: string }) {
  // State and interactivity - will only work after hydration
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
          This page was server-rendered using React inside tana-edge's V8 runtime.
        </p>
        <p className="text-slate-400 mb-6">
          Route: <code className="bg-slate-700 px-2 py-1 rounded text-purple-300">{url}</code>
        </p>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-emerald-400">Hydration Test</h2>
          <p className="mb-4">
            Status:{' '}
            <span className={`font-bold ${hydrated ? 'text-emerald-400' : 'text-amber-400'}`}>
              {hydrated ? '✅ Hydrated - Interactive!' : '⏳ Server-rendered - Waiting for hydration...'}
            </span>
          </p>
          <button
            onClick={() => setCount(c => c + 1)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
          >
            Count: {count}
          </button>
          <p className="text-xs text-slate-500 mt-4">
            Click the button to verify React hydration is working
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-cyan-400">What's happening:</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-300">
            <li>Polyfills provided TextEncoder, TextDecoder, etc.</li>
            <li>React + react-dom/server bundled together</li>
            <li>tana-edge executed in V8 isolate</li>
            <li>renderToString() produced this HTML</li>
            <li>Client bundle hydrates with hydrateRoot()</li>
          </ol>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          Built with Tailwind CSS + Tana Framework
        </p>
      </div>
    </div>
  )
}
