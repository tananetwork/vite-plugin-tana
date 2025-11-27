// Client entry for React hydration
import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { App } from './App.tsx'

// Get initial data from server-rendered script tag
declare global {
  interface Window {
    __TANA_DATA__: { url: string }
  }
}

const data = window.__TANA_DATA__ || { url: '/' }

// Hydrate the server-rendered React tree
const root = document.getElementById('root')
if (root) {
  hydrateRoot(root, <App url={data.url} />)
  console.log('✅ React hydration complete!')
} else {
  console.error('❌ Could not find #root element for hydration')
}
