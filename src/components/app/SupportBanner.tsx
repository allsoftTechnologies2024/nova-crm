'use client';

import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/client';

// Shown across the app while a super admin is signed in as someone else (support session).
export default function SupportBanner({ name, email }: { name: string; email: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="relative z-40 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-fg px-4 py-2.5 text-sm text-white">
      <span className="flex items-center gap-2">
        <ShieldAlert className="size-4 text-brand-2" />
        Support session — you are signed in as <b>{name}</b> ({email}). Changes you make are real.
      </span>
      <button
        className="rounded-full bg-white px-3 py-1 text-xs font-bold text-fg transition hover:bg-white/90 disabled:opacity-60"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api('/api/auth/stop-impersonating', { method: 'POST', body: {} });
            window.location.href = '/admin/workspaces';
          } catch {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Ending…' : 'End support session'}
      </button>
    </div>
  );
}
