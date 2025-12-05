// Tana RSC Hydration Module Generator
// Generates client-side code for Flight protocol parsing and React hydration

import type { ProjectStructure } from './generator.js'

/**
 * Generate a virtual module for RSC client-side Flight parsing and hydration
 * This module fetches the Flight stream and reconstructs the React tree
 */
export function generateHydrationModule(structure: ProjectStructure | null, root: string): string {
  if (!structure || structure.pages.length === 0) {
    // No pages found - return minimal module that doesn't hydrate
    return `// No pages found - nothing to hydrate
console.log('[tana] No pages to hydrate');
`
  }

  // For RSC, we don't import page components on the client
  // Server components stay on the server - we just receive the Flight stream
  // Only client components (marked with 'use client') need to be registered

  // Generate imports for client components
  const clientImports = structure.clientComponents?.length > 0
    ? structure.clientComponents.map((cc, i) => {
        // Use relative path from project root for Vite to resolve
        const relativePath = cc.filePath.replace(root, '').replace(/^[\/\\]/, '')
        return `import ClientComponent_${i} from '/${relativePath}';
window.__registerClientComponent('${cc.moduleId}', ClientComponent_${i});`
      }).join('\n')
    : '// No client components to register'

  return `// Tana RSC Hydration Module (auto-generated)
// Uses Flight protocol to receive server-rendered component tree
import React from 'react';
import { createRoot } from 'react-dom/client';

// ========== Client Component Imports ==========
${clientImports}

// Flight protocol markers
const FLIGHT_ELEMENT = '$';
const FLIGHT_LAZY = '$L';
const FLIGHT_CLIENT_REF = '$C';
const FLIGHT_UNDEFINED = '$undefined';
const FLIGHT_PROMISE = '$@';

// Client component registry - populated by 'use client' components
const clientComponents = new Map();

// For dev, client components are registered globally by their modules
if (typeof window !== 'undefined') {
  window.__registerClientComponent = (moduleId, Component) => {
    clientComponents.set(moduleId, Component);
  };
}

// Row cache for Flight response
let rowCache = new Map();
let promiseCache = new Map();
let reactRoot = null;

function parseFlightRow(line) {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return null;
  const id = parseInt(line.slice(0, colonIndex), 10);
  const json = line.slice(colonIndex + 1);
  return { id, value: JSON.parse(json) };
}

function createStreamingPromise(id) {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  promise._resolve = resolve;
  promise._reject = reject;
  promise._id = id;
  return promise;
}

function flightToReact(value) {
  if (value === null) return null;
  if (value === FLIGHT_UNDEFINED) return undefined;

  if (typeof value === 'string') {
    if (value.startsWith(FLIGHT_LAZY)) {
      const id = parseInt(value.slice(2), 10);
      if (rowCache.has(id)) {
        return flightToReact(rowCache.get(id));
      }
      return React.createElement('div', { className: 'loading' }, 'Loading...');
    }
    if (value.startsWith(FLIGHT_PROMISE)) {
      const id = parseInt(value.slice(2), 10);
      if (!promiseCache.has(id)) {
        promiseCache.set(id, createStreamingPromise(id));
      }
      return promiseCache.get(id);
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    if (value[0] === FLIGHT_ELEMENT) {
      const [, type, key, props] = value;
      return createReactElement(type, key, props);
    }
    return value.map(item => flightToReact(item));
  }

  if (typeof value === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = flightToReact(v);
    }
    return result;
  }

  return value;
}

function createReactElement(type, key, props) {
  if (type === '$Suspense') {
    return React.createElement(
      React.Suspense,
      { key, fallback: flightToReact(props?.fallback) },
      flightToReact(props?.children)
    );
  }

  if (type.startsWith(FLIGHT_CLIENT_REF)) {
    const moduleId = type.slice(2);
    const Component = clientComponents.get(moduleId);
    if (!Component) {
      console.warn('[tana] Client component not registered:', moduleId);
      return React.createElement('div', { key, style: { color: 'red' } }, \`Missing: \${moduleId}\`);
    }
    const convertedProps = props ? flightToReact(props) : {};
    return React.createElement(Component, { key, ...convertedProps });
  }

  const convertedProps = props ? flightToReact(props) : {};
  const { children, ...restProps } = convertedProps;
  return React.createElement(type, { key, ...restProps }, children);
}

function render() {
  if (!rowCache.has(0)) return;
  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  if (!reactRoot) {
    reactRoot = createRoot(rootEl);
  }
  reactRoot.render(flightToReact(rowCache.get(0)));
}

function processFlightData(flightJson) {
  // Parse Flight rows from embedded data
  const lines = flightJson.split('\\n');
  for (const line of lines) {
    if (line.trim()) {
      const row = parseFlightRow(line);
      if (row) {
        rowCache.set(row.id, row.value);
      }
    }
  }
  render();
}

/**
 * Hydrate client components that were rendered as placeholders by the server
 * Server renders: <div data-tana-client="moduleId" data-tana-props="..."></div>
 * We mount the actual React component into each placeholder
 */
function hydrateClientComponents() {
  const placeholders = document.querySelectorAll('[data-tana-client]');
  console.log('[tana] Found', placeholders.length, 'client component placeholders');

  placeholders.forEach((placeholder) => {
    const moduleId = placeholder.getAttribute('data-tana-client');
    const propsJson = placeholder.getAttribute('data-tana-props') || '{}';

    if (!moduleId) return;

    const Component = clientComponents.get(moduleId);
    if (!Component) {
      console.warn('[tana] Client component not registered:', moduleId);
      placeholder.innerHTML = '<span style="color: red;">Missing: ' + moduleId + '</span>';
      return;
    }

    try {
      const props = JSON.parse(propsJson);
      const root = createRoot(placeholder);
      root.render(React.createElement(Component, props));
      console.log('[tana] Hydrated client component:', moduleId);
    } catch (e) {
      console.error('[tana] Failed to hydrate', moduleId, e);
    }
  });
}

async function loadPage() {
  // Check for server-rendered HTML with embedded Flight data
  const embeddedData = document.getElementById('__FLIGHT_DATA__');
  const rootEl = document.getElementById('root');

  if (embeddedData && rootEl && rootEl.children.length > 0) {
    // HTML-first mode: Server rendered actual HTML
    // Just hydrate client component placeholders
    console.log('[tana] HTML-first mode: hydrating client components only');
    hydrateClientComponents();
    return;
  }

  if (embeddedData) {
    // Flight-only mode: Have Flight data but need to render
    const flightJson = embeddedData.textContent || '';
    processFlightData(flightJson);
    return;
  }

  // Fallback: Fetch Flight stream from current URL (CSR mode)
  const pathname = window.location.pathname;
  const response = await fetch(pathname, {
    headers: { 'Accept': 'text/x-component' }
  });

  if (!response.ok) {
    console.error('[tana] RSC fetch failed:', response.status);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (line.trim()) {
        const row = parseFlightRow(line);
        if (row) {
          rowCache.set(row.id, row.value);
          render();
        }
      }
    }
  }

  if (buffer.trim()) {
    const row = parseFlightRow(buffer);
    if (row) {
      rowCache.set(row.id, row.value);
      render();
    }
  }
}

// Start loading when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadPage);
} else {
  loadPage();
}
`
}

/**
 * Generate client entry code for production RSC builds
 * This creates a standalone TypeScript file that esbuild can compile
 * Uses Flight protocol to receive and render server component output
 */
export function generateClientEntryCode(structure: ProjectStructure, root: string): string {
  if (!structure || structure.pages.length === 0) {
    return `// No pages found - nothing to hydrate
console.log('[tana] No pages to hydrate');
`
  }

  // For RSC, we don't import server components
  // The Flight protocol sends the rendered tree from the server
  // But we DO import client components so they can be hydrated

  // Generate imports for client components (in production, these get bundled)
  const clientImports = structure.clientComponents?.length > 0
    ? structure.clientComponents.map((cc, i) => {
        return `import ClientComponent_${i} from '${cc.filePath}';`
      }).join('\n')
    : ''

  const clientRegistrations = structure.clientComponents?.length > 0
    ? structure.clientComponents.map((cc, i) => {
        return `(window as any).__registerClientComponent('${cc.moduleId}', ClientComponent_${i});`
      }).join('\n')
    : '// No client components to register'

  return `// Tana RSC Client Entry (auto-generated for production)
// Uses Flight protocol to receive server-rendered component tree
import React from 'react';
import { createRoot } from 'react-dom/client';
${clientImports}

// Flight protocol markers
const FLIGHT_ELEMENT = '$';
const FLIGHT_LAZY = '$L';
const FLIGHT_CLIENT_REF = '$C';
const FLIGHT_UNDEFINED = '$undefined';
const FLIGHT_PROMISE = '$@';

// Client component registry
const clientComponents = new Map<string, React.ComponentType<any>>();

// Export for client components to register themselves
(window as any).__registerClientComponent = (moduleId: string, Component: React.ComponentType<any>) => {
  clientComponents.set(moduleId, Component);
};

// Register imported client components
${clientRegistrations}

// Row cache for Flight response
let rowCache = new Map<number, any>();
let promiseCache = new Map<number, any>();
let reactRoot: any = null;

function parseFlightRow(line: string): { id: number; value: any } | null {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return null;
  const id = parseInt(line.slice(0, colonIndex), 10);
  const json = line.slice(colonIndex + 1);
  return { id, value: JSON.parse(json) };
}

function createStreamingPromise(id: number) {
  let resolve: (value: any) => void;
  let reject: (reason: any) => void;
  const promise = new Promise((res, rej) => { resolve = res!; reject = rej!; });
  (promise as any)._resolve = resolve!;
  (promise as any)._reject = reject!;
  (promise as any)._id = id;
  return promise;
}

function flightToReact(value: any): any {
  if (value === null) return null;
  if (value === FLIGHT_UNDEFINED) return undefined;

  if (typeof value === 'string') {
    if (value.startsWith(FLIGHT_LAZY)) {
      const id = parseInt(value.slice(2), 10);
      if (rowCache.has(id)) {
        return flightToReact(rowCache.get(id));
      }
      return React.createElement('div', { className: 'loading' }, 'Loading...');
    }
    if (value.startsWith(FLIGHT_PROMISE)) {
      const id = parseInt(value.slice(2), 10);
      if (!promiseCache.has(id)) {
        promiseCache.set(id, createStreamingPromise(id));
      }
      return promiseCache.get(id);
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    if (value[0] === FLIGHT_ELEMENT) {
      const [, type, key, props] = value;
      return createReactElement(type, key, props);
    }
    return value.map(item => flightToReact(item));
  }

  if (typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = flightToReact(v);
    }
    return result;
  }

  return value;
}

function createReactElement(type: string, key: string | null, props: any) {
  if (type === '$Suspense') {
    return React.createElement(
      React.Suspense,
      { key, fallback: flightToReact(props?.fallback) },
      flightToReact(props?.children)
    );
  }

  if (type.startsWith(FLIGHT_CLIENT_REF)) {
    const moduleId = type.slice(2);
    const Component = clientComponents.get(moduleId);
    if (!Component) {
      console.warn('[tana] Client component not registered:', moduleId);
      return React.createElement('div', { key, style: { color: 'red' } }, \`Missing: \${moduleId}\`);
    }
    const convertedProps = props ? flightToReact(props) : {};
    return React.createElement(Component, { key, ...convertedProps });
  }

  const convertedProps = props ? flightToReact(props) : {};
  const { children, ...restProps } = convertedProps;
  return React.createElement(type, { key, ...restProps }, children);
}

function render() {
  if (!rowCache.has(0)) return;
  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  if (!reactRoot) {
    reactRoot = createRoot(rootEl);
  }
  reactRoot.render(flightToReact(rowCache.get(0)));
}

async function loadPage() {
  const pathname = window.location.pathname;

  // Fetch Flight stream from RSC endpoint
  const response = await fetch(pathname, {
    headers: { 'Accept': 'text/x-component' }
  });

  if (!response.ok) {
    console.error('[tana] RSC fetch failed:', response.status);
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (line.trim()) {
        const row = parseFlightRow(line);
        if (row) {
          rowCache.set(row.id, row.value);
          render();
        }
      }
    }
  }

  if (buffer.trim()) {
    const row = parseFlightRow(buffer);
    if (row) {
      rowCache.set(row.id, row.value);
      render();
    }
  }
}

// Start loading when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadPage);
} else {
  loadPage();
}
`
}
