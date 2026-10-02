import { Clock, Globe, Mail, MapPin, Phone, User } from 'lucide-react';
import { LEGAL } from '@/lib/legal';

export const metadata = { title: 'Contact Us', description: `Get in touch with ${LEGAL.brand}.` };

export default function ContactPage() {
  const rows = [
    { icon: User, label: 'Operated by', value: `${LEGAL.operator} (${LEGAL.brand})` },
    { icon: Mail, label: 'Email', value: LEGAL.email, href: `mailto:${LEGAL.email}` },
    { icon: Phone, label: 'Phone / WhatsApp', value: LEGAL.phone, href: LEGAL.phoneHref },
    ...(LEGAL.address ? [{ icon: MapPin, label: 'Address', value: LEGAL.address }] : []),
    { icon: Globe, label: 'Website', value: LEGAL.domain, href: LEGAL.website },
    { icon: Clock, label: 'Support hours', value: LEGAL.supportHours },
  ];
  return (
    <div>
      <p className="eyebrow text-ink-soft">We usually reply within one business day</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Contact Us</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
        Questions about {LEGAL.brand}, billing, refunds or your data? Reach us any way below.
      </p>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        {rows.map(({ icon: Icon, label, value, href }) => (
          <li key={label} className="flex items-start gap-4 rounded-[22px] bg-white p-5 ring-1 ring-black/5">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-white">
              <Icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</span>
              {href ? (
                <a href={href} className="mt-0.5 block break-words font-semibold text-ink underline-offset-4 hover:underline">
                  {value}
                </a>
              ) : (
                <span className="mt-0.5 block font-semibold text-ink">{value}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-[22px] bg-ink p-6 text-white sm:p-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Billing or refund question?</h2>
        <p className="mt-2 max-w-xl text-white/75">
          Include your workspace name and the Razorpay payment ID (shown under Billing in the app) so we can help faster.
        </p>
        <a href={`mailto:${LEGAL.email}?subject=${encodeURIComponent(`${LEGAL.brand} support`)}`} className="pill-light mt-5 ring-0">
          <Mail className="size-4" /> Email support
        </a>
      </div>
    </div>
  );
}
