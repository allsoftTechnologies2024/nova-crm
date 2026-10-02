'use client';

import { ArrowLeft, Copy, Mail, MessageCircle, Pencil, Phone, RefreshCw, Sparkles, Trash2, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import VoiceButton from '@/components/ai/VoiceButton';
import { statusOptions } from '@/components/ui/options';
import Select from '@/components/ui/Select';
import { ErrorText, Modal, PriorityDot, ScoreRing, StatusChip, When } from '@/components/ui';
import { api, errorText, inr, localNow } from '@/lib/client';
import { leadTitle, type LeadDTO } from '@/lib/lead-meta';
import LeadForm, { type Assignee } from './LeadForm';

const ACTIVITY_ICON: Record<string, string> = { created: '✳', note: '✎', call: '☎', email: '✉', status: '→', ai: '✦', assign: '⇄' };

interface Props {
  lead: LeadDTO;
  assignees: Assignee[];
  perms: { update: boolean; delete: boolean; assign: boolean; ai: boolean };
}

export default function LeadDetail({ lead: initial, assignees, perms }: Props) {
  const router = useRouter();
  const [lead, setLead] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'details' | 'ai' | 'timeline'>('details'); // phones only; desktop shows every panel
  const tabs: (typeof tab)[] = perms.ai ? ['details', 'ai', 'timeline'] : ['details', 'timeline'];
  const on = (t: typeof tab) => (tab === t ? '' : 'max-lg:hidden');

  async function patch(body: Record<string, unknown>) {
    setError('');
    try {
      const res = await api<{ lead: LeadDTO }>(`/api/leads/${lead.id}`, { method: 'PATCH', body });
      setLead(res.lead);
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function remove() {
    if (!confirm(`Delete ${leadTitle(lead)}? This can't be undone.`)) return;
    try {
      await api(`/api/leads/${lead.id}`, { method: 'DELETE' });
      router.replace('/app/leads');
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    }
  }

  const wa = lead.phone.replace(/\D/g, '');
  const waLink = wa ? `https://wa.me/${wa.length === 10 ? `91${wa}` : wa}` : '';

  return (
    <div className="max-w-7xl">
      <Link href="/app/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Leads
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 max-sm:rounded-3xl max-sm:bg-surface max-sm:p-5 max-sm:text-center max-sm:shadow-soft sm:mb-6">
        <div className="min-w-0 max-sm:w-full">
          <span className="mx-auto mb-3 grid size-16 place-items-center rounded-full bg-gradient-to-br from-brand-3 to-brand text-2xl font-bold text-white sm:hidden">
            {leadTitle(lead).slice(0, 1).toUpperCase()}
          </span>
          <h1 className="flex items-center gap-3 text-xl font-semibold tracking-tight max-sm:justify-center sm:text-2xl">
            <PriorityDot priority={lead.priority} />
            <span className="min-w-0 break-words">{leadTitle(lead)}</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {[lead.company && lead.name, lead.value ? inr(lead.value) : '', lead.assignedTo ? `Owner: ${lead.assignedTo.name}` : 'Unassigned'].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          {perms.update ? (
            <Select className="sm:w-44" aria-label="Stage" value={lead.status} onChange={(v) => patch({ status: v })} options={statusOptions()} />
          ) : (
            <span className="max-sm:mx-auto">
              <StatusChip status={lead.status} />
            </span>
          )}
          {/* Contact actions: labelled round buttons on phones (like a contact card), compact on desktop */}
          <div className="flex justify-center gap-5 sm:gap-2 max-sm:order-first">
            {lead.phone && <QuickAction href={`tel:${lead.phone}`} label="Call" icon={<Phone className="size-5 sm:size-4" />} />}
            {waLink && <QuickAction href={waLink} external label="WhatsApp" icon={<MessageCircle className="size-5 sm:size-4" />} />}
            {lead.email && <QuickAction href={`mailto:${lead.email}`} label="Email" icon={<Mail className="size-5 sm:size-4" />} />}
            {perms.delete && <QuickAction onClick={remove} danger label="Delete" icon={<Trash2 className="size-5 sm:size-4" />} />}
          </div>
        </div>
      </div>
      <ErrorText>{error}</ErrorText>

      <div className="segmented sticky top-[calc(env(safe-area-inset-top)+4.5rem)] z-10 mb-4 mt-4 shadow-soft lg:hidden">
        {tabs.map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t === 'details' ? 'Details' : t === 'ai' ? 'AI assist' : 'Timeline'}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:mt-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {perms.ai && (
            <div className={on('ai')}>
              <Insights lead={lead} onLead={setLead} />
            </div>
          )}
          {perms.ai && perms.update && (
            <div className={on('ai')}>
              <AiUpdate leadId={lead.id} onLead={setLead} />
            </div>
          )}
          <div className={on('timeline')}>
            <Timeline lead={lead} canAdd={perms.update} onLead={setLead} />
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <section className={`card p-5 ${on('details')}`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">Details</h2>
              {perms.update && !editing && (
                <button className="rounded-full px-2 py-1 text-xs font-semibold text-muted hover:text-fg max-sm:bg-surface-2" onClick={() => setEditing(true)}>
                  <Pencil className="mr-1 inline size-3" /> Edit
                </button>
              )}
            </div>
            {editing ? (
              <LeadForm
                lead={lead}
                assignees={assignees}
                canAssign={perms.assign}
                submitLabel="Save"
                onCancel={() => setEditing(false)}
                onSubmit={async (body) => {
                  const res = await api<{ lead: LeadDTO }>(`/api/leads/${lead.id}`, { method: 'PATCH', body });
                  setLead(res.lead);
                  setEditing(false);
                }}
              />
            ) : (
              <dl className="space-y-2.5 text-sm">
                {(
                  [
                    ['Contact', lead.name],
                    ['Company', lead.company],
                    ['Email', lead.email],
                    ['Phone', lead.phone],
                    ['Source', lead.source],
                    ['Deal value', lead.value ? inr(lead.value) : ''],
                    ['Owner', lead.assignedTo?.name ?? ''],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[100px_1fr] gap-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="break-words">{v || <span className="text-muted/50">—</span>}</dd>
                  </div>
                ))}
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <dt className="text-muted">Follow-up</dt>
                  <dd>{lead.nextFollowUp ? <When value={lead.nextFollowUp} overdueTone /> : <span className="text-muted/50">—</span>}</dd>
                </div>
                {lead.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {lead.tags.map((t) => (
                      <span key={t} className="chip bg-brand/5 text-muted ring-line">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                {lead.need && <p className="whitespace-pre-wrap border-t border-line pt-3 text-fg/85">{lead.need}</p>}
              </dl>
            )}
          </section>
          {perms.ai && (
            <div className={on('ai')}>
              <DraftMessage leadId={lead.id} waLink={waLink} email={lead.email} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Insights({ lead, onLead }: { lead: LeadDTO; onLead: (l: LeadDTO) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setBusy(true);
    setError('');
    try {
      const res = await api<{ insights: NonNullable<LeadDTO['ai']> }>(`/api/ai/leads/${lead.id}/insights`, { body: { now: localNow() } });
      onLead({ ...lead, ai: res.insights });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`ai-border relative overflow-hidden rounded-2xl p-5 ${busy ? 'ai-shimmer' : ''}`}>
      <div className="pointer-events-none absolute -right-20 -top-20 size-52 rounded-full bg-brand/15 blur-3xl" />
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-brand-2" /> AI insights
        </h2>
        <button className="btn-ghost py-1 text-xs" onClick={run} disabled={busy}>
          <RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} />
          {lead.ai ? 'Re-score' : 'Score this lead'}
        </button>
      </div>
      {lead.ai ? (
        <div className="flex gap-4">
          <ScoreRing score={lead.ai.score} size={64} />
          <div className="min-w-0 flex-1 space-y-3 text-sm">
            <p className="text-fg/85">{lead.ai.summary}</p>
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-3">
              <p className="mb-1 text-xs font-medium text-brand-2">Next best action</p>
              <p>{lead.ai.nextAction}</p>
            </div>
            <p className="text-xs text-muted">
              Scored <When value={lead.ai.at} ago />
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">Get a 0–100 score, a quick read on this lead and the single best next step.</p>
      )}
      {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
    </section>
  );
}

function AiUpdate({ leadId, onLead }: { leadId: string; onLead: (l: LeadDTO) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setBusy(true);
    setError('');
    try {
      const res = await api<{ lead: LeadDTO }>(`/api/ai/leads/${leadId}/update`, {
        body: { text, now: localNow(), tzOffset: new Date().getTimezoneOffset() },
      });
      onLead(res.lead);
      setText('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-medium">
        <Wand2 className="size-4 text-brand-3" /> Tell AI what happened
      </h2>
      <p className="mb-3 text-xs text-muted">AI updates the stage, value, follow-up and timeline for you.</p>
      <textarea
        className={`input min-h-20 ${busy ? 'ai-shimmer' : ''}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Spoke to Priya — loved the demo, wants a proposal for 25 seats by Friday. Budget ~4L. Call back Monday 11am."
        disabled={busy}
      />
      {error && <div className="mt-2"><ErrorText>{error}</ErrorText></div>}
      <div className="mt-3 flex justify-between gap-2">
        <VoiceButton onText={(t) => setText((cur) => (cur ? `${cur} ${t}` : t))} />
        <button className="btn-primary" disabled={busy || !text.trim()} onClick={run}>
          <Sparkles className="size-4" /> {busy ? 'Updating…' : 'Update with AI'}
        </button>
      </div>
    </section>
  );
}

function Timeline({ lead, canAdd, onLead }: { lead: LeadDTO; canAdd: boolean; onLead: (l: LeadDTO) => void }) {
  const [text, setText] = useState('');
  const [type, setType] = useState<'note' | 'call' | 'email'>('note');
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await api<{ lead: LeadDTO }>(`/api/leads/${lead.id}/activities`, { body: { type, text } });
      onLead(res.lead);
      setText('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="mb-4 text-sm font-medium">Timeline</h2>
      {canAdd && (
        <form onSubmit={add} className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex">
          <input className="input col-span-2 sm:order-2" value={text} onChange={(e) => setText(e.target.value)} placeholder="Log a note…" />
          <Select
            className="sm:order-1 sm:w-32 sm:shrink-0"
            aria-label="Activity type"
            value={type}
            onChange={setType}
            options={[
              { value: 'note', label: 'Note' },
              { value: 'call', label: 'Call' },
              { value: 'email', label: 'Email' },
            ]}
          />
          <button className="btn-primary sm:order-3" disabled={busy || !text.trim()}>
            Add
          </button>
        </form>
      )}
      <ol className="relative space-y-4 border-l border-line pl-5">
        {[...lead.activities].reverse().map((a) => (
          <li key={a.id} className="relative">
            <span
              className={`absolute -left-[29px] grid size-4.5 place-items-center rounded-full text-[10px] ring-4 ring-surface ${
                a.type === 'ai' ? 'bg-gradient-to-br from-brand to-brand-2 text-white' : 'bg-surface-2 text-muted'
              }`}
            >
              {ACTIVITY_ICON[a.type] ?? '•'}
            </span>
            <p className="whitespace-pre-wrap text-sm">{a.text}</p>
            <p className="mt-0.5 text-xs text-muted">
              {a.by || 'System'} · <When value={a.at} ago />
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DraftMessage({ leadId, waLink, email }: { leadId: string; waLink: string; email: string }) {
  const [channel, setChannel] = useState<'email' | 'whatsapp'>(email ? 'email' : 'whatsapp');
  const [goal, setGoal] = useState('');
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  async function run() {
    setBusy(true);
    setError('');
    try {
      const res = await api<{ draft: { subject: string; body: string } }>(`/api/ai/leads/${leadId}/draft`, { body: { channel, goal } });
      setDraft(res.draft);
      setOpen(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const sendHref = !draft
    ? ''
    : channel === 'whatsapp'
      ? waLink && `${waLink}?text=${encodeURIComponent(draft.body)}`
      : email && `mailto:${email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;

  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Mail className="size-4 text-brand-3" /> AI follow-up writer
      </h2>
      <div className="mb-2 flex rounded-xl border border-line bg-surface-2 p-0.5">
        {(['email', 'whatsapp'] as const).map((c) => (
          <button key={c} onClick={() => setChannel(c)} className={`flex-1 rounded-lg py-1.5 text-xs capitalize ${channel === c ? 'bg-surface shadow-sm' : 'text-muted'}`}>
            {c === 'whatsapp' ? 'WhatsApp' : 'Email'}
          </button>
        ))}
      </div>
      <input className="input mb-3" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Goal (optional): book a demo, nudge on proposal…" />
      <ErrorText>{error}</ErrorText>
      <button className="btn-primary w-full" onClick={run} disabled={busy}>
        <Sparkles className="size-4" /> {busy ? 'Writing…' : 'Draft message'}
      </button>

      <Modal open={open && Boolean(draft)} onClose={() => setOpen(false)} title="AI draft">
        {draft && (
          <div className="space-y-3">
            {draft.subject && <input className="input font-medium" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />}
            <textarea className="input min-h-56" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            <div className="grid auto-cols-fr grid-flow-col gap-2 sm:flex sm:justify-end">
              <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(draft.subject ? `${draft.subject}\n\n${draft.body}` : draft.body)}>
                <Copy className="size-4" /> Copy
              </button>
              {sendHref && (
                <a className="btn-primary" href={sendHref} target="_blank" rel="noreferrer">
                  Open in {channel === 'whatsapp' ? 'WhatsApp' : 'mail'}
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

function QuickAction({ href, external, onClick, label, icon, danger }: { href?: string; external?: boolean; onClick?: () => void; label: string; icon: React.ReactNode; danger?: boolean }) {
  const cls = `${danger ? 'btn-danger' : 'btn-ghost'} max-sm:size-12 max-sm:rounded-full max-sm:p-0`;
  return (
    <span className="flex flex-col items-center gap-1.5">
      {href ? (
        <a className={cls} href={href} title={label} aria-label={label} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
          {icon}
        </a>
      ) : (
        <button className={cls} onClick={onClick} title={label} aria-label={label}>
          {icon}
        </button>
      )}
      <span className={`text-[11px] font-semibold sm:hidden ${danger ? 'text-rose-600' : 'text-muted'}`}>{label}</span>
    </span>
  );
}
