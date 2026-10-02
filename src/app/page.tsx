import { ArrowRight, ArrowUpRight, Bot, Check, Compass, Feather, Hexagon, Layers, Mail, MessageCircle, Mic, PenTool, Phone, Rocket, Send, ShieldCheck, Sparkles, Star, Target, Trophy, UserRound, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import Bubble from '@/components/marketing/Bubble';
import { FeatureSlider, RoleTabs, StepsCarousel } from '@/components/marketing/LandingInteractive';
import LegalLinks from '@/components/legal/LegalLinks';
import Reveal from '@/components/marketing/Reveal';
import { Logo, ScoreRing } from '@/components/ui';
import { formatINR, isFree, type Plan } from '@/lib/plans';
import { getSettings, publicPlans } from '@/lib/services/plans';

const PIPELINE = [
  { stage: 'New', bg: 'bg-white', company: 'Zen Foods', value: '₹1.2L', score: 41 },
  { stage: 'Contacted', bg: 'bg-sun', company: 'Bloom Clinics', value: '₹2.4L', score: 56 },
  { stage: 'Qualified', bg: 'bg-cobalt text-white', company: 'Mehta Logistics', value: '₹3.0L', score: 78 },
  { stage: 'Proposal', bg: 'bg-tang text-white', company: 'Acme Corp', value: '₹4.8L', score: 84 },
  { stage: 'Won', bg: 'bg-moss text-white', company: 'Northwind', value: '₹6.4L', score: 96 },
];

const TEAM = [
  ['Priya Sharma', 'Owner', 'bg-tang text-white'],
  ['Arjun Rao', 'Admin', 'bg-sun'],
  ['Neha Kapoor', 'Manager', 'bg-cobalt text-white'],
  ['Rahul Mehta', 'Agent', 'bg-zest'],
  ['Sana Iqbal', 'Agent', 'bg-berry text-white'],
  ['Vikram Joshi', 'Viewer', 'bg-ink text-white'],
  ['Ananya Iyer', 'Manager', 'bg-moss text-white'],
  ['Kabir Singh', 'Agent', 'bg-white'],
  ['Meera Nair', 'Admin', 'bg-rouge text-white'],
  ['Dev Patel', 'Agent', 'bg-sun'],
] as const;

const BADGES = [PenTool, Feather, Layers, Target, Compass, Send, Hexagon];
const MARQUEE = ['Capture by voice', 'Scored by AI', 'Follow-ups written', 'Copilot that acts', 'Built for teams'];
const MARQUEE_ICONS = [Mic, Sparkles, Mail, Bot, Users];

const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .join('');

function TeamRow({ reverse = false }: { reverse?: boolean }) {
  const people = reverse ? [...TEAM].reverse() : TEAM;
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <div className={`flex w-max gap-4 py-3 ${reverse ? 'animate-marquee-rev' : 'animate-marquee'}`}>
        {[...people, ...people].map(([name, role, bg], i) => (
          <div key={i} className={`flex shrink-0 flex-col justify-between rounded-[20px] p-3 shadow-[0_14px_30px_-18px_rgb(0_0_0/0.4)] ${bg} size-24 sm:size-28`} style={{ marginTop: `${(i * 37) % 28}px` }}>
            <span className="font-display text-2xl font-semibold tracking-tight">{initials(name)}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">{role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pricing comes from the plans managed in the platform console; refreshed every minute.
export const revalidate = 60;

async function pricing(): Promise<{ plans: Plan[]; trialDays: number | null }> {
  try {
    const [plans, settings] = await Promise.all([publicPlans(), getSettings()]);
    const trial = settings.trial.enabled ? plans.find((p) => p.id === settings.trial.planKey) : null;
    return { plans, trialDays: trial ? settings.trial.days : null };
  } catch {
    return { plans: [], trialDays: null }; // e.g. no database during build — next revalidation fills it in
  }
}

export default async function Home() {
  const { plans, trialDays } = await pricing();
  return (
    <div className="mk min-h-screen overflow-x-clip bg-[#ebebe8]">
      {/* Framed nav + hero (the white "browser frame" from the reference) */}
      <div className="p-2 sm:p-4">
        <div className="relative overflow-hidden rounded-[28px] bg-white sm:rounded-[36px]">
          <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-5 sm:px-10 sm:py-7">
            <Link href="/" aria-label="Smart CRM home">
              <Logo className="text-lg text-ink" />
            </Link>
            <nav className="hidden items-center rounded-full bg-chalk p-1 text-sm font-medium md:flex" aria-label="Main">
              {[
                ['#how', 'How it works'],
                ['#features', 'Features'],
                ['#pricing', 'Pricing'],
              ].map(([href, label]) => (
                <a key={href} href={href} className="rounded-full px-4 py-2 text-ink-soft transition hover:bg-white hover:text-ink">
                  {label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login" className="grid size-10 place-items-center rounded-full ring-1 ring-black/10 transition hover:bg-chalk" aria-label="Sign in" title="Sign in">
                <UserRound className="size-4" />
              </Link>
              <Link href="/signup" className="pill-dark py-2.5">
                Start free
              </Link>
            </div>
          </header>

          <section className="px-5 pt-8 text-center sm:px-10 sm:pt-12">
            <Link href="/signup" className="inline-flex animate-fade-up items-center gap-2 rounded-full bg-chalk py-1 pl-1 pr-3 text-xs font-medium transition hover:bg-black/5">
              <span className="rounded-full bg-rouge px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">New</span>
              Copilot now takes actions for you
              <ArrowRight className="size-3.5" />
            </Link>
            <h1 className="display mx-auto mt-6 max-w-4xl animate-fade-up text-[2.75rem] sm:text-7xl xl:text-[5.5rem]">
              Capture, score <span className="text-rouge">&amp; close every deal.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg animate-fade-up text-base text-ink-soft sm:text-lg">
              Talk, paste or snap. Smart CRM turns it into a lead, scores it, writes the follow-up and keeps your pipeline current.
            </p>
            <div className="mt-8 flex animate-fade-up flex-wrap justify-center gap-2">
              <Link href="/signup" className="pill-dark px-6 py-3">
                Start free <ArrowRight className="size-4" />
              </Link>
              <a href="#how" className="pill-light bg-chalk px-6 py-3 ring-0 hover:bg-black/5">
                How it works
              </a>
            </div>
            <p className="mt-4 text-xs text-ink-soft">{trialDays ? `${trialDays}-day free trial` : 'Free trial'} · no card needed</p>

            {/* Product screenshot, cut off by the bottom of the frame */}
            <div className="relative mx-auto mt-14 max-w-6xl sm:mt-16">
              <Bubble className="absolute left-[30%] top-[13%] z-10 hidden -rotate-3 animate-float bg-ink md:inline-flex">Live pipeline</Bubble>
              <Bubble className="absolute left-[60%] top-[12%] z-10 hidden animate-float bg-ink [animation-delay:1s] md:inline-flex">@copilot</Bubble>
              <Bubble className="absolute left-[64%] top-[33%] z-10 hidden rotate-3 animate-float bg-rouge [animation-delay:2s] md:inline-flex">Auto-updated</Bubble>
              <div className="-mb-px h-[clamp(230px,52vw,600px)] animate-rise overflow-hidden rounded-t-[20px] bg-chalk p-1.5 pb-0 sm:rounded-t-[28px] sm:p-3 sm:pb-0">
                <Image
                  src="/marketing/dash.png"
                  alt="Smart CRM dashboard with pipeline overview, AI Copilot, won deals and team activity"
                  width={2338}
                  height={1460}
                  sizes="(min-width: 1200px) 1152px, 100vw"
                  loading="eager"
                  fetchPriority="high"
                  className="w-full rounded-t-[14px] sm:rounded-t-[20px]"
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow text-ink-soft">How it works</p>
            <h2 className="display mt-4 text-5xl sm:text-7xl">
              Gateway to a<br />
              self-driving pipeline.
            </h2>
          </div>
          <Bubble className="mb-4 -rotate-6 bg-ink">@you, relax</Bubble>
        </Reveal>
        <Reveal>
          <StepsCarousel />
        </Reveal>
      </section>
      {/* Feature slider */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20">
        <Reveal>
          <FeatureSlider />
        </Reveal>
      </section>

      {/* Lime marquee */}
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="relative overflow-hidden rounded-[28px] bg-zest py-14">
          <div className="pointer-events-none absolute -left-24 top-1/2 size-96 -translate-y-1/2 rounded-full border-[40px] border-white/30" />
          <div className="flex w-max animate-marquee items-center gap-8">
            {[...MARQUEE, ...MARQUEE].map((t, i) => {
              const Icon = MARQUEE_ICONS[i % MARQUEE_ICONS.length];
              return (
                <div key={i} className="flex items-center gap-8">
                  <span className="display whitespace-nowrap text-6xl sm:text-8xl">{t}</span>
                  <span className="badge-circle size-20 shrink-0 -rotate-6 sm:size-24">
                    <Icon className="size-9" strokeWidth={1.5} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <Reveal className="text-center">
          <p className="eyebrow text-ink-soft">Pricing</p>
          <h2 className="display mt-4 text-5xl sm:text-7xl">Start free. Grow into it.</h2>
          <p className="mx-auto mt-4 max-w-md text-ink-soft">Upgrade with UPI, cards or netbanking via Razorpay.</p>
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {plans.map((p, i) => {
            const featured = p.popular;
            return (
              <Reveal key={p.id} delay={i * 120} className="h-full">
                <div className="flex h-full flex-col">
                  <span className={`w-fit rounded-t-2xl px-5 pb-2 pt-3 text-xs font-semibold ${featured ? 'bg-tang text-white' : 'bg-white text-ink-soft'}`}>
                    {featured ? 'Most popular' : isFree(p) ? 'Forever free' : 'Monthly'}
                  </span>
                  <div className={`flex flex-1 flex-col rounded-[24px] rounded-tl-none p-7 ${featured ? 'bg-tang text-white' : 'bg-white'}`}>
                    <h3 className="font-display text-2xl font-semibold tracking-tight">{p.name}</h3>
                    <p className={`mt-1 text-sm ${featured ? 'text-white/80' : 'text-ink-soft'}`}>{p.tagline}</p>
                    <p className="display mt-6 text-5xl">
                      {isFree(p) ? 'Free' : formatINR(p.priceMonthly)}
                      {!isFree(p) && <span className={`ml-1 font-sans text-sm font-normal tracking-normal ${featured ? 'text-white/80' : 'text-ink-soft'}`}>/mo</span>}
                    </p>
                    <ul className="my-7 flex-1 space-y-2.5 text-sm">
                      {p.features.map((f) => (
                        <li key={f} className="flex gap-2.5">
                          <span className={`grid size-5 shrink-0 place-items-center rounded-full ${featured ? 'bg-white text-tang' : 'bg-ink text-white'}`}>
                            <Check className="size-3" strokeWidth={3} />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link href="/signup" className={featured ? 'pill-light ring-0' : 'pill-dark'}>
                      {isFree(p) ? 'Get started' : trialDays ? `Start ${trialDays}-day free trial` : 'Start free, upgrade anytime'}
                    </Link>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Closing cards */}
      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-20 md:grid-cols-2">
        <Reveal className="h-full">
          <div className="relative flex h-full min-h-[460px] flex-col justify-end overflow-hidden rounded-[28px] bg-berry p-8 text-white sm:p-10">
            <div className="pointer-events-none absolute -right-10 -top-10 grid size-72 rotate-12 place-items-center rounded-[48px] bg-white/10">
              <Rocket className="size-32 text-white/80" strokeWidth={1} />
            </div>
            <span className="grid size-9 place-items-center rounded-full ring-1 ring-white/50">
              <Phone className="size-4" />
            </span>
            <h2 className="display mt-5 text-5xl sm:text-6xl">
              Close more,
              <br />
              type less.
            </h2>
            <p className="mt-3 max-w-sm text-white/85">Create a workspace in under a minute. Invite your team when you’re ready.</p>
            <Link href="/signup" className="pill-light mt-6 w-fit ring-0">
              Start free <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </Reveal>
        <Reveal delay={150} className="h-full">
          <div className="relative flex h-full min-h-[460px] flex-col justify-end overflow-hidden rounded-[28px] bg-white p-8 sm:p-10">
            <div className="pointer-events-none absolute right-8 top-8 flex flex-col items-end gap-3" aria-hidden>
              <Bubble className="rotate-3 bg-cobalt">@team</Bubble>
              <div className="flex -space-x-3">
                {TEAM.slice(0, 5).map(([name, , bg]) => (
                  <span key={name} className={`grid size-12 place-items-center rounded-full font-display text-sm font-semibold ring-4 ring-white ${bg}`}>
                    {initials(name)}
                  </span>
                ))}
              </div>
              <span className="flex items-center gap-1 text-sm font-medium">
                <Star className="size-4 fill-sun text-sun" /> Loved by sales teams
              </span>
            </div>
            <span className="grid size-9 place-items-center rounded-full ring-1 ring-black/20">
              <MessageCircle className="size-4" />
            </span>
            <h2 className="display mt-5 text-5xl sm:text-6xl">
              Already
              <br />
              on board?
            </h2>
            <p className="mt-3 max-w-sm text-ink-soft">Pick up right where your pipeline left off. Copilot has your day planned.</p>
            <Link href="/login" className="pill-dark mt-6 w-fit">
              Sign in <Trophy className="size-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-black/10 py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 text-sm text-ink-soft">
          <Logo className="text-ink" />
          <LegalLinks />
          <p>© {new Date().getFullYear()} Smart CRM</p>
        </div>
      </footer>
    </div>
  );
}
