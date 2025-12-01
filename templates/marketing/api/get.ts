/**
 * API GET Handler
 * Route: /api (accessible via HTTP GET)
 */
export default function handler(request: any) {
  return {
    status: 200,
    body: {
      message: 'Marketing API',
      features: ['Lightning Fast', 'Secure by Default', 'Easy Integration'],
      timestamp: new Date().toISOString(),
    },
    headers: {
      'Content-Type': 'application/json',
    },
  }
}
