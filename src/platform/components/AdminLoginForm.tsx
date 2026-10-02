'use client';

import { ArrowRight, Building2, Clock3, Fingerprint, Lock, Mail, ScrollText, ShieldCheck, Timer, UserCog } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorText } from '@/components/ui';
import PasswordField from '@/components/ui/PasswordField';
import { api, errorText } from '@/lib/client';

const GUARDS = [
  { icon: UserCog, text: 'Separate operator accounts' },
  { icon: Timer, text: '8-hour sessions' },
  { icon: ScrollText, text: 'Every action audited' },
  { icon: Fingerprint, text: 'Brute-force protected' },
];

// Sign-in for platform admins only. Workspace accounts can't sign in here.
export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/admin/auth/login', { body: { email, password } });
      router.replace('/admin');
      router.refresh();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-[#f7f6f4] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Console panel */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden bg-[#151515] p-12 text-white lg:flex"
        style={{ backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-brand-2">
            <ShieldCheck className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="font-bold">Smart CRM</p>
            <p className="text-xs text-white/50">Platform operations</p>
          </div>
        </div>

        <div className="max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-3">Restricted</p>
          <h2 className="mt-4 text-5xl font-bold leading-[1.05] tracking-tight">
            Operator
            <br />
            <span className="text-brand-2">console.</span>
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60">
            Manage every workspace, plan and user on the platform. This console is separate from the CRM: workspace logins can&apos;t open it, and operator logins can&apos;t open workspaces.
          </p>

          {/* Status preview */}
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-2">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs font-semibold text-white/50">Console status</span>
              <span className="flex items-center gap-2 text-xs font-semibold text-white/80">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-success" />
                </span>
                Online
              </span>
            </div>
            {[
              { icon: Building2, label: 'Workspaces', value: 'Plans, limits & suspension' },
              { icon: ScrollText, label: 'Audit log', value: 'Recording all actions' },
              { icon: Clock3, label: 'Sessions', value: 'Expire after 8 hours' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl px-4 py-3 odd:bg-white/[0.03]">
                <Icon className="size-4 text-white/40" />
                <span className="text-sm font-semibold">{label}</span>
                <span className="ml-auto text-xs text-white/50">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-3 text-xs text-white/70">
          {GUARDS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl border border-white/10">
                <Icon className="size-3.5 text-brand-3" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </aside>

      {/* Sign-in */}
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center gap-2.5 lg:hidden">
          <span className="grid size-9 place-items-center rounded-xl bg-[#151515] text-white">
            <ShieldCheck className="size-4" />
          </span>
          <span className="text-sm font-bold">Smart CRM · Platform</span>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 animate-fade-up flex-col justify-center py-12">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-2/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-2">
            <Lock className="size-3" /> Restricted area
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">Sign in to the console</h1>
          <p className="mb-8 mt-2 text-sm text-muted">Use your platform operator account. Workspace accounts won&apos;t work here.</p>

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="label">Operator email</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  className="input pl-10"
                  type="email"
                  autoComplete="username"
                  required
                  autoFocus
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </span>
            </label>
            <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" placeholder="Your console password" />
            <ErrorText>{error}</ErrorText>
            <button className="btn-primary group w-full py-3" disabled={busy || !email || !password}>
              {busy ? 'Verifying…' : 'Sign in to console'}
              {!busy && <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-line bg-surface p-4 text-sm">
            <p className="font-semibold">Looking for your CRM?</p>
            <p className="mt-0.5 text-muted">
              Workspace members sign in at{' '}
              <Link href="/login" className="font-semibold text-fg underline-offset-4 hover:underline">
                /login
              </Link>
              .
            </p>
          </div>
        </div>

        <p className="flex items-center gap-2 text-xs text-muted">
          <ScrollText className="size-3.5" /> Sign-in attempts are rate-limited and recorded.
        </p>
      </main>
    </div>
  );
}
