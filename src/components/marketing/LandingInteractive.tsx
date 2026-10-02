'use client';

import { ArrowRight, Bot, ChevronLeft, ChevronRight, Gauge, ImagePlus, Mail, Plus, ShieldCheck, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScoreRing } from '@/components/ui';

/* ---------- "How it works" carousel (big colour panel with prev/next) ---------- */

const STEPS: { bg: string; tag: string; title: string; text: string; demo: ReactNode }[] = [
  {
    bg: 'bg-tang',
    tag: '@capture',
    title: 'Talk, paste or snap.',
    text: 'A voice note, a WhatsApp thread or a business card photo becomes a clean lead with company, contact, budget and follow-up.',
    demo: (
      <div className="space-y-3">
        <p className="rounded-2xl rounded-bl-sm bg-white/20 p-4 text-sm leading-relaxed text-white backdrop-blur">
          “Met Rahul from Mehta Logistics at the expo, 40 trucks, wants fleet tracking, budget around 3 lakh. Call him Thursday afternoon.”
        </p>
        <div className="rounded-2xl bg-white p-4 text-ink shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">Mehta Logistics</p>
              <p className="text-xs text-ink-soft">Rahul Mehta · Expo</p>
            </div>
            <ScoreRing score={78} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            <span className="rounded-full bg-sun px-2.5 py-1">Qualified</span>
            <span className="rounded-full bg-zest px-2.5 py-1">₹3,00,000</span>
            <span className="rounded-full bg-ink px-2.5 py-1 text-white">Thu 3:00 PM</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    bg: 'bg-cobalt',
    tag: '@score',
    title: 'Every lead, scored.',
    text: 'A 0–100 score, a one-line read on the deal and the single best next step, refreshed as the conversation moves.',
    demo: (
      <div className="rounded-3xl bg-white p-5 text-ink shadow-xl">
        <div className="flex items-center gap-4">
          <ScoreRing score={82} size={72} />
          <div>
            <p className="eyebrow text-[10px] text-ink-soft">AI score</p>
            <p className="font-display text-xl font-semibold tracking-tight">Hot · likely to close</p>
          </div>
        </div>
        <p className="mt-4 rounded-2xl bg-chalk p-3 text-sm">
          <b>Next step:</b> send the fleet-tracking proposal before Thursday’s call.
        </p>
      </div>
    ),
  },
  {
    bg: 'bg-berry',
    tag: '@follow-up',
    title: 'Follow-ups, written.',
    text: 'Personal email and WhatsApp drafts built from the full lead history. Review, tweak, send.',
    demo: (
      <div className="rounded-3xl bg-white p-5 text-sm text-ink shadow-xl">
        <p className="text-xs text-ink-soft">To: rahul@mehtalogistics.in</p>
        <p className="mt-2 font-semibold">Fleet tracking for your 40 trucks</p>
        <p className="mt-2 leading-relaxed text-ink/80">Hi Rahul, great meeting you at the expo. As promised, here’s a proposal sized for your fleet, within the ₹3L budget we discussed…</p>
        <div className="mt-4 flex gap-2">
          <span className="rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white">Send</span>
          <span className="rounded-full bg-chalk px-3 py-1.5 text-xs font-medium">Rewrite shorter</span>
        </div>
      </div>
    ),
  },
  {
    bg: 'bg-moss',
    tag: '@copilot',
    title: 'Ask. It acts.',
    text: '“Move Acme to proposal.” “Who’s slipping this week?” Copilot reads your pipeline and does the work, within your role’s permissions.',
    demo: (
      <div className="space-y-3 text-sm">
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-white px-4 py-2.5 text-ink">Move Acme to proposal and remind me Friday</p>
        <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-ink px-4 py-3 text-white">
          <p className="flex items-center gap-1.5 text-xs text-zest">
            <Bot className="size-3.5" /> Copilot
          </p>
          <p className="mt-1">Done. Acme Corp is now in <b>Proposal</b>, follow-up set for Fri 10:00 AM ✓</p>
        </div>
      </div>
    ),
  },
];

export function StepsCarousel() {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const go = (d: number) => setI((n) => (n + d + STEPS.length) % STEPS.length);
  return (
    <div className={`relative overflow-hidden rounded-[28px] p-6 transition-colors duration-700 sm:p-10 ${step.bg}`}>
      <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-2xl" />
      <div className="flex items-start justify-between">
        <div className="space-y-1.5" aria-hidden>
          <span className="block size-11 rounded-t-2xl rounded-b-md bg-white" />
          <span className="block size-11 rounded-b-2xl rounded-t-md bg-ink" />
        </div>
        <div className="flex gap-1.5" role="tablist" aria-label="Steps">
          {STEPS.map((s, n) => (
            <button
              key={s.tag}
              role="tab"
              aria-selected={n === i}
              aria-label={s.title}
              onClick={() => setI(n)}
              className={`h-1.5 cursor-pointer rounded-full bg-white transition-all ${n === i ? 'w-6' : 'w-1.5 opacity-50'}`}
            />
          ))}
        </div>
      </div>

      <div key={i} className="relative mt-6 grid animate-fade-up items-center gap-8 lg:grid-cols-2">
        <div className="text-white">
          <span className="bubble bg-ink">{step.tag}</span>
          <h3 className="display mt-6 text-4xl sm:text-6xl">{step.title}</h3>
          <p className="mt-4 max-w-md text-white/85">{step.text}</p>
        </div>
        <div className="mx-auto w-full max-w-md">{step.demo}</div>
      </div>

      <div className="relative mt-10 flex items-center justify-between">
        <Link href="/signup" className="pill-light ring-0">
          Try it free <ArrowRight className="size-4" />
        </Link>
        <div className="flex gap-2">
          <button onClick={() => go(-1)} className="round-btn cursor-pointer" aria-label="Previous step">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => go(1)} className="round-btn cursor-pointer" aria-label="Next step">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Folder tabs: what each role sees ---------- */

const ROLE_VIEWS = {
  Rep: [
    { bg: 'bg-sun', k: 'Calls today', v: '6' },
    { bg: 'bg-white', k: 'Drafts ready', v: '4' },
    { bg: 'bg-tang text-white', k: 'Hot leads', v: '3' },
    { bg: 'bg-cobalt text-white', k: 'My pipeline', v: '₹8.4L' },
    { bg: 'bg-zest', k: 'Won this month', v: '₹2.1L' },
    { bg: 'bg-ink text-white', k: 'Overdue', v: '1' },
  ],
  Manager: [
    { bg: 'bg-cobalt text-white', k: 'Team pipeline', v: '₹31.2L' },
    { bg: 'bg-zest', k: 'Win rate', v: '34%' },
    { bg: 'bg-white', k: 'Reps online', v: '6' },
    { bg: 'bg-berry text-white', k: 'Slipping deals', v: '5' },
    { bg: 'bg-sun', k: 'New this week', v: '24' },
    { bg: 'bg-moss text-white', k: 'Won this month', v: '₹6.4L' },
  ],
};
type Role = keyof typeof ROLE_VIEWS;

export function RoleTabs() {
  const [role, setRole] = useState<Role>('Rep');
  const other: Role = role === 'Rep' ? 'Manager' : 'Rep';
  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_30px_60px_-30px_rgb(0_0_0/0.25)]">
      <div className="flex items-center justify-between px-6 pt-5">
        <button onClick={() => setRole(other)} className="cursor-pointer font-display text-2xl font-semibold tracking-tight text-ink/35 transition hover:text-ink">
          {other}
        </button>
        <Link href="/signup" className="pill-light py-2 text-xs">
          <Plus className="size-3.5" /> Create workspace
        </Link>
      </div>
      <div className="relative mt-3">
        <div className="relative z-10 inline-block rounded-tr-[28px] bg-ink px-6 pb-3 pt-4 pr-14 font-display text-2xl font-semibold tracking-tight text-white">{role}</div>
        <div className="-mt-px grid grid-cols-2 gap-3 bg-ink p-3 sm:grid-cols-3">
          {ROLE_VIEWS[role].map((t, n) => (
            <div key={role + t.k} className={`flex aspect-[4/3] animate-fade-up flex-col justify-between rounded-2xl p-4 ${t.bg}`} style={{ animationDelay: `${n * 60}ms` }}>
              <p className="text-xs font-medium opacity-75">{t.k}</p>
              <p className="font-display text-3xl font-semibold tracking-tight">{t.v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Horizontal feature slider with progress bar ---------- */

const FEATURES = [
  { icon: ImagePlus, bg: 'bg-tang', title: 'AI capture', text: 'Notes, chats or a card photo in, clean leads out.' },
  { icon: Wand2, bg: 'bg-sun', title: 'Tell it what happened', text: 'Stage, value and follow-up update themselves.' },
  { icon: Gauge, bg: 'bg-cobalt', title: 'Lead scoring', text: 'A 0–100 score and the best next step.' },
  { icon: Bot, bg: 'bg-ink', title: 'Copilot that acts', text: 'Ask a question or give an order, it does the work.' },
  { icon: Mail, bg: 'bg-berry', title: 'Follow-ups written', text: 'Email and WhatsApp drafts from the full history.' },
  { icon: ShieldCheck, bg: 'bg-moss', title: 'Role-based access', text: 'Agents only see their own leads, even through AI.' },
];

export function FeatureSlider() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setProgress(el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth));
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  const nudge = (d: number) => ref.current?.scrollBy({ left: d * 300, behavior: 'smooth' });

  return (
    <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex flex-col">
        <p className="eyebrow text-ink-soft">
          Get more <span className="text-berry">closed</span>
        </p>
        <h2 className="display mt-3 text-5xl sm:text-6xl">AI in every step.</h2>
        <p className="mt-4 max-w-xs text-sm text-ink-soft">Choose Claude or Gemini per workspace. Every AI action respects your team’s roles and permissions.</p>
        <div className="mt-6 flex gap-2 lg:mt-auto">
          <button onClick={() => nudge(-1)} className="round-btn cursor-pointer" aria-label="Scroll features left">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => nudge(1)} className="round-btn cursor-pointer" aria-label="Scroll features right">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="min-w-0">
        <div ref={ref} className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
          {FEATURES.map(({ icon: Icon, bg, title, text }) => (
            <article key={title} className="group w-60 shrink-0 snap-start sm:w-64">
              <div className={`poster relative grid aspect-square place-items-center ${bg}`}>
                <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(white_1.5px,transparent_1.5px)] [background-size:18px_18px]" />
                <span className="relative grid size-24 place-items-center rounded-full bg-white text-ink transition duration-500 group-hover:scale-110 group-hover:rotate-6">
                  <Icon className="size-10" strokeWidth={1.5} />
                </span>
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold tracking-tight">{title}</h3>
              <p className="text-sm text-ink-soft">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 h-0.5 rounded-full bg-black/10">
          <div className="h-full w-1/4 rounded-full bg-ink transition-[margin] duration-150" style={{ marginLeft: `${progress * 75}%` }} />
        </div>
      </div>
    </div>
  );
}
