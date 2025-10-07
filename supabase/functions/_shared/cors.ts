/**
 * @fileoverview CORS Configuration
 * 
 * Centralized CORS headers for all Edge Functions.
 */

// In a real production environment, you should restrict this to your app's domain.
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://your-production-app-url.com', // Replace with your actual production URL
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '') ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Vary': 'Origin',
  };
}

