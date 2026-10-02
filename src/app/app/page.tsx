import { ArrowRight, Bot, ChevronRight, Sparkles, Trophy, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import ActivityPanel from '@/components/dashboard/ActivityPanel';
import OverviewCard from '@/components/dashboard/OverviewCard';
import { aiUsage } from '@/lib/ai';
import { requirePage } from '@/lib/auth/session';
import { compactInr } from '@/lib/client';
import { connectDB } from '@/lib/db';
import { dueFollowUps, monthlyTrend, pipelineStats, recentActivity } from '@/lib/services/leads';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';

export const metadata = { title: 'Dashboard' };

export default async function Dashboard({ searchParams }: PageProps<'/app'>) {
  const auth = await requirePage('lead:read');
  await connectDB();
  const [stats, due, months, activity, leadCount, seatCount, { denied }] = await Promise.all([
    pipelineStats(auth),
    dueFollowUps(auth),
    monthlyTrend(auth),
    recentActivity(auth),
    Lead.countDocuments({ orgId: auth.org.id }),
    User.countDocuments({ orgId: auth.org.id, active: true }),
    searchParams,
  ]);
  const ai = aiUsage(auth);
  const daysLeft = auth.org.planExpiresAt && auth.plan.id !== 'free' ? Math.max(0, Math.ceil((new Date(auth.org.planExpiresAt).getTime() - Date.now()) / 86_400_000)) : null;
  const planPill = daysLeft !== null ? `${daysLeft} days left` : `${auth.plan.name} plan`;

  const usage = [
    { icon: Users, title: 'Leads', sub: `${auth.plan.name} plan limit`, used: leadCount, limit: auth.plan.limits.leads, unit: 'leads' },
    { icon: Sparkles, title: 'AI actions', sub: 'This month', used: ai.used, limit: ai.limit, unit: 'actions' },
    { icon: Zap, title: 'Team seats', sub: 'Active members', used: seatCount, limit: auth.plan.limits.seats, unit: 'seats' },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-6">
        {denied && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">Your role doesn&apos;t have access to that page.</p>}

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <OverviewCard months={months} openValue={stats.openValue} wonValue={stats.wonValue} />

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-1 lg:grid-rows-[auto_1fr]">
            {auth.can('ai:use') ? (
              <Link href="/app/copilot?q=Plan%20my%20day%3A%20who%20should%20I%20call%20first%20and%20why%3F" className="panel-brand press group flex items-center gap-4 p-4 transition hover:brightness-105 sm:p-5">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 sm:size-16">
                  <Bot className="size-7 sm:size-8" />
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-bold">AI Copilot</span>
                  <span className="flex items-center gap-1 text-sm text-white/75">
                    Plan my day <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            ) : (
              <div className="panel-brand flex items-center gap-4 p-5">
                <span className="grid size-16 place-items-center rounded-2xl bg-white/15">
                  <Users className="size-8" />
                </span>
                <span className="text-lg font-bold">{stats.openCount} open leads</span>
              </div>
            )}

            <Link href="/app/leads?view=list&status=won" className="panel-pink press group relative flex flex-col justify-between overflow-hidden p-4 sm:p-5">
              <svg viewBox="0 0 200 80" className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 w-full opacity-25" preserveAspectRatio="none" aria-hidden>
                <path d="M0 70 L30 55 L60 62 L95 35 L130 45 L165 15 L200 25 L200 80 L0 80 Z" fill="#fff" />
              </svg>
              <div className="relative flex items-center gap-4">
                <span className="grid size-14 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30 sm:size-16">
                  <Trophy className="size-7 sm:size-8" />
                </span>
                <span className="text-lg font-bold">Won deals</span>
              </div>
              <div className="relative mt-4 flex items-end justify-between sm:mt-6">
                <div>
                  <p className="text-xs text-white/75">Win rate {stats.winRate}%</p>
                  <p className="text-3xl font-bold">{compactInr(stats.wonValue)}</p>
                  <p className="text-xs text-white/75">All time</p>
                </div>
                <span className="grid size-9 place-items-center rounded-full ring-2 ring-white/80 transition group-hover:bg-white/20">
                  <ChevronRight className="size-5" />
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Usage cards with floating icon badges; a swipeable row on phones */}
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 pt-8 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0">
          {usage.map(({ icon: Icon, title, sub, used, limit, unit }) => {
            const finite = Number.isFinite(limit);
            const pct = finite ? Math.min(100, Math.round((used / Math.max(1, limit)) * 100)) : 0;
            return (
              <div key={title} className="card relative w-[78%] shrink-0 snap-center px-5 pb-5 pt-12 text-center sm:w-auto">
                <span className="icon-tile absolute -top-8 left-1/2 size-16 -translate-x-1/2">
                  <Icon className="size-7" />
                </span>
                <p className="text-base font-bold">{title}</p>
                <p className="text-xs text-muted">{sub}</p>
                <div className="mt-5 flex justify-between text-xs font-semibold">
                  <span>Usage</span>
                  <span>{finite ? `${pct}%` : '∞'}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className={`h-full rounded-full ${pct > 85 ? 'bg-brand-2' : 'bg-success'}`} style={{ width: `${finite ? Math.max(pct, 2) : 4}%` }} />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {used.toLocaleString('en-IN')} / {finite ? `${limit.toLocaleString('en-IN')} ${unit}` : 'unlimited'}
                  </span>
                  <span className="pill">{planPill}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ActivityPanel activity={activity} due={due} stages={stats.stages} canSeeTeam={auth.can('team:view')} />
    </div>
  );
}
