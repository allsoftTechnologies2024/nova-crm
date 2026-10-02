'use client';

import { ArrowUpRight, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { When } from '@/components/ui';
import { STATUS_META, leadTitle, type LeadDTO, type LeadStatus } from '@/lib/lead-meta';

type Activity = { id: string; leadId: string; lead: string; text: string; by: string; at: string };
type Stage = { status: LeadStatus; label: string; count: number };

const AVATAR_TONES = ['from-stone-300 to-stone-500', 'from-amber-300 to-orange-400', 'from-emerald-300 to-teal-400', 'from-rose-300 to-pink-400', 'from-red-300 to-rose-500'];
const toneOf = (name: string) => AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];

function Avatar({ name }: { name: string }) {
  return <span className={`grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${toneOf(name)} text-sm font-bold text-white`}>{name.slice(0, 1).toUpperCase()}</span>;
}

// Right-hand column: team activity / due follow-ups tabs + pipeline mix.
export default function ActivityPanel({ activity, due, stages, canSeeTeam }: { activity: Activity[]; due: LeadDTO[]; stages: Stage[]; canSeeTeam: boolean }) {
  const [tab, setTab] = useState<'activity' | 'due'>('activity');
  const total = Math.max(1, stages.reduce((a, s) => a + s.count, 0));

  return (
    <aside className="flex flex-col gap-5 max-xl:rounded-3xl max-xl:bg-surface max-xl:p-5 max-xl:shadow-soft sm:gap-6 xl:border-l xl:border-line xl:pl-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Users className="size-5 text-muted" /> Team
        </h2>
        {canSeeTeam && (
          <Link href="/app/team" className="text-xs font-semibold text-muted hover:text-brand">
            View all
          </Link>
        )}
      </div>

      <div className="flex rounded-2xl bg-surface-2 p-1.5">
        {(['activity', 'due'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition sm:py-2 ${tab === t ? 'bg-brand text-white shadow-float' : 'text-muted hover:text-fg'}`}
          >
            {t === 'activity' ? 'Activities' : `Due (${due.length})`}
          </button>
        ))}
      </div>

      <ul className="space-y-4">
        {tab === 'activity' &&
          (activity.length ? (
            activity.map((a) => (
              <li key={a.id} className="flex items-center gap-3">
                <Avatar name={a.by} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{a.by}</p>
                  <p className="truncate text-xs text-muted">
                    {a.lead} · {a.text}
                  </p>
                  <When value={a.at} ago />
                </div>
                <Link href={`/app/leads/${a.leadId}`} className="grid size-9 shrink-0 place-items-center rounded-xl text-muted ring-1 ring-line hover:text-brand sm:size-8" aria-label={`Open ${a.lead}`}>
                  <ArrowUpRight className="size-4" />
                </Link>
              </li>
            ))
          ) : (
            <li className="py-6 text-center text-sm text-muted">No activity yet.</li>
          ))}
        {tab === 'due' &&
          (due.length ? (
            due.map((l) => (
              <li key={l.id} className="flex items-center gap-3">
                <Avatar name={leadTitle(l)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{leadTitle(l)}</p>
                  <p className="truncate text-xs text-muted">{l.assignedTo?.name ?? 'Unassigned'}</p>
                  <When value={l.nextFollowUp!} overdueTone />
                </div>
                <Link href={`/app/leads/${l.id}`} className="grid size-9 shrink-0 place-items-center rounded-xl text-muted ring-1 ring-line hover:text-brand sm:size-8" aria-label={`Open ${leadTitle(l)}`}>
                  <ArrowUpRight className="size-4" />
                </Link>
              </li>
            ))
          ) : (
            <li className="py-6 text-center text-sm text-muted">Nothing due. Nice work 🎉</li>
          ))}
      </ul>

      <div className="mt-auto border-t border-line pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">Pipeline mix</h3>
          <Link href="/app/leads" className="text-xs font-semibold text-muted hover:text-brand">
            View
          </Link>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
          {stages.map((s) => s.count > 0 && <span key={s.status} className={STATUS_META[s.status].dot} style={{ width: `${(s.count / total) * 100}%` }} title={`${s.label}: ${s.count}`} />)}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          {stages.map((s) => (
            <li key={s.status} className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${STATUS_META[s.status].dot}`} />
              <span className="text-muted">{s.label}</span>
              <span className="ml-auto font-bold tabular-nums">{s.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
