'use client';

import { ArrowLeft, Ban, CalendarClock, Gauge, PlayCircle, RotateCcw, Sparkles, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ErrorText, Modal } from '@/components/ui';
import Select from '@/components/ui/Select';
import { PROVIDERS, type ProviderId } from '@/lib/ai/models';
import { api, errorText, inr, toLocalInput } from '@/lib/client';
import { PLANS, PLAN_IDS, limitLabel, type PlanId } from '@/lib/plans';
import { RoleSelect, UserButtons, type AdminUser } from './UserActions';

interface Props {
  org: {
    id: string;
    name: string;
    plan: PlanId;
    planExpiresAt: string | null;
    suspended: boolean;
    limitOverrides: { seats: number | null; leads: number | null; aiCredits: number | null };
    ai: { provider: ProviderId; model: string };
    aiUsed: number;
    leads: number;
    createdAt: string;
    members: AdminUser[];
    payments: { id: string; plan: string; period: string; amount: number; status: string; at: string }[];
  };
  models: { provider: ProviderId; model: string; label: string; available: boolean }[];
}

type LimitKey = 'seats' | 'leads' | 'aiCredits';
const LIMITS: { key: LimitKey; label: string }[] = [
  { key: 'seats', label: 'Team seats' },
  { key: 'leads', label: 'Leads' },
  { key: 'aiCredits', label: 'AI actions / month' },
];
// Override select state: "plan" (use plan default), "unlimited", or "custom" with a number.
type LimitMode = 'plan' | 'unlimited' | 'custom';
const modeOf = (v: number | null): LimitMode => (v == null ? 'plan' : v < 0 ? 'unlimited' : 'custom');

function Card({ icon, title, description, children, tone }: { icon: ReactNode; title: string; description?: string; children: ReactNode; tone?: 'danger' }) {
  return (
    <section className={`card p-6 ${tone === 'danger' ? 'ring-1 ring-rose-200' : ''}`}>
      <div className="mb-5 flex items-start gap-4">
        <span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-white ${tone === 'danger' ? 'bg-rose-500' : 'icon-tile'}`}>{icon}</span>
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function OrgDetail({ org, models }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  const [plan, setPlan] = useState<PlanId>(org.plan);
  const [expires, setExpires] = useState(toLocalInput(org.planExpiresAt).slice(0, 10));
  const [limits, setLimits] = useState(
    Object.fromEntries(LIMITS.map(({ key }) => [key, { mode: modeOf(org.limitOverrides[key]), value: org.limitOverrides[key] && org.limitOverrides[key]! > 0 ? String(org.limitOverrides[key]) : '' }])) as Record<
      LimitKey,
      { mode: LimitMode; value: string }
    >
  );
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  async function patch(body: Record<string, unknown>, message: string) {
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await api(`/api/admin/orgs/${org.id}`, { method: 'PATCH', body });
      setSaved(message);
      setTimeout(() => setSaved(''), 2500);
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function savePlan() {
    const overrides = Object.fromEntries(
      LIMITS.map(({ key }) => {
        const l = limits[key];
        return [key, l.mode === 'plan' ? null : l.mode === 'unlimited' ? -1 : Math.max(0, Math.floor(Number(l.value) || 0))];
      })
    );
    patch(
      { plan, planExpiresAt: plan === 'free' ? null : expires ? new Date(`${expires}T23:59:59`).toISOString() : null, limitOverrides: overrides },
      'Plan & limits saved.'
    );
  }

  const base = PLANS[plan].limits;
  const addDays = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    setExpires(toLocalInput(d.toISOString()).slice(0, 10));
  };

  return (
    <div className="max-w-6xl space-y-6">
      <Link href="/admin/workspaces" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand">
        <ArrowLeft className="size-4" /> All workspaces
      </Link>

      <div className="panel-brand flex flex-wrap items-center gap-5 p-6">
        <span className="grid size-14 place-items-center rounded-2xl bg-white/15 text-2xl font-bold ring-1 ring-white/25">{org.name.slice(0, 1).toUpperCase()}</span>
        <div className="mr-auto min-w-0">
          <h1 className="truncate text-2xl font-bold">{org.name}</h1>
          <p className="text-sm text-white/75">
            {PLANS[org.plan].name} plan · {org.members.length} members · {org.leads.toLocaleString('en-IN')} leads · {org.aiUsed} AI actions this month
          </p>
        </div>
        {org.suspended ? (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-rose-600">Suspended</span>
        ) : (
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/25">Active</span>
        )}
      </div>

      {error && <ErrorText>{error}</ErrorText>}
      {saved && <p className="rounded-2xl bg-success/10 px-3.5 py-2.5 text-sm font-medium text-success">{saved}</p>}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card icon={<CalendarClock className="size-5" />} title="Plan override" description="Grant or change a plan without payment (e.g. trials, partners).">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Plan</span>
              <Select aria-label="Plan" value={plan} onChange={setPlan} options={PLAN_IDS.map((p) => ({ value: p, label: PLANS[p].name, hint: PLANS[p].tagline }))} />
            </label>
            <label className="block">
              <span className="label">Expires on</span>
              <input type="date" className="input" value={expires} onChange={(e) => setExpires(e.target.value)} disabled={plan === 'free'} />
            </label>
          </div>
          {plan !== 'free' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ['+14 days', 14],
                ['+30 days', 30],
                ['+1 year', 365],
              ].map(([label, n]) => (
                <button key={label} type="button" className="pill hover:brightness-95" onClick={() => addDays(n as number)}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card icon={<Gauge className="size-5" />} title="Limit overrides" description="Custom limits on top of the plan. “Plan default” follows the plan.">
          <div className="space-y-3">
            {LIMITS.map(({ key, label }) => (
              <div key={key} className="grid grid-cols-[minmax(0,1fr)_150px_110px] items-center gap-2">
                <span className="text-sm font-semibold">{label}</span>
                <Select
                  size="sm"
                  aria-label={`${label} override`}
                  value={limits[key].mode}
                  onChange={(mode) => setLimits({ ...limits, [key]: { ...limits[key], mode } })}
                  options={[
                    { value: 'plan', label: 'Plan default', hint: limitLabel(base[key]) },
                    { value: 'unlimited', label: 'Unlimited' },
                    { value: 'custom', label: 'Custom' },
                  ]}
                />
                {limits[key].mode === 'custom' ? (
                  <input
                    type="number"
                    min={0}
                    className="input py-1.5 text-xs"
                    value={limits[key].value}
                    onChange={(e) => setLimits({ ...limits, [key]: { ...limits[key], value: e.target.value } })}
                    aria-label={`${label} custom limit`}
                  />
                ) : (
                  <span className="text-right text-xs font-semibold text-muted">{limits[key].mode === 'unlimited' ? '∞' : limitLabel(base[key])}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="flex justify-end">
        <button className="btn-primary" disabled={busy || (plan !== 'free' && !expires)} onClick={savePlan}>
          {busy ? 'Saving…' : 'Save plan & limits'}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card icon={<Sparkles className="size-5" />} title="AI" description={`${org.aiUsed} actions used this month.`}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block min-w-56 flex-1">
              <span className="label">Model for this workspace</span>
              <Select
                aria-label="AI model"
                value={`${org.ai.provider}:${org.ai.model || PROVIDERS[org.ai.provider].defaultModel}`}
                placeholder="Default model"
                onChange={(v) => {
                  const [provider, model] = v.split(':');
                  patch({ ai: { provider, model } }, 'AI model updated.');
                }}
                options={models.map((m) => ({
                  value: `${m.provider}:${m.model}`,
                  label: m.label.split(' · ')[0],
                  hint: m.available ? m.label.split(' · ')[1] : 'API key not set',
                  disabled: !m.available,
                  group: m.provider === 'claude' ? 'Claude (Anthropic)' : 'Gemini (Google)',
                }))}
              />
            </label>
            <button className="btn-ghost" disabled={busy} onClick={() => confirm('Reset this month’s AI usage to 0?') && patch({ resetAiUsage: true }, 'AI usage reset.')}>
              <RotateCcw className="size-4" /> Reset usage
            </button>
          </div>
        </Card>

        <Card icon={org.suspended ? <PlayCircle className="size-5" /> : <Ban className="size-5" />} title="Access" description="Suspended workspaces can't sign in. Data is kept.">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              Status: <b className={org.suspended ? 'text-rose-600' : 'text-success'}>{org.suspended ? 'Suspended' : 'Active'}</b>
            </p>
            {org.suspended ? (
              <button className="btn-primary" disabled={busy} onClick={() => patch({ suspended: false }, 'Workspace reactivated.')}>
                <PlayCircle className="size-4" /> Reactivate
              </button>
            ) : (
              <button className="btn-danger" disabled={busy} onClick={() => confirm(`Suspend ${org.name}? Its members will be signed out.`) && patch({ suspended: true }, 'Workspace suspended.')}>
                <Ban className="size-4" /> Suspend workspace
              </button>
            )}
          </div>
        </Card>
      </div>

      <Card icon={<Users className="size-5" />} title="Members" description="Change roles (including owner), reset passwords, deactivate, or sign in as a member for support.">
        <div className="scroll-thin -mx-6 overflow-x-auto px-6">
          <table className="w-full min-w-[620px] text-sm">
            <tbody className="divide-y divide-line">
              {org.members.map((m) => (
                <tr key={m.id} className={m.active ? '' : 'opacity-50'}>
                  <td className="py-3 pr-4">
                    <p className="font-bold">
                      {m.name}
                    </p>
                    <p className="text-xs text-muted">{m.email}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <RoleSelect user={m} onError={setError} />
                  </td>
                  <td className="py-3 pr-4 text-xs font-semibold">{m.active ? <span className="text-success">Active</span> : <span className="text-muted">Deactivated</span>}</td>
                  <td className="py-3">
                    <UserButtons user={m} onError={setError} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {org.payments.length > 0 && (
        <Card icon={<CalendarClock className="size-5" />} title="Payments">
          <ul className="divide-y divide-line text-sm">
            {org.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5">
                <span>
                  {PLANS[p.plan as PlanId]?.name ?? p.plan} · <span className="text-muted">{p.period}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className={`chip ${p.status === 'paid' ? 'bg-success/10 text-success ring-success/20' : 'bg-surface-2 text-muted ring-line'}`}>{p.status}</span>
                  <span className="tabular-nums">{inr(p.amount / 100)}</span>
                  <span className="text-xs text-muted">{new Date(p.at).toLocaleDateString('en-IN')}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card icon={<Trash2 className="size-5" />} title="Danger zone" description="Permanently deletes the workspace, its members, leads, chats and payment records." tone="danger">
        <button className="btn-danger" onClick={() => setDeleting(true)}>
          <Trash2 className="size-4" /> Delete workspace
        </button>
      </Card>

      <Modal open={deleting} onClose={() => setDeleting(false)} title="Delete workspace permanently?">
        <p className="text-sm text-muted">
          This can&apos;t be undone. Type <b className="text-fg">{org.name}</b> to confirm.
        </p>
        <input className="input mt-4" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={org.name} />
        {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setDeleting(false)}>
            Cancel
          </button>
          <button
            className="btn bg-rose-600 text-white hover:bg-rose-700"
            disabled={confirmName !== org.name || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`/api/admin/orgs/${org.id}`, { method: 'DELETE', body: { confirmName } });
                router.replace('/admin/workspaces');
                router.refresh();
              } catch (err) {
                setError(errorText(err));
                setBusy(false);
              }
            }}
          >
            Delete forever
          </button>
        </div>
      </Modal>
    </div>
  );
}
