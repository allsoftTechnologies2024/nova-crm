'use client';

import { useState } from 'react';
import { ErrorText } from '@/components/ui';
import { priorityOptions, statusOptions } from '@/components/ui/options';
import Select from '@/components/ui/Select';
import { errorText, fromLocalInput, toLocalInput } from '@/lib/client';
import type { LeadDTO, LeadPriority, LeadStatus } from '@/lib/lead-meta';

export type Assignee = { id: string; name: string };

const blank = {
  name: '',
  company: '',
  email: '',
  phone: '',
  source: '',
  need: '',
  value: '',
  status: 'new',
  priority: 'warm',
  nextFollowUp: '',
  tags: '',
  assignedTo: '',
};
type Form = typeof blank;

const formOf = (l?: LeadDTO): Form =>
  l
    ? {
        name: l.name,
        company: l.company,
        email: l.email,
        phone: l.phone,
        source: l.source,
        need: l.need,
        value: l.value ? String(l.value) : '',
        status: l.status,
        priority: l.priority,
        nextFollowUp: toLocalInput(l.nextFollowUp),
        tags: l.tags.join(', '),
        assignedTo: l.assignedTo?.id ?? '',
      }
    : blank;

interface Props {
  lead?: LeadDTO;
  assignees: Assignee[];
  canAssign: boolean;
  submitLabel: string;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
}

export default function LeadForm({ lead, assignees, canAssign, submitLabel, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<Form>(() => formOf(lead));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name && !form.company && !form.email && !form.phone) return setError('Add at least a name, company, email or phone.');
    setBusy(true);
    setError('');
    try {
      const { assignedTo, ...rest } = form;
      await onSubmit({
        ...rest,
        value: Number(form.value) || 0,
        nextFollowUp: fromLocalInput(form.nextFollowUp),
        ...(canAssign ? { assignedTo: assignedTo || null } : {}),
      });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" value={form[k]} onChange={set(k)} {...props} />
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {field('name', 'Contact name', { placeholder: 'Priya Sharma' })}
        {field('company', 'Company', { placeholder: 'Acme Pvt Ltd' })}
        {field('email', 'Email', { type: 'email', placeholder: 'priya@acme.in' })}
        {field('phone', 'Phone', { placeholder: '+91 98xxxxxxx' })}
        {field('value', 'Deal value (₹)', { type: 'number', min: 0, inputMode: 'numeric', placeholder: '150000' })}
        {field('source', 'Source', { placeholder: 'Referral, Website, LinkedIn…' })}
        <label className="block">
          <span className="label">Stage</span>
          <Select aria-label="Stage" value={form.status as LeadStatus} onChange={(v) => setForm((f) => ({ ...f, status: v }))} options={statusOptions()} />
        </label>
        <label className="block">
          <span className="label">Priority</span>
          <Select aria-label="Priority" value={form.priority as LeadPriority} onChange={(v) => setForm((f) => ({ ...f, priority: v }))} options={priorityOptions()} />
        </label>
        {field('nextFollowUp', 'Next follow-up', { type: 'datetime-local' })}
        {canAssign ? (
          <label className="block">
            <span className="label">Owner</span>
            <Select
              aria-label="Owner"
              value={form.assignedTo}
              onChange={(v) => setForm((f) => ({ ...f, assignedTo: v }))}
              options={[{ value: '', label: 'Unassigned' }, ...assignees.map((a) => ({ value: a.id, label: a.name }))]}
            />
          </label>
        ) : (
          field('tags', 'Tags', { placeholder: 'enterprise, demo-booked' })
        )}
      </div>
      {canAssign && field('tags', 'Tags', { placeholder: 'enterprise, demo-booked' })}
      <label className="block">
        <span className="label">Requirement / notes</span>
        <textarea className="input min-h-24" value={form.need} onChange={set('need')} placeholder="What do they need? Budget, timeline, decision makers…" />
      </label>
      <ErrorText>{error}</ErrorText>
      <div className="grid auto-cols-fr grid-flow-col gap-2 sm:flex sm:justify-end">
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
