import type { MetadataRoute } from 'next';

// Lets phones "Add to Home Screen" and open the CRM full-screen like a native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Smart CRM — the AI-first CRM',
    short_name: 'Smart CRM',
    description: 'Capture, score and close leads with AI.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f7f6f4',
    theme_color: '#151515',
    icons: [{ src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }],
  };
}
