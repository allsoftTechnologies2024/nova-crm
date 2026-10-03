'use client';

import { ArrowUpRight, Building2, Check, KeyRound, Lock, Sparkles, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ErrorText, Meter } from '@/components/ui';
import PasswordField from '@/components/ui/PasswordField';
import type { ProviderId } from '@/lib/ai/models';
import { api, errorText } from '@/lib/client';

interface Props {
  profile: { name: string; email: string; roleLabel: string };
  workspace: {
    name: string;
    plan: { name: string; note: string; canManage: boolean };
    ai: { choice: string; locked: boolean; options: { provider: ProviderId; model: string; label: string; available: boolean }[]; usage: { used: number; limit: number } };
  } | null;
}

type TabId = 'profile' | 'security' | 'workspace' | 'ai';

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

// One settings card: header, labelled rows, and an optional footer with status + action.
function Panel({ title, description, footer, children }: { title: string; description: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <header className="border-b border-line px-5 py-5 sm:px-7">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </header>
      <div className="divide-y divide-line">{children}</div>
      {footer && <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface-2/50 px-5 py-4 sm:px-7">{footer}</footer>}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 px-5 py-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-8 sm:px-7">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Status({ error, done }: { error: string; done: string }) {
  if (error) return <div className="mr-auto"><ErrorText>{error}</ErrorText></div>;
  if (done)
    return (
      <p className="mr-auto flex items-center gap-1.5 text-sm font-semibold text-success">
        <Check className="size-4" /> {done}
      </p>
    );
  return null;
}

export default function SettingsView({ profile, workspace }: Props) {
  const router = useRouter();
  const tabs: { id: TabId; label: string; hint: string; icon: typeof UserRound }[] = [
    { id: 'profile', label: 'Profile', hint: 'Your name and email', icon: UserRound },
    { id: 'security', label: 'Password', hint: 'Sign-in security', icon: KeyRound },
    ...(workspace
      ? [
          { id: 'workspace' as const, label: 'Workspace', hint: 'Company name and plan', icon: Building2 },
          { id: 'ai' as const, label: 'AI model', hint: 'Model used for AI features', icon: Sparkles },
        ]
      : []),
  ];
  const [tab, setTab] = useState<TabId>('profile');

  // Deep links: /app/settings#ai opens that tab.
  useEffect(() => {
    const fromHash = window.location.hash.slice(1) as TabId;
    if (tabs.some((t) => t.id === fromHash)) setTab(fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function open(id: TabId) {
    setTab(id);
    window.history.replaceState(null, '', `#${id}`);
  }

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
      'Password updated. Other devices were signed out.'
    );
    if (ok) setPw({ current: '', next: '', confirm: '' });
  }

  async function pickModel(value: string) {
    if (value === model) return;
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
    <div className="grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      <h1 className="sr-only">Settings</h1>

      <nav aria-label="Settings sections" className="lg:sticky lg:top-28 lg:self-start">
        <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:card lg:mx-0 lg:flex-col lg:gap-1 lg:p-2">
          {tabs.map(({ id, label, hint, icon: Icon }) => {
            const active = tab === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => open(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`press flex w-full items-center gap-3 whitespace-nowrap rounded-full px-4 py-2 text-left text-sm font-semibold transition lg:rounded-2xl lg:px-3 lg:py-2.5 ${
                    active ? 'bg-brand text-white shadow-soft' : 'bg-surface text-muted ring-1 ring-line hover:text-ink lg:bg-transparent lg:ring-0 lg:hover:bg-surface-2'
                  }`}
                >
                  <span className={`hidden size-9 shrink-0 place-items-center rounded-xl lg:grid ${active ? 'bg-white/15' : 'bg-surface-2'}`}>
                    <Icon className="size-4" />
                  </span>
                  <Icon className="size-4 lg:hidden" />
                  <span className="min-w-0">
                    <span className="block">{label}</span>
                    <span className={`hidden text-xs font-medium lg:block ${active ? 'text-white/70' : 'text-muted'}`}>{hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0">
        {tab === 'profile' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              profileAction.run(async () => {
                await api('/api/account', { method: 'PATCH', body: { name } });
                router.refresh();
              }, 'Profile saved.');
            }}
          >
            <Panel
              title="Profile"
              description="How you appear to your team."
              footer={
                <>
                  <Status error={profileAction.error} done={profileAction.done} />
                  <button className="btn-primary max-sm:w-full" disabled={profileAction.busy || !name.trim() || name === profile.name}>
                    {profileAction.busy ? 'Saving…' : 'Save changes'}
                  </button>
                </>
              }
            >
              <div className="flex items-center gap-4 px-5 py-5 sm:px-7">
                <span className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-3 to-brand text-2xl font-bold text-white ring-4 ring-surface-2">
                  {(name || profile.name).slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold">{name || profile.name}</p>
                  <p className="truncate text-sm text-muted">{profile.email}</p>
                  <span className="chip mt-1.5 bg-brand/10 text-brand ring-brand/20">{profile.roleLabel}</span>
                </div>
              </div>
              <Row label="Full name" hint="Shown on leads, activity and chats.">
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required aria-label="Full name" />
              </Row>
              <Row label="Email" hint="Used to sign in.">
                <div className="flex min-h-11 items-center gap-2 rounded-2xl px-1 text-sm">
                  <span className="truncate font-medium">{profile.email}</span>
                  <span className="chip ml-auto shrink-0 bg-surface-2 text-muted ring-line">
                    <Lock className="size-3" /> Can&apos;t be changed
                  </span>
                </div>
              </Row>
            </Panel>
          </form>
        )}

        {tab === 'security' && (
          <form onSubmit={changePassword}>
            <Panel
              title="Password"
              description="Changing your password signs you out on every other device."
              footer={
                <>
                  <Status error={pwAction.error} done={pwAction.done} />
                  <button className="btn-primary max-sm:w-full" disabled={pwAction.busy || !pw.current || pw.next.length < 8 || pw.next !== pw.confirm}>
                    {pwAction.busy ? 'Updating…' : 'Update password'}
                  </button>
                </>
              }
            >
              <Row label="Current password">
                <PasswordField label="" value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} autoComplete="current-password" />
              </Row>
              <Row label="New password" hint="At least 8 characters.">
                <PasswordField label="" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} autoComplete="new-password" showStrength />
              </Row>
              <Row label="Confirm new password">
                <PasswordField label="" value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} autoComplete="new-password" />
                {pw.confirm && pw.next !== pw.confirm && <p className="mt-2 text-xs font-medium text-rose-500">Passwords don&apos;t match yet.</p>}
              </Row>
            </Panel>
          </form>
        )}

        {tab === 'workspace' && workspace && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              orgAction.run(async () => {
                await api('/api/settings', { method: 'PATCH', body: { name: orgName } });
                router.refresh();
              }, 'Workspace saved.');
            }}
          >
            <Panel
              title="Workspace"
              description="Settings shared by everyone in your team."
              footer={
                <>
                  <Status error={orgAction.error} done={orgAction.done} />
                  <button className="btn-primary max-sm:w-full" disabled={orgAction.busy || !orgName.trim() || orgName === workspace.name}>
                    {orgAction.busy ? 'Saving…' : 'Save changes'}
                  </button>
                </>
              }
            >
              <Row label="Workspace name" hint="Your company name, shown across the app.">
                <input className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} maxLength={120} required aria-label="Workspace name" />
              </Row>
              <Row label="Plan">
                <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
                  <div className="mr-auto min-w-0">
                    <p className="text-sm font-bold">{workspace.plan.name} plan</p>
                    {workspace.plan.note && <p className="text-xs text-muted">{workspace.plan.note}</p>}
                  </div>
                  {workspace.plan.canManage && (
                    <Link href="/app/billing" className="btn-ghost shrink-0 text-sm">
                      Manage billing <ArrowUpRight className="size-4" />
                    </Link>
                  )}
                </div>
              </Row>
            </Panel>
          </form>
        )}

        {tab === 'ai' && workspace && (
          <Panel title="AI model" description="Used for AI capture, lead updates, scoring, drafts and Copilot.">
            <Row label="Model" hint={workspace.ai.locked ? 'Set by your platform admin.' : 'Applies to everyone in the workspace.'}>
              {workspace.ai.options.length ? (
                <div role="radiogroup" aria-label="AI model" className="grid gap-2 sm:grid-cols-2">
                  {workspace.ai.options.map((o) => {
                    const value = `${o.provider}:${o.model}`;
                    const selected = model === value;
                    const [title, sub] = o.label.split(' · ');
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={!o.available || aiAction.busy || workspace.ai.locked}
                        onClick={() => pickModel(value)}
                        className={`press flex items-start gap-3 rounded-2xl p-3.5 text-left ring-1 transition disabled:cursor-not-allowed ${
                          selected ? 'bg-brand/5 ring-2 ring-brand' : 'ring-line hover:bg-surface-2 disabled:opacity-50'
                        }`}
                      >
                        <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-1 ${selected ? 'bg-brand text-white ring-brand' : 'ring-line'}`}>
                          {selected && <Check className="size-3" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold">{title}</span>
                          <span className="block text-xs text-muted">
                            {o.provider === 'claude' ? 'Claude (Anthropic)' : 'Gemini (Google)'}
                            {o.available ? (sub ? ` · ${sub}` : '') : ' · unavailable'}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted">No AI model is available right now. Contact support.</p>
              )}
              {workspace.ai.locked && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted">
                  <Lock className="size-3.5" /> Managed by your platform admin — contact support to change it.
                </p>
              )}
              {(aiAction.error || aiAction.done) && (
                <div className="mt-3">
                  <Status error={aiAction.error} done={aiAction.done} />
                </div>
              )}
            </Row>
            <Row label="Usage" hint="Resets on the 1st of every month.">
              <Meter label="AI actions this month" used={workspace.ai.usage.used} limit={workspace.ai.usage.limit} />
            </Row>
          </Panel>
        )}
      </div>
    </div>
  );
}
