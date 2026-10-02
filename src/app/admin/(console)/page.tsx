import { Building2, IndianRupee, PauseCircle, Sparkles, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { When } from '@/components/ui';
import { compactInr } from '@/lib/client';
import { formatINR } from '@/lib/plans';
import { recentLogs } from '@/platform/services/audit';
import { platformStats } from '@/platform/services/overview';
import { listOrgs } from '@/platform/services/workspaces';

export const metadata = { title: 'Overview' };

export default async function AdminOverview() {
  const [stats, orgs, logs] = await Promise.all([platformStats(), listOrgs(), recentLogs(8)]);
  const totalPlans = Math.max(1, stats.plans.reduce((a, p) => a + p.count, 0));
  const cards = [
    { label: 'Workspaces', value: stats.orgs, hint: `+${stats.newOrgs} in 30 days`, icon: Building2 },
    { label: 'Active users', value: stats.users, hint: `${stats.leads.toLocaleString('en-IN')} leads total`, icon: Users },
    { label: 'Revenue', value: compactInr(stats.revenue / 100), hint: `${formatINR(stats.revenue30)} in 30 days`, icon: IndianRupee },
    { label: 'AI actions', value: stats.aiThisMonth.toLocaleString('en-IN'), hint: 'This month, all workspaces', icon: Sparkles },
  ];
  const TONES = ['bg-brand-3', 'bg-brand', 'bg-brand-2', 'bg-success', 'bg-amber-400', 'bg-sky-400', 'bg-violet-400'];
  const toneOf = (i: number) => TONES[i % TONES.length];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map(({ label, value, hint, icon: Icon }, i) => (
          <div key={label} className={i === 0 ? 'panel-brand p-5' : 'card p-5'}>
            <div className={`flex items-center justify-between text-xs font-semibold ${i === 0 ? 'text-white/75' : 'text-muted'}`}>
              {label}
              <span className={`grid size-9 place-items-center rounded-xl ${i === 0 ? 'bg-white/15' : 'bg-brand/10 text-brand'}`}>
                <Icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
            <p className={`mt-1 text-xs ${i === 0 ? 'text-white/70' : 'text-muted'}`}>{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Newest workspaces</h2>
            <Link href="/admin/workspaces" className="text-xs font-semibold text-muted hover:text-brand">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {orgs.slice(0, 7).map((o) => (
              <li key={o.id}>
                <Link href={`/admin/workspaces/${o.id}`} className="flex items-center gap-3 py-3 hover:text-brand">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-sm font-bold text-brand">{o.name.slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{o.name}</span>
                    <span className="block truncate text-xs text-muted">{o.owner}</span>
                  </span>
                  {o.suspended && <span className="chip bg-rose-50 text-rose-600 ring-rose-200">Suspended</span>}
                  <span className="chip bg-brand/10 text-brand ring-brand/20">{o.planName}</span>
                  {o.planSource === 'trial' && <span className="chip bg-brand-2/10 text-brand-2 ring-brand-2/20">Trial</span>}
                  <When value={o.createdAt} ago />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 text-base font-bold">Active plans</h2>
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
              {stats.plans.map((p, i) => p.count > 0 && <span key={p.plan} className={toneOf(i)} style={{ width: `${(p.count / totalPlans) * 100}%` }} />)}
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {stats.plans.map((p, i) => (
                <li key={p.plan} className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${toneOf(i)}`} />
                  <span className="text-muted">{p.name}</span>
                  <span className="ml-auto font-bold tabular-nums">{p.count}</span>
                </li>
              ))}
              <li className="flex items-center gap-2 border-t border-line pt-2">
                <span className="size-2.5 rounded-full bg-brand-2" />
                <span className="text-muted">On free trial</span>
                <span className="ml-auto font-bold tabular-nums">{stats.trials}</span>
              </li>
              <li className="flex items-center gap-2">
                <PauseCircle className="size-3.5 text-rose-500" />
                <span className="text-muted">Suspended</span>
                <span className="ml-auto font-bold tabular-nums">{stats.suspended}</span>
              </li>
            </ul>
          </section>

          <section className="card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Recent admin actions</h2>
              <Link href="/admin/audit" className="text-xs font-semibold text-muted hover:text-brand">
                Audit log
              </Link>
            </div>
            {logs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">No admin actions yet.</p>
            ) : (
              <ul className="space-y-3">
                {logs.map((l) => (
                  <li key={l.id} className="flex gap-3 text-sm">
                    <Zap className="mt-0.5 size-4 shrink-0 text-brand" />
                    <span className="min-w-0">
                      <span className="block truncate">{l.summary}</span>
                      <span className="text-xs text-muted">
                        {l.actor} · <When value={l.at} ago />
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
