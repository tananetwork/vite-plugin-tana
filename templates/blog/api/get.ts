/**
 * API GET Handler
 * Route: /api (accessible via HTTP GET)
 */
export default function handler(request: any) {
  return {
    status: 200,
    body: {
      message: 'Blog API',
      posts: [
        { id: 1, title: 'Getting Started with Tana' },
        { id: 2, title: 'Understanding Smart Contracts' },
        { id: 3, title: 'Building with TypeScript' },
      ],
      timestamp: new Date().toISOString(),
    },
    headers: {
      'Content-Type': 'application/json',
    },
  }
}
