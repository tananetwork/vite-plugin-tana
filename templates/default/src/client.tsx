/**
 * Client Hydration Entry Point
 * This file handles React hydration on the client side
 */
import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import HomePage from '../app/page'
import './styles.css'

// Hydrate the server-rendered content
const rootElement = document.getElementById('root')
if (rootElement) {
  hydrateRoot(rootElement, <HomePage />)
  console.log('✅ React hydration complete!')
} else {
  console.error('❌ Could not find #root element for hydration')
}
