'use client';

import { ChevronRight, Columns3, List, Plus, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import AiCapture from '@/components/ai/AiCapture';
import { priorityOptions, statusOptions } from '@/components/ui/options';
import Select from '@/components/ui/Select';
import { Modal, PageHeader, PriorityDot, ScoreRing, StatusChip, When } from '@/components/ui';
import { api, compactInr, errorText } from '@/lib/client';
import { LEAD_STATUSES, STATUS_META, leadTitle, type LeadDTO, type LeadStatus } from '@/lib/lead-meta';
import LeadForm, { type Assignee } from './LeadForm';

interface Props {
  leads: LeadDTO[];
  view: 'board' | 'list';
  filters: { q?: string; status?: string; priority?: string };
  add: '' | 'new' | 'ai'; // ?add= from the mobile "+" button
  assignees: Assignee[];
  perms: { create: boolean; update: boolean; assign: boolean; ai: boolean; readAll: boolean };
}

export default function LeadsView({ leads: initial, view, filters, add, assignees, perms }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [leads, setLeads] = useState(initial);
  const [q, setQ] = useState(filters.q ?? '');
  const [modal, setModal] = useState<'' | 'new' | 'ai'>('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    setLeads(initial);
  }, [initial]);

  // Open the requested sheet, then drop ?add= so tapping "+" again re-opens it.
  useEffect(() => {
    if (!add || !perms.create || (add === 'ai' && !perms.ai)) return;
    setModal(add);
    setParam({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [add]);

  // Filters live in the URL so the server does the (RBAC-scoped) querying.
  function setParam(updates: Record<string, string | undefined>) {
    const sp = new URLSearchParams({ view, ...(filters.q ? { q: filters.q } : {}), ...(filters.status ? { status: filters.status } : {}), ...(filters.priority ? { priority: filters.priority } : {}) });
    for (const [k, v] of Object.entries(updates)) v ? sp.set(k, v) : sp.delete(k);
    router.replace(`${pathname}?${sp}`);
  }

  useEffect(() => {
    if (q === (filters.q ?? '')) return;
    const t = setTimeout(() => setParam({ q: q || undefined }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function move(id: string, status: LeadStatus) {
    const prev = leads;
    setLeads((cur) => cur.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      await api(`/api/leads/${id}`, { method: 'PATCH', body: { status } });
    } catch (err) {
      setLeads(prev);
      flash(errorText(err));
    }
  }

  const pipelineValue = leads.filter((l) => l.status !== 'won' && l.status !== 'lost').reduce((a, l) => a + l.value, 0);

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={`${leads.length} lead${leads.length === 1 ? '' : 's'} · ${compactInr(pipelineValue)} open pipeline${perms.readAll ? '' : ' · showing your leads'}`}
        actions={
          <>
            {perms.create && perms.ai && (
              <button className="btn-pink max-lg:hidden" onClick={() => setModal('ai')}>
                <Sparkles className="size-4" /> AI capture
              </button>
            )}
            {perms.create && (
              <button className="btn-primary max-lg:hidden" onClick={() => setModal('new')}>
                <Plus className="size-4" /> New lead
              </button>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto sm:min-w-56 sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" type="search" enterKeyHint="search" placeholder="Search name, company, need, tag…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {view === 'list' && (
          <Select
            className="min-w-0 flex-1 sm:w-44 sm:flex-none"
            aria-label="Filter by stage"
            value={filters.status ?? ''}
            onChange={(v) => setParam({ status: v || undefined })}
            options={[{ value: '', label: 'All stages' }, ...statusOptions()]}
          />
        )}
        <Select
          className="min-w-0 flex-1 sm:w-40 sm:flex-none"
          aria-label="Filter by priority"
          value={filters.priority ?? ''}
          onChange={(v) => setParam({ priority: v || undefined })}
          options={[{ value: '', label: 'Any priority' }, ...priorityOptions()]}
        />
        <div className="segmented ml-auto">
          {(['board', 'list'] as const).map((v) => {
            const Icon = v === 'board' ? Columns3 : List;
            return (
              <button key={v} onClick={() => setParam({ view: v, status: undefined })} aria-pressed={view === v} aria-label={`${v} view`} className="capitalize">
                <Icon className="size-4 sm:size-3.5" /> <span className="hidden sm:inline">{v}</span>
              </button>
            );
          })}
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="card grid place-items-center gap-3 px-6 py-16 text-center">
          <Sparkles className="size-8 text-brand-2" />
          <p className="font-medium">No leads yet</p>
          <p className="max-w-sm text-sm text-muted">Paste your notes or a business card photo into AI capture and let the AI build your pipeline.</p>
        </div>
      ) : view === 'board' ? (
        <Board leads={leads} canDrag={perms.update} onMove={move} />
      ) : (
        <>
          <CardList leads={leads} />
          <Table leads={leads} />
        </>
      )}

      <Modal open={modal === 'new'} onClose={() => setModal('')} title="New lead" wide>
        <LeadForm
          assignees={assignees}
          canAssign={perms.assign}
          submitLabel="Create lead"
          onCancel={() => setModal('')}
          onSubmit={async (body) => {
            await api('/api/leads', { body });
            setModal('');
            router.refresh();
          }}
        />
      </Modal>
      <Modal
        open={modal === 'ai'}
        onClose={() => setModal('')}
        wide
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="size-4" /> AI capture
          </span>
        }
      >
        <AiCapture
          onDone={(n) => {
            setModal('');
            flash(`Added ${n} lead${n === 1 ? '' : 's'} ✨`);
            router.refresh();
          }}
        />
      </Modal>

      {toast && <div className="bottom-tabbar fixed left-1/2 z-50 lg:bottom-5 -translate-x-1/2 animate-fade-up rounded-xl border border-line bg-surface-2 px-4 py-2 text-sm shadow-xl">{toast}</div>}
    </div>
  );
}

function Board({ leads, canDrag, onMove }: { leads: LeadDTO[]; canDrag: boolean; onMove: (id: string, s: LeadStatus) => void }) {
  const [over, setOver] = useState<LeadStatus | null>(null);
  const cols = useRef<Partial<Record<LeadStatus, HTMLElement | null>>>({});
  return (
    <>
    {/* Phones: stage chips jump to a column (columns snap one at a time) */}
    <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 sm:hidden">
      {LEAD_STATUSES.map((status) => (
        <button
          key={status}
          onClick={() => cols.current[status]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })}
          className="press flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold shadow-soft ring-1 ring-line"
        >
          <span className={`size-2 rounded-full ${STATUS_META[status].dot}`} />
          {STATUS_META[status].label}
          <span className="text-muted">{leads.filter((l) => l.status === status).length}</span>
        </button>
      ))}
    </div>
    <div className="scroll-thin -mx-4 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto scroll-px-4 px-4 pb-4 sm:-mx-6 sm:snap-none sm:gap-4 sm:px-6 lg:mx-0 lg:px-0">
      {LEAD_STATUSES.map((status) => {
        const col = leads.filter((l) => l.status === status);
        const total = col.reduce((a, l) => a + l.value, 0);
        return (
          <section
            key={status}
            ref={(el) => {
              cols.current[status] = el;
            }}
            onDragOver={(e) => {
              if (!canDrag) return;
              e.preventDefault();
              setOver(status);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              setOver(null);
              const id = e.dataTransfer.getData('text/lead');
              if (id && leads.find((l) => l.id === id)?.status !== status) onMove(id, status);
            }}
            className={`flex w-[84vw] max-w-72 shrink-0 snap-center flex-col rounded-3xl p-2.5 transition sm:w-64 ${over === status ? 'bg-brand/10 ring-2 ring-brand/30' : 'bg-surface-2'}`}
          >
            <header className="flex items-center justify-between px-2 py-1.5">
              <span className="flex items-center gap-2 text-sm font-bold">
                <span className={`size-2 rounded-full ${STATUS_META[status].dot}`} />
                {STATUS_META[status].label}
                <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">{col.length}</span>
              </span>
              <span className="text-xs font-semibold tabular-nums text-muted">{compactInr(total)}</span>
            </header>
            <div className="flex min-h-24 flex-col gap-2.5">
              {col.map((l) => (
                <Link
                  key={l.id}
                  href={`/app/leads/${l.id}`}
                  draggable={canDrag}
                  onDragStart={(e) => e.dataTransfer.setData('text/lead', l.id)}
                  className="press group animate-fade-up rounded-2xl bg-surface p-3.5 shadow-soft ring-1 ring-transparent transition hover:-translate-y-0.5 hover:ring-brand/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{leadTitle(l)}</p>
                      {l.company && l.name && <p className="truncate text-xs text-muted">{l.name}</p>}
                    </div>
                    {l.ai && <ScoreRing score={l.ai.score} size={34} />}
                  </div>
                  {l.need && <p className="mt-2 line-clamp-2 text-xs text-fg/70">{l.need}</p>}
                  <div className="mt-2.5 flex items-center gap-2">
                    <PriorityDot priority={l.priority} />
                    {l.value > 0 && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-success">{compactInr(l.value)}</span>}
                    <span className="ml-auto">{l.nextFollowUp && <When value={l.nextFollowUp} overdueTone />}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
    </>
  );
}

// Phones: one tappable card per lead instead of a wide table.
function CardList({ leads }: { leads: LeadDTO[] }) {
  return (
    <ul className="space-y-2.5 md:hidden">
      {leads.map((l) => (
        <li key={l.id}>
          <Link href={`/app/leads/${l.id}`} className="press flex items-center gap-3 rounded-3xl bg-surface p-3.5 shadow-soft">
            {l.ai ? (
              <ScoreRing score={l.ai.score} size={42} />
            ) : (
              <span className="grid size-[42px] shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold text-muted">{leadTitle(l).slice(0, 1).toUpperCase()}</span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <PriorityDot priority={l.priority} />
                <p className="truncate text-sm font-bold">{leadTitle(l)}</p>
              </div>
              <p className="truncate text-xs text-muted">{[l.company && l.name, l.assignedTo?.name].filter(Boolean).join(' · ') || 'Unassigned'}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusChip status={l.status} />
                {l.value > 0 && <span className="text-xs font-semibold tabular-nums text-success">{compactInr(l.value)}</span>}
                {l.nextFollowUp && <When value={l.nextFollowUp} overdueTone />}
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Table({ leads }: { leads: LeadDTO[] }) {
  return (
    <div className="card scroll-thin hidden overflow-x-auto md:block">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="text-left text-xs text-muted">
          <tr className="border-b border-line">
            {['Lead', 'Stage', 'Value', 'AI score', 'Owner', 'Follow-up', 'Updated'].map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {leads.map((l) => (
            <tr key={l.id} className="transition hover:bg-brand/[0.03]">
              <td className="px-4 py-3">
                <Link href={`/app/leads/${l.id}`} className="flex items-center gap-2 font-medium hover:text-brand-2">
                  <PriorityDot priority={l.priority} />
                  {leadTitle(l)}
                </Link>
                <p className="ml-4 text-xs text-muted">{[l.company && l.name, l.email || l.phone].filter(Boolean).join(' · ')}</p>
              </td>
              <td className="px-4 py-3">
                <StatusChip status={l.status} />
              </td>
              <td className="px-4 py-3 tabular-nums">{l.value ? compactInr(l.value) : '—'}</td>
              <td className="px-4 py-3">{l.ai ? <ScoreRing score={l.ai.score} size={32} /> : <span className="text-muted">—</span>}</td>
              <td className="px-4 py-3 text-muted">{l.assignedTo?.name ?? '—'}</td>
              <td className="px-4 py-3">{l.nextFollowUp ? <When value={l.nextFollowUp} overdueTone /> : <span className="text-muted">—</span>}</td>
              <td className="px-4 py-3">
                <When value={l.updatedAt} ago />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
