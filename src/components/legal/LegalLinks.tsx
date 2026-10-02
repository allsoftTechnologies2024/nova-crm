import Link from 'next/link';
import { LEGAL_LINKS } from '@/lib/legal';

// Footer row of policy links — required on the public site for Razorpay live mode.
export default function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={`flex flex-wrap gap-x-5 gap-y-2 ${className}`}>
      {LEGAL_LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="hover:text-ink hover:underline underline-offset-4">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
