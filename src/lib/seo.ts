import type { Metadata } from 'next';
import { LEGAL } from './legal';

export const SITE_TITLE = `${LEGAL.brand} — AI CRM for small sales teams`;
export const SITE_DESCRIPTION = `${LEGAL.brand} is CRM software for small sales teams. Capture leads by voice, text or photo, get a score and next step for every deal, and let Smalo AI keep your pipeline up to date.`;

// Listed explicitly: a page that sets openGraph replaces the parent's, including the opengraph-image file.
const IMAGE = '/opengraph-image';
const OPEN_GRAPH = { type: 'website' as const, siteName: LEGAL.brand, locale: 'en_IN', images: [IMAGE] };

// Metadata for an indexable public page. Canonical and og:url are set per page: if the root layout set
// them, every child page would inherit them and tell search engines it is a duplicate of the home page.
export const publicPage = (path: string, title: string | null, description = SITE_DESCRIPTION): Metadata => ({
  ...(title ? { title } : {}),
  description,
  alternates: { canonical: path },
  openGraph: { ...OPEN_GRAPH, url: path, title: title ? `${title} · ${LEGAL.brand}` : SITE_TITLE, description },
  twitter: { card: 'summary_large_image', title: title ? `${title} · ${LEGAL.brand}` : SITE_TITLE, description, images: [IMAGE] },
});

export const NO_INDEX: Metadata['robots'] = { index: false, follow: false };
