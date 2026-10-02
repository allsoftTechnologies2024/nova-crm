'use client';

import { Check, ShieldCheck, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorText, Modal, PageHeader } from '@/components/ui';
import Select from '@/components/ui/Select';
import { api, errorText } from '@/lib/client';
import { PERMISSIONS, ROLE_META, outranks, type Permission, type Role } from '@/lib/rbac';
import type { MemberDTO } from '@/lib/services/team';

const PERMISSION_LABELS: Record<Permission, string> = {
  'lead:read': 'View own leads',
  'lead:read_all': 'View all leads',
  'lead:create': 'Create leads',
  'lead:update': 'Edit leads',
  'lead:delete': 'Delete leads',
  'lead:assign': 'Assign leads',
  'ai:use': 'Use AI features',
  'team:view': 'View team',
  'activity:view_all': 'Team activity & AI reports',
  'team:manage': 'Manage team',
  'settings:manage': 'Workspace settings',
  'billing:manage': 'Billing',
};

interface Props {
  members: MemberDTO[];
  me: string;
  myRole: Role;
  canManage: boolean;
  assignable: Role[];
  seats: { used: number; limit: number | null };
  matrix: { role: Role; label: string; description: string; permissions: Permission[] }[];
}

export default function TeamView({ members, me, myRole, canManage, assignable, seats, matrix }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  async function update(id: string, body: { role?: Role; active?: boolean }) {
    setError('');
    try {
      await api(`/api/team/${id}`, { method: 'PATCH', body });
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    }
  }

  const manageable = (m: MemberDTO) => canManage && m.id !== me && outranks(myRole, m.role);

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        title="Team"
        subtitle={`${seats.used}${seats.limit ? ` of ${seats.limit}` : ''} seats used`}
        actions={
          canManage && (
            <button className="btn-primary" onClick={() => setAdding(true)}>
              <UserPlus className="size-4" /> Add member
            </button>
          )
        }
      />
      <ErrorText>{error}</ErrorText>

      {/* Phones: one card per member */}
      <ul className="space-y-2.5 md:hidden">
        {members.map((m) => (
          <li key={m.id} className={`card p-4 ${m.active ? '' : 'opacity-60'}`}>
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-3 to-brand text-sm font-bold text-white">{m.name.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {m.name} {m.id === me && <span className="text-xs text-muted">(you)</span>}
                </p>
                <p className="truncate text-xs text-muted">{m.email}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold leading-none tabular-nums">{m.openLeads}</p>
                <p className="text-[10px] text-muted">open leads</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
              {manageable(m) ? (
                <>
                  <div className="min-w-0 flex-1">
                    <Select
                      size="sm"
                      aria-label={`Role for ${m.name}`}
                      value={m.role}
                      onChange={(role) => update(m.id, { role })}
                      options={assignable.map((r) => ({ value: r, label: ROLE_META[r].label, hint: ROLE_META[r].description }))}
                    />
                  </div>
                  <button className={m.active ? 'btn-danger py-2 text-xs' : 'btn-ghost py-2 text-xs'} onClick={() => update(m.id, { active: !m.active })}>
                    {m.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </>
              ) : (
                <>
                  <span className="chip bg-brand/10 text-brand-2 ring-brand/20">{ROLE_META[m.role].label}</span>
                  <span className="ml-auto text-xs text-muted">{m.active ? 'Active' : 'Deactivated'}</span>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="card scroll-thin hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Open leads</th>
              <th className="px-4 py-3 font-medium">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((m) => (
              <tr key={m.id} className={m.active ? '' : 'opacity-50'}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-xs font-semibold ring-1 ring-line">{m.name.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <p className="font-medium">
                        {m.name} {m.id === me && <span className="text-xs text-muted">(you)</span>}
                      </p>
                      <p className="text-xs text-muted">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {manageable(m) ? (
                    <Select
                      size="sm"
                      className="w-36"
                      aria-label={`Role for ${m.name}`}
                      value={m.role}
                      onChange={(role) => update(m.id, { role })}
                      options={assignable.map((r) => ({ value: r, label: ROLE_META[r].label, hint: ROLE_META[r].description }))}
                    />
                  ) : (
                    <span className="chip bg-brand/10 text-brand-2 ring-brand/20">{ROLE_META[m.role].label}</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">{m.openLeads}</td>
                <td className="px-4 py-3">
                  {manageable(m) ? (
                    <button className={m.active ? 'btn-danger py-1 text-xs' : 'btn-ghost py-1 text-xs'} onClick={() => update(m.id, { active: !m.active })}>
                      {m.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  ) : (
                    <span className="text-xs text-muted">{m.active ? 'Active' : 'Deactivated'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="size-4 text-brand-3" /> Roles &amp; permissions
        </h2>
        <p className="mb-4 text-xs text-muted">Enforced on the server for every page, API call and AI Copilot action.</p>
        <div className="scroll-thin -mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="sticky left-0 z-[1] bg-surface py-2 pr-4 font-medium">Permission</th>
                {matrix.map((r) => (
                  <th key={r.role} className="px-2 py-2 text-center font-medium" title={r.description}>
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PERMISSIONS.map((p) => (
                <tr key={p}>
                  <td className="sticky left-0 z-[1] whitespace-nowrap bg-surface py-2.5 pr-4 text-fg/85 shadow-[8px_0_8px_-8px_rgb(60_50_120/0.15)] sm:py-2 sm:shadow-none">{PERMISSION_LABELS[p]}</td>
                  {matrix.map((r) => (
                    <td key={r.role} className="px-2 py-2 text-center">
                      {r.permissions.includes(p) ? <Check className="mx-auto size-3.5 text-emerald-500" /> : <span className="text-muted/40">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add team member">
        <AddMember
          assignable={assignable}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
}

function AddMember({ assignable, onDone }: { assignable: Role[]; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: assignable.includes('agent') ? 'agent' : assignable[0] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/team', { body: form });
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="label">Name</span>
        <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label className="block">
        <span className="label">Email</span>
        <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </label>
      <label className="block">
        <span className="label">Temporary password</span>
        <input className="input" type="text" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters — share it with them" />
      </label>
      <label className="block">
        <span className="label">Role</span>
        <Select
          aria-label="Role"
          value={form.role}
          onChange={(role) => setForm({ ...form, role })}
          options={assignable.map((r) => ({ value: r, label: ROLE_META[r].label, hint: ROLE_META[r].description }))}
        />
      </label>
      <ErrorText>{error}</ErrorText>
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? 'Adding…' : 'Add member'}
      </button>
    </form>
  );
}
