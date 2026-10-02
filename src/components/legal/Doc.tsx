import type { ReactNode } from 'react';
import { LEGAL } from '@/lib/legal';

// Page title + readable body styles for policy documents (no typography plugin needed).
export default function Doc({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <article>
      <p className="eyebrow text-ink-soft">Last updated {LEGAL.updated}</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      {intro && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">{intro}</p>}
      <div
        className="mt-10 space-y-4 text-[15px] leading-7 text-ink/85
          [&_a]:font-semibold [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4
          [&_h2]:pt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink
          [&_h3]:pt-2 [&_h3]:font-semibold [&_h3]:text-ink
          [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
      >
        {children}
      </div>
    </article>
  );
}

export function ContactBlock() {
  return (
    <ul>
      <li>
        Email: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
      </li>
      <li>
        Phone: <a href={LEGAL.phoneHref}>{LEGAL.phone}</a>
      </li>
      {LEGAL.address && <li>Address: {LEGAL.address}</li>}
      <li>Website: {LEGAL.website}</li>
    </ul>
  );
}
