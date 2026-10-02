'use client';

import { Building2, CheckCircle2, KeyRound, Plug, Sparkles, UserRound, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ErrorText, Meter } from '@/components/ui';
import PasswordField from '@/components/ui/PasswordField';
import Select from '@/components/ui/Select';
import type { ProviderId } from '@/lib/ai/models';
import { api, errorText } from '@/lib/client';

interface Props {
  profile: { name: string; email: string; roleLabel: string };
  workspace: {
    name: string;
    planName: string;
    ai: { choice: string; options: { provider: ProviderId; model: string; label: string; available: boolean }[]; usage: { used: number; limit: number } };
    integrations: { name: string; ok: boolean; hint: string }[];
  } | null;
}

// Tracks busy / error / success for one form.
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError('');
    setDone('');
    try {
      await fn();
      setDone(success);
      setTimeout(() => setDone(''), 3000);
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, done, run, setError };
}

function Section({ id, icon, title, description, children }: { id: string; icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-36 p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3 sm:gap-4">
        <span className="icon-tile size-11 shrink-0">{icon}</span>
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Status({ error, done }: { error: string; done: string }) {
  if (error) return <ErrorText>{error}</ErrorText>;
  if (done) return <p className="rounded-2xl bg-success/10 px-3.5 py-2.5 text-sm font-medium text-success">{done}</p>;
  return null;
}

export default function SettingsView({ profile, workspace }: Props) {
  const router = useRouter();
  const sections = [
    { id: 'profile', label: 'Profile', icon: UserRound },
    { id: 'security', label: 'Password', icon: KeyRound },
    ...(workspace
      ? [
          { id: 'workspace', label: 'Workspace', icon: Building2 },
          { id: 'ai', label: 'AI model', icon: Sparkles },
          { id: 'integrations', label: 'Integrations', icon: Plug },
        ]
      : []),
  ];

  const [name, setName] = useState(profile.name);
  const profileAction = useAction();
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const pwAction = useAction();
  const [orgName, setOrgName] = useState(workspace?.name ?? '');
  const orgAction = useAction();
  const [model, setModel] = useState(workspace?.ai.choice ?? '');
  const aiAction = useAction();

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.next !== pw.confirm) return pwAction.setError('The new passwords do not match.');
    const ok = await pwAction.run(
      () => api('/api/account/password', { body: { current: pw.current, next: pw.next } }),
      'Password updated. You have been signed out on other devices.'
    );
    if (ok) setPw({ current: '', next: '', confirm: '' });
  }

  async function pickModel(value: string) {
    const prev = model;
    setModel(value);
    const [provider, id] = value.split(':');
    const ok = await aiAction.run(async () => {
      await api('/api/settings', { method: 'PATCH', body: { ai: { provider, model: id } } });
      router.refresh();
    }, 'AI model updated.');
    if (!ok) setModel(prev);
  }

  return (
    <div className="grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <h1 className="sr-only">Settings</h1>
      <nav className="sticky top-[calc(env(safe-area-inset-top)+4.25rem)] z-10 -mx-4 bg-[#f7f6f4]/85 px-4 py-1 backdrop-blur-md sm:top-24 sm:-mx-6 sm:px-6 lg:top-32 lg:mx-0 lg:self-start lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col">
          {sections.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <a href={`#${id}`} className="press flex items-center gap-2 whitespace-nowrap rounded-full bg-surface px-3.5 py-2 text-sm font-semibold text-muted shadow-soft ring-1 ring-line transition hover:text-brand lg:gap-3 lg:rounded-2xl lg:bg-transparent lg:px-4 lg:py-2.5 lg:shadow-none lg:ring-0 lg:hover:bg-surface lg:hover:shadow-soft">
                <Icon className="size-4" /> {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-6">
        <Section id="profile" icon={<UserRound className="size-5" />} title="Profile" description="How you appear to your team.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              profileAction.run(async () => {
                await api('/api/account', { method: 'PATCH', body: { name } });
                router.refresh();
              }, 'Profile saved.');
            }}
            className="space-y-4"
          >
            <div className="flex items-center gap-4">
              <span className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-brand-3 to-brand text-2xl font-bold text-white ring-4 ring-surface-2">
                {(name || profile.name).slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="font-bold">{profile.name}</p>
                <span className="chip bg-brand/10 text-brand ring-brand/20">{profile.roleLabel}</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Full name</span>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
              </label>
              <label className="block">
                <span className="label">Email (used to sign in)</span>
                <input className="input" value={profile.email} disabled />
              </label>
            </div>
            <Status error={profileAction.error} done={profileAction.done} />
            <div className="flex justify-end [&>button]:max-sm:w-full">
              <button className="btn-primary" disabled={profileAction.busy || !name.trim() || name === profile.name}>
                {profileAction.busy ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
        </Section>

        <Section id="security" icon={<KeyRound className="size-5" />} title="Password" description="Changing it signs you out on every other device.">
          <form onSubmit={changePassword} className="space-y-4">
            <PasswordField label="Current password" value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} autoComplete="current-password" />
            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordField label="New password" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} autoComplete="new-password" showStrength />
              <PasswordField label="Confirm new password" value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} autoComplete="new-password" />
            </div>
            {pw.confirm && pw.next !== pw.confirm && <p className="text-xs font-medium text-rose-500">Passwords don&apos;t match yet.</p>}
            <Status error={pwAction.error} done={pwAction.done} />
            <div className="flex justify-end [&>button]:max-sm:w-full">
              <button className="btn-primary" disabled={pwAction.busy || !pw.current || pw.next.length < 8 || pw.next !== pw.confirm}>
                {pwAction.busy ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </Section>

        {workspace && (
          <>
            <Section id="workspace" icon={<Building2 className="size-5" />} title="Workspace" description={`Your company name, shown across the app · ${workspace.planName} plan`}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  orgAction.run(async () => {
                    await api('/api/settings', { method: 'PATCH', body: { name: orgName } });
                    router.refresh();
                  }, 'Workspace saved.');
                }}
                className="space-y-4"
              >
                <label className="block">
                  <span className="label">Workspace name</span>
                  <input className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} maxLength={120} required />
                </label>
                <Status error={orgAction.error} done={orgAction.done} />
                <div className="flex justify-end [&>button]:max-sm:w-full">
                  <button className="btn-primary" disabled={orgAction.busy || !orgName.trim() || orgName === workspace.name}>
                    {orgAction.busy ? 'Saving…' : 'Save workspace'}
                  </button>
                </div>
              </form>
            </Section>

            <Section id="ai" icon={<Sparkles className="size-5" />} title="AI model" description="Used for AI capture, lead updates, scoring, drafts and Copilot.">
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-end">
                <label className="block">
                  <span className="label">Provider &amp; model</span>
                  <Select
                    aria-label="AI provider and model"
                    value={model}
                    disabled={aiAction.busy}
                    onChange={pickModel}
                    placeholder="No AI key configured"
                    options={workspace.ai.options.map((o) => ({
                      value: `${o.provider}:${o.model}`,
                      label: o.label.split(' · ')[0],
                      hint: o.available ? o.label.split(' · ')[1] : 'API key not set',
                      disabled: !o.available,
                      group: o.provider === 'claude' ? 'Claude (Anthropic)' : 'Gemini (Google)',
                    }))}
                  />
                </label>
                <Meter label="AI actions this month" used={workspace.ai.usage.used} limit={workspace.ai.usage.limit} />
              </div>
              <div className="mt-4">
                <Status error={aiAction.error} done={aiAction.done} />
              </div>
            </Section>

            <Section id="integrations" icon={<Plug className="size-5" />} title="Integrations" description="Read from your server environment variables (.env.local / hosting settings).">
              <ul className="divide-y divide-line">
                {workspace.integrations.map((i) => (
                  <li key={i.name} className="flex items-center gap-3 py-3">
                    {i.ok ? <CheckCircle2 className="size-5 shrink-0 text-success" /> : <XCircle className="size-5 shrink-0 text-muted" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{i.name}</p>
                      {!i.ok && <p className="text-xs text-muted">{i.hint}</p>}
                    </div>
                    <span className={`chip ${i.ok ? 'bg-success/10 text-success ring-success/20' : 'bg-surface-2 text-muted ring-line'}`}>{i.ok ? 'Connected' : 'Not set'}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
