/**
 * API GET Handler
 * Route: /api (accessible via HTTP GET)
 */
export default function handler(request: any) {
  return {
    status: 200,
    body: {
      message: 'Portfolio API',
      projects: [
        { id: 1, title: 'E-Commerce Platform' },
        { id: 2, title: 'DeFi Dashboard' },
        { id: 3, title: 'NFT Gallery' },
      ],
      timestamp: new Date().toISOString(),
    },
    headers: {
      'Content-Type': 'application/json',
    },
  }
}
