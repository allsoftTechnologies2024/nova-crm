import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Inter_Tight, Plus_Jakarta_Sans } from 'next/font/google';
import { LEGAL } from '@/lib/legal';
import { SITE_DESCRIPTION, SITE_TITLE } from '@/lib/seo';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ variable: '--font-jakarta', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const interTight = Inter_Tight({ variable: '--font-inter-tight', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(LEGAL.website),
  title: { default: SITE_TITLE, template: `%s · ${LEGAL.brand}` },
  description: SITE_DESCRIPTION,
  applicationName: LEGAL.brand,
  keywords: ['CRM', 'CRM software', 'AI CRM', 'CRM for small business', 'sales CRM India', 'lead management software', 'Smalo', 'Smalo AI'],
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: LEGAL.brand, statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

// viewport-fit=cover lets the app paint under the notch / home indicator; safe-area insets pad it back in.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f7f6f4',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${geistMono.variable} ${interTight.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
