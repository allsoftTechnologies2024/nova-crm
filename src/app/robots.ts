import type { MetadataRoute } from 'next';
import { LEGAL } from '@/lib/legal';

export default function robots(): MetadataRoute.Robots {
  return {
    // Trailing slashes matter: a bare "/app" would also block /apple-icon.
    rules: { userAgent: '*', allow: '/', disallow: ['/app/', '/admin/', '/api/'] },
    sitemap: `${LEGAL.website}/sitemap.xml`,
    host: LEGAL.website,
  };
}
