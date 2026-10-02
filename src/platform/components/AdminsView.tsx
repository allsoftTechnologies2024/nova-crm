'use client';

import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorText, Modal, When } from '@/components/ui';
import PasswordField from '@/components/ui/PasswordField';
import { api, errorText } from '@/lib/client';

type Admin = { id: string; name: string; email: string; active: boolean; lastLoginAt: string | null; createdAt: string };

export default function AdminsView({ admins, meId }: { admins: Admin[]; meId: string }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  async function toggle(a: Admin) {
    setError('');
    try {
      await api(`/api/admin/admins/${a.id}`, { method: 'PATCH', body: { active: !a.active } });
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">People who can sign in to this console. They are not members of any workspace.</p>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          <UserPlus className="size-4" /> Add admin
        </button>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="card divide-y divide-line">
        {admins.map((a) => (
          <div key={a.id} className={`flex flex-wrap items-center gap-4 px-6 py-4 ${a.active ? '' : 'opacity-55'}`}>
            <span className="grid size-10 place-items-center rounded-full bg-fg text-sm font-bold text-white">{a.name.slice(0, 1).toUpperCase()}</span>
            <div className="mr-auto min-w-0">
              <p className="font-bold">
                {a.name} {a.id === meId && <span className="text-xs font-medium text-muted">(you)</span>}
              </p>
              <p className="text-xs text-muted">{a.email}</p>
            </div>
            <span className="text-xs text-muted">{a.lastLoginAt ? <>Last sign-in <When value={a.lastLoginAt} ago /></> : 'Never signed in'}</span>
            {a.id !== meId && (
              <button className={a.active ? 'btn-danger py-1.5 text-xs' : 'btn-ghost py-1.5 text-xs'} onClick={() => toggle(a)}>
                {a.active ? 'Deactivate' : 'Reactivate'}
              </button>
            )}
          </div>
        ))}
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add platform admin">
        <AddAdmin
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      </Modal>
    </div>
  );
}

function AddAdmin({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          await api('/api/admin/admins', { body: form });
          onDone();
        } catch (err) {
          setError(errorText(err));
          setBusy(false);
        }
      }}
    >
      <label className="block">
        <span className="label">Name</span>
        <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label className="block">
        <span className="label">Email</span>
        <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </label>
      <PasswordField label="Initial password (min 10 characters)" value={form.password} onChange={(password) => setForm({ ...form, password })} autoComplete="new-password" showStrength />
      <ErrorText>{error}</ErrorText>
      <button className="btn-primary w-full" disabled={busy || form.password.length < 10}>
        {busy ? 'Adding…' : 'Add admin'}
      </button>
    </form>
  );
}
