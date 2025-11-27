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
    <div>
      <h1>Hello from tana-edge!</h1>
      <p>This page was server-rendered using React inside tana-edge's V8 runtime.</p>
      <p>Route: <code>{url}</code></p>

      <div style={{ marginTop: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '8px' }}>
        <h2>Hydration Test</h2>
        <p>
          Status: <strong style={{ color: hydrated ? 'green' : 'orange' }}>
            {hydrated ? '✅ Hydrated - Interactive!' : '⏳ Server-rendered - Waiting for hydration...'}
          </strong>
        </p>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Count: {count}
        </button>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          Click the button to verify React hydration is working
        </p>
      </div>

      <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h2>What's happening:</h2>
        <ol>
          <li>Polyfills provided TextEncoder, TextDecoder, etc.</li>
          <li>React + react-dom/server bundled together</li>
          <li>tana-edge executed in V8 isolate</li>
          <li>renderToString() produced this HTML</li>
          <li>Client bundle hydrates with hydrateRoot()</li>
        </ol>
      </div>
    </div>
  )
}
