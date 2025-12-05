import React from 'react'

/**
 * React Server Component (RSC) Page
 * This demonstrates the unified contract architecture with file-based routing.
 *
 * File location: app/page.tsx
 * Route: / (root)
 *
 * This is a Server Component - it runs on the server and streams HTML via Flight protocol.
 * For interactive components, use 'use client' directive.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to tana framework
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          React Server Components with Flight protocol streaming
        </p>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            What you're seeing:
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>React Server Components with streaming HTML</li>
            <li>File-based routing (this is <code className="bg-gray-100 px-2 py-1 rounded">app/page.tsx</code>)</li>
            <li>Unified contract with all code inlined for zero I/O</li>
            <li>Flight protocol for progressive loading</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              🎯 Features
            </h3>
            <ul className="space-y-1 text-gray-700">
              <li>• React Server Components</li>
              <li>• API routes</li>
              <li>• Blockchain integration</li>
              <li>• Hot module replacement</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              ⚡ Performance
            </h3>
            <ul className="space-y-1 text-gray-700">
              <li>• Streaming TTFB</li>
              <li>• Zero filesystem I/O</li>
              <li>• Inline bundling</li>
              <li>• Progressive loading</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Create new pages in <code className="bg-blue-100 px-2 py-1 rounded">app/</code>,
            API endpoints in <code className="bg-blue-100 px-2 py-1 rounded">api/</code>,
            and blockchain logic in <code className="bg-blue-100 px-2 py-1 rounded">blockchain/</code>
          </p>
        </div>
      </div>
    </div>
  )
}
