'use client';

import { Copy, KeyRound, LogIn, Power } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from '@/components/ui';
import Select from '@/components/ui/Select';
import { api, errorText } from '@/lib/client';
import { ROLES, ROLE_META, type Role } from '@/lib/rbac';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

// Super-admin controls for one user: role (incl. owner), activate/deactivate, temp password, sign in as.
export function RoleSelect({ user, onError }: { user: AdminUser; onError: (m: string) => void }) {
  const router = useRouter();
  return (
    <Select
      size="sm"
      className="w-36"
      aria-label={`Role for ${user.email}`}
      value={user.role}
      onChange={async (role) => {
        try {
          await api(`/api/admin/users/${user.id}`, { method: 'PATCH', body: { role } });
          router.refresh();
        } catch (err) {
          onError(errorText(err));
        }
      }}
      options={ROLES.map((r) => ({ value: r, label: ROLE_META[r].label, hint: ROLE_META[r].description }))}
    />
  );
}

export function UserButtons({ user, onError }: { user: AdminUser; onError: (m: string) => void }) {
  const router = useRouter();
  const [temp, setTemp] = useState('');
  const [busy, setBusy] = useState('');

  async function act(kind: string, fn: () => Promise<void>) {
    setBusy(kind);
    try {
      await fn();
    } catch (err) {
      onError(errorText(err));
    } finally {
      setBusy('');
    }
  }

  const btn = 'grid size-8 place-items-center rounded-xl ring-1 ring-line transition hover:text-brand disabled:opacity-40';
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        className={`${btn} text-muted`}
        title={`Sign in as ${user.email}`}
        aria-label={`Sign in as ${user.email}`}
        disabled={!user.active || Boolean(busy)}
        onClick={() =>
          act('imp', async () => {
            if (!confirm(`Open a support session as ${user.email}? You'll see the app exactly as they do. This is logged.`)) return;
            await api('/api/admin/impersonate', { body: { userId: user.id } });
            window.open('/app', '_blank'); // the console stays open in this tab
          })
        }
      >
        <LogIn className="size-4" />
      </button>
      <button
        className={`${btn} text-muted`}
        title="Issue temporary password"
        aria-label={`Issue temporary password for ${user.email}`}
        disabled={Boolean(busy)}
        onClick={() =>
          act('pw', async () => {
            if (!confirm(`Reset ${user.email}'s password? They'll be signed out everywhere.`)) return;
            const res = await api<{ password: string }>(`/api/admin/users/${user.id}/password`, { method: 'POST', body: {} });
            setTemp(res.password);
          })
        }
      >
        <KeyRound className="size-4" />
      </button>
      <button
        className={`${btn} ${user.active ? 'text-rose-500' : 'text-success'}`}
        title={user.active ? 'Deactivate' : 'Activate'}
        aria-label={`${user.active ? 'Deactivate' : 'Activate'} ${user.email}`}
        disabled={Boolean(busy)}
        onClick={() =>
          act('active', async () => {
            await api(`/api/admin/users/${user.id}`, { method: 'PATCH', body: { active: !user.active } });
            router.refresh();
          })
        }
      >
        <Power className="size-4" />
      </button>

      <Modal open={Boolean(temp)} onClose={() => setTemp('')} title="Temporary password">
        <p className="text-sm text-muted">
          Share this with <b className="text-fg">{user.email}</b>. It&apos;s shown only once — they should change it in Settings after signing in.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-surface-2 p-2 pl-4">
          <code className="flex-1 font-mono text-base font-semibold tracking-wide">{temp}</code>
          <button className="btn-primary py-2" onClick={() => navigator.clipboard.writeText(temp)}>
            <Copy className="size-4" /> Copy
          </button>
        </div>
      </Modal>
    </div>
  );
}
