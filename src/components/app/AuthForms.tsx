'use client';

import { ArrowLeft, Building2, CheckCircle2, Mail, UserRound, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorText } from '@/components/ui';
import PasswordField from '@/components/ui/PasswordField';
import { api, errorText } from '@/lib/client';

function Field({ icon: Icon, label, ...props }: { icon: LucideIcon; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input className="input pl-10" required {...props} />
      </span>
    </label>
  );
}

function useSubmit(fn: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }
  return { busy, error, setError, onSubmit };
}

// Google's "G" mark, as their sign-in branding guidelines ask for on a "Continue with Google" button.
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

// Same button on sign-in and sign-up: an existing account signs in, a new Google account creates a workspace.
export function GoogleButton() {
  return (
    <>
      <a href="/api/auth/google" className="btn-ghost w-full bg-white py-3 ring-1 ring-black/10">
        <GoogleMark /> Continue with Google
      </a>
      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-black/10" /> or with email <span className="h-px flex-1 bg-black/10" />
      </div>
    </>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, onSubmit } = useSubmit(async () => {
    await api('/api/auth/login', { body: { email, password } });
    router.replace('/app');
    router.refresh();
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field icon={Mail} label="Work email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      <div>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" placeholder="Your password" />
        <div className="mt-2 text-right">
          <Link href="/forgot-password" className="text-xs font-semibold text-brand hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
      <button className="btn-primary w-full py-3" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

export function SignupForm({ trialDays }: { trialDays: number | null }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', company: '', email: '', password: '' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const { busy, error, onSubmit } = useSubmit(async () => {
    await api('/api/auth/signup', { body: form });
    router.replace('/app');
    router.refresh();
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field icon={UserRound} label="Your name" autoComplete="name" value={form.name} onChange={set('name')} placeholder="Priya Sharma" />
        <Field icon={Building2} label="Company" autoComplete="organization" value={form.company} onChange={set('company')} placeholder="Acme Pvt Ltd" />
      </div>
      <Field icon={Mail} label="Work email" type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@company.com" />
      <PasswordField label="Password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" showStrength placeholder="At least 8 characters" />
      <ErrorText>{error}</ErrorText>
      <button className="btn-primary w-full py-3" disabled={busy || form.password.length < 8}>
        {busy ? 'Creating workspace…' : 'Create free workspace'}
      </button>
      <p className="text-center text-xs text-muted">{trialDays ? `${trialDays}-day free trial` : 'Free trial'} · no card needed</p>
    </form>
  );
}

export function ForgotForm({ devHint }: { devHint: boolean }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { busy, error, onSubmit } = useSubmit(async () => {
    await api('/api/auth/forgot', { body: { email } });
    setSent(true);
  });

  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <span className="icon-tile mx-auto size-16">
          <Mail className="size-7" />
        </span>
        <div>
          <p className="text-lg font-bold">Check your inbox</p>
          <p className="mt-1 text-sm text-muted">
            If <b className="text-fg">{email}</b> has an account, a reset link is on its way. It expires in 30 minutes.
          </p>
        </div>
        {devHint && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-left text-xs text-amber-700">Email isn&apos;t configured on this server yet (SMTP_*), so the reset link was printed in the server log.</p>}
        <Link href="/login" className="btn-ghost w-full">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field icon={Mail} label="Work email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      <ErrorText>{error}</ErrorText>
      <button className="btn-primary w-full py-3" disabled={busy}>
        {busy ? 'Sending…' : 'Send reset link'}
      </button>
      <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm font-semibold text-muted hover:text-brand">
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [done, setDone] = useState(false);
  const { busy, error, setError, onSubmit } = useSubmit(async () => {
    if (pw.next !== pw.confirm) return setError('The passwords do not match.');
    await api('/api/auth/reset', { body: { token, password: pw.next } });
    setDone(true);
    setTimeout(() => {
      router.replace('/app');
      router.refresh();
    }, 1200);
  });

  if (!token) {
    return (
      <div className="space-y-4">
        <ErrorText>This reset link is missing its token. Request a new one.</ErrorText>
        <Link href="/forgot-password" className="btn-primary w-full">
          Request a new link
        </Link>
      </div>
    );
  }
  if (done) {
    return (
      <div className="space-y-3 text-center">
        <CheckCircle2 className="mx-auto size-14 text-success" />
        <p className="text-lg font-bold">Password updated</p>
        <p className="text-sm text-muted">Signing you in…</p>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PasswordField label="New password" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} autoComplete="new-password" showStrength placeholder="At least 8 characters" />
      <PasswordField label="Confirm new password" value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} autoComplete="new-password" />
      {pw.confirm && pw.next !== pw.confirm && <p className="text-xs font-medium text-rose-500">Passwords don&apos;t match yet.</p>}
      <ErrorText>{error}</ErrorText>
      <button className="btn-primary w-full py-3" disabled={busy || pw.next.length < 8 || pw.next !== pw.confirm}>
        {busy ? 'Saving…' : 'Set new password'}
      </button>
    </form>
  );
}

// Last step of Google sign-up: the email is already verified by Google, so only the names are asked.
export function GoogleWorkspaceForm({ name: initialName, email, trialDays }: { name: string; email: string; trialDays: number | null }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: initialName, company: '' });
  const { busy, error, onSubmit } = useSubmit(async () => {
    await api('/api/auth/google/complete', { body: form });
    router.replace('/app');
    router.refresh();
  });
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="flex items-center gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
        <GoogleMark /> <span className="truncate">{email}</span>
      </p>
      <Field icon={UserRound} label="Your name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Priya Sharma" />
      <Field icon={Building2} label="Company" autoComplete="organization" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Pvt Ltd" autoFocus />
      <ErrorText>{error}</ErrorText>
      <button className="btn-primary w-full py-3" disabled={busy}>
        {busy ? 'Creating workspace…' : 'Create free workspace'}
      </button>
      <p className="text-center text-xs text-muted">{trialDays ? `${trialDays}-day free trial` : 'Free trial'} · no card needed</p>
    </form>
  );
}
