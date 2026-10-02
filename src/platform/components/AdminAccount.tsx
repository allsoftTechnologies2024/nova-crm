'use client';

import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { ErrorText } from '@/components/ui';
import PasswordField from '@/components/ui/PasswordField';
import { api, errorText } from '@/lib/client';

export default function AdminAccount({ name, email }: { name: string; email: string }) {
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  return (
    <section className="card max-w-2xl p-6">
      <div className="mb-5 flex items-start gap-4">
        <span className="icon-tile size-11 shrink-0">
          <KeyRound className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-bold">Password</h2>
          <p className="text-sm text-muted">
            {name} · {email}. Changing it signs out your other admin sessions.
          </p>
        </div>
      </div>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (pw.next !== pw.confirm) return setError('The new passwords do not match.');
          setBusy(true);
          setError('');
          setDone('');
          try {
            await api('/api/admin/account/password', { body: { current: pw.current, next: pw.next } });
            setPw({ current: '', next: '', confirm: '' });
            setDone('Password updated.');
          } catch (err) {
            setError(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <PasswordField label="Current password" value={pw.current} onChange={(current) => setPw({ ...pw, current })} autoComplete="current-password" />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField label="New password (min 10)" value={pw.next} onChange={(next) => setPw({ ...pw, next })} autoComplete="new-password" showStrength />
          <PasswordField label="Confirm new password" value={pw.confirm} onChange={(confirm) => setPw({ ...pw, confirm })} autoComplete="new-password" />
        </div>
        <ErrorText>{error}</ErrorText>
        {done && <p className="rounded-2xl bg-success/10 px-3.5 py-2.5 text-sm font-medium text-success">{done}</p>}
        <div className="flex justify-end">
          <button className="btn-primary" disabled={busy || !pw.current || pw.next.length < 10 || pw.next !== pw.confirm}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </section>
  );
}
