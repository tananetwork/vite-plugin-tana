import React, { useState } from 'react'

interface Props {
  url?: string
}

export default function HomePage({ url }: Props) {
  const [count, setCount] = useState(0)

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Tana Framework</h1>
      <p style={{ color: '#666' }}>
        This page was server-side rendered by tana-edge
      </p>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>SSR Test</h2>
        <p>If you can see this, SSR is working!</p>
        <p>Current route: <code>{url || '/'}</code></p>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#e8f5e9', borderRadius: '8px' }}>
        <h2>Hydration Test</h2>
        <p>Click the button to test if React hydrated correctly:</p>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            cursor: 'pointer',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Count: {count}
        </button>
        {count > 0 && (
          <p style={{ color: 'green', marginTop: '0.5rem' }}>
            Hydration is working! React is interactive.
          </p>
        )}
      </div>

      <nav style={{ marginTop: '2rem' }}>
        <h3>Navigation</h3>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/posts">Posts</a></li>
          <li><a href="/posts/123">Post #123</a></li>
        </ul>
      </nav>
    </div>
  )
}
