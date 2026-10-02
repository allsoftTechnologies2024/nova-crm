import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import LegalLinks from '@/components/legal/LegalLinks';
import { Logo } from '@/components/ui';
import { LEGAL } from '@/lib/legal';

// Shared shell for the policy pages: simple header, readable column, footer with all policy links.
export default function LegalLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="mk min-h-screen">
      <header className="border-b border-black/10 bg-chalk/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label={`${LEGAL.brand} home`}>
            <Logo className="text-ink" />
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
            <ArrowLeft className="size-4" /> Back to site
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">{children}</main>
      <footer className="border-t border-black/10 py-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-5 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {LEGAL.brand} · {LEGAL.operator}
          </p>
          <LegalLinks />
        </div>
      </footer>
    </div>
  );
}
