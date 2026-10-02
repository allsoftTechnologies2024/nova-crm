import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Inter_Tight, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ variable: '--font-jakarta', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const interTight = Inter_Tight({ variable: '--font-inter-tight', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'LeadPilot — the AI-first CRM', template: '%s · LeadPilot' },
  description: 'Capture, score and close leads with Claude and Gemini. Role-based access, Razorpay billing.',
  applicationName: 'LeadPilot',
  appleWebApp: { capable: true, title: 'LeadPilot', statusBarStyle: 'default' },
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
