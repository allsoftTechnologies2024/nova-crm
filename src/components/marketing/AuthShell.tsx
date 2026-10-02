import { Bot, Mail, Mic, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui';

const ACTIVITY = [
  { icon: Mic, time: '9:02 AM', text: 'Captured Mehta Logistics from a voice note', accent: false },
  { icon: Sparkles, time: '9:02 AM', text: 'Scored 82 · hot lead, ₹3L budget', accent: false },
  { icon: Mail, time: '9:03 AM', text: 'Drafted a follow-up email for Rahul', accent: false },
  { icon: Bot, time: '9:05 AM', text: 'Moved Acme Corp to Proposal, reminder set for Friday', accent: true },
];

// Full-screen auth layout: form on the left, black panel with a live AI activity feed on the right.
export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mk grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12 lg:px-16">
        <Link href="/" className="w-fit">
          <Logo className="text-lg text-ink" />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 animate-fade-up flex-col justify-center py-12">
          <h1 className="display text-5xl">{title}</h1>
          <p className="mb-9 mt-4 text-sm text-ink-soft">{subtitle}</p>
          {children}
          {footer && <div className="mt-8 text-center text-sm text-ink-soft">{footer}</div>}
        </div>
        <p className="text-xs text-ink-soft">© {new Date().getFullYear()} LeadPilot · Secure sign-in</p>
      </div>

      <div className="m-3 hidden flex-col justify-between gap-10 rounded-[32px] bg-ink p-12 text-white lg:flex xl:p-14">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-white/60">
            <span className="size-2 animate-pulse rounded-full bg-rouge" /> Live in your workspace
          </p>
          <p className="display mt-6 text-5xl xl:text-6xl">
            Your pipeline,
            <br />
            <span className="text-[#ff5a45]">on autopilot.</span>
          </p>
        </div>

        <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-px before:bg-white/15">
          {ACTIVITY.map(({ icon: Icon, time, text, accent }, i) => (
            <li key={text} className="relative flex animate-rise items-center gap-4" style={{ animationDelay: `${200 + i * 140}ms` }}>
              <span className={`relative grid size-10 shrink-0 place-items-center rounded-full ${accent ? 'bg-rouge' : 'bg-white/10'}`}>
                <Icon className="size-4" />
              </span>
              <div className={`flex-1 rounded-2xl px-4 py-3 ${accent ? 'bg-white text-ink' : 'bg-white/[0.06]'}`}>
                <p className="text-sm leading-snug">{text}</p>
                <p className={`mt-0.5 text-[11px] ${accent ? 'text-ink-soft' : 'text-white/45'}`}>{time}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-4 text-ink">
            <p className="text-[11px] text-ink-soft">Open pipeline</p>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight xl:text-3xl">₹31.2L</p>
          </div>
          <div className="rounded-2xl bg-rouge p-4">
            <p className="text-[11px] text-white/75">Win rate</p>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight xl:text-3xl">59%</p>
          </div>
          <div className="rounded-2xl p-4 ring-1 ring-inset ring-white/20">
            <p className="text-[11px] text-white/60">Team online</p>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight xl:text-3xl">6</p>
          </div>
        </div>
      </div>
    </div>
  );
}
