import type { MetadataRoute } from 'next';
import { LEGAL, LEGAL_LINKS } from '@/lib/legal';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { path: '/', priority: 1, changeFrequency: 'weekly' as const },
    { path: '/signup', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/login', priority: 0.5, changeFrequency: 'yearly' as const },
    ...LEGAL_LINKS.map(({ href }) => ({ path: href, priority: 0.3, changeFrequency: 'yearly' as const })),
  ].map(({ path, ...rest }) => ({ url: `${LEGAL.website}${path === '/' ? '' : path}`, ...rest }));
}
