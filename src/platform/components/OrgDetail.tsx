'use client';

import { ArrowLeft, Ban, CalendarClock, Gauge, PlayCircle, RotateCcw, Sparkles, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ErrorText, Modal } from '@/components/ui';
import Select from '@/components/ui/Select';
import { PROVIDERS, type ProviderId } from '@/lib/ai/models';
import { api, errorText, inr, toLocalInput } from '@/lib/client';
import { formatINR, isFree, limitLabel, type Plan, type PlanId, type PlanSource } from '@/lib/plans';
import { RoleSelect, UserButtons, type AdminUser } from './UserActions';

interface Props {
  org: {
    id: string;
    name: string;
    plan: PlanId;
    planSource: PlanSource;
    trialUsed: boolean;
    planExpiresAt: string | null;
    suspended: boolean;
    limitOverrides: { seats: number | null; leads: number | null; aiCredits: number | null };
    ai: { provider: ProviderId; model: string };
    aiPolicy: { allowed: string[] | null; locked: boolean };
    aiUsed: number;
    leads: number;
    createdAt: string;
    members: AdminUser[];
    payments: { id: string; plan: string; period: string; amount: number; status: string; method: string; reference: string; recordedBy: string; at: string }[];
    autopay: { plan: string; period: 'monthly' | 'yearly'; status: string; on: boolean; cancelAtCycleEnd: boolean; currentEnd: string | null } | null;
  };
  models: { provider: ProviderId; model: string; label: string; available: boolean }[];
  plans: Plan[];
  trial: { enabled: boolean; planKey: string; days: number };
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

const SOURCE_LABEL: Record<PlanSource, string> = { free: 'Free plan', trial: 'Free trial', paid: 'Paid subscription', admin: 'Granted by platform admin' };

export default function OrgDetail({ org, models, plans, trial }: Props) {
  const planById = (id: string) => plans.find((p) => p.id === id);
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
      { plan, planExpiresAt: expires ? new Date(`${expires}T23:59:59`).toISOString() : null, limitOverrides: overrides },
      'Plan & limits saved.'
    );
  }

  const selected = planById(plan);
  const base = selected?.limits ?? { seats: Infinity, leads: Infinity, aiCredits: Infinity };
  const needsExpiry = Boolean(selected && !isFree(selected));
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
            {planById(org.plan)?.name ?? org.plan} plan ({SOURCE_LABEL[org.planSource] ?? org.planSource}) · {org.members.length} members · {org.leads.toLocaleString('en-IN')} leads · {org.aiUsed} AI actions this month
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
        <Card
          icon={<CalendarClock className="size-5" />}
          title="Plan"
          description={`${SOURCE_LABEL[org.planSource] ?? org.planSource}${org.planExpiresAt ? ` · ends ${new Date(org.planExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}. Change it here without payment (partners, extensions).`}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Plan</span>
              <Select
                aria-label="Plan"
                value={plan}
                onChange={setPlan}
                options={plans.map((p) => ({ value: p.id, label: `${p.name}${p.active ? '' : ' (disabled)'}`, hint: isFree(p) ? 'Free' : `${formatINR(p.priceMonthly)}/mo` }))}
              />
            </label>
            <label className="block">
              <span className="label">Expires on</span>
              <input type="date" className="input" value={expires} onChange={(e) => setExpires(e.target.value)} />
            </label>
          </div>
          {needsExpiry && (
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
      <div className="flex flex-wrap justify-end gap-2">
        {trial.enabled && planById(trial.planKey) && (
          <button
            className="btn-ghost"
            disabled={busy}
            onClick={() =>
              confirm(`Start a ${trial.days}-day ${planById(trial.planKey)?.name} trial for ${org.name}?${org.trialUsed ? ' (This workspace already had a trial.)' : ''}`) &&
              patch({ startTrial: true }, 'Trial started.')
            }
          >
            Start {trial.days}-day trial
          </button>
        )}
        <button className="btn-primary" disabled={busy || (needsExpiry && !expires)} onClick={savePlan}>
          {busy ? 'Saving…' : 'Save plan & limits'}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AiCard org={org} models={models} busy={busy} patch={patch} />

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

      <PaymentsCard org={org} plans={plans} patchDone={() => router.refresh()} />

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

// ---------- AI policy for one workspace ----------

function AiCard({
  org,
  models,
  busy,
  patch,
}: {
  org: Props['org'];
  models: Props['models'];
  busy: boolean;
  patch: (body: Record<string, unknown>, message: string) => Promise<void>;
}) {
  const key = (m: { provider: string; model: string }) => `${m.provider}:${m.model}`;
  const [custom, setCustom] = useState(Boolean(org.aiPolicy.allowed));
  const [allowed, setAllowed] = useState<string[]>(org.aiPolicy.allowed ?? models.map(key));
  const [locked, setLocked] = useState(org.aiPolicy.locked);
  const policyDirty =
    custom !== Boolean(org.aiPolicy.allowed) || locked !== org.aiPolicy.locked || (custom && JSON.stringify([...allowed].sort()) !== JSON.stringify([...(org.aiPolicy.allowed ?? [])].sort()));
  const current = org.ai.model ? `${org.ai.provider}:${org.ai.model}` : '';

  return (
    <Card icon={<Sparkles className="size-5" />} title="AI" description={`${org.aiUsed} actions used this month.`}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-56 flex-1">
            <span className="label">Model for this workspace</span>
            <Select
              aria-label="AI model"
              value={current}
              onChange={(v) => {
                const [provider, model] = v ? v.split(':') : [org.ai.provider, ''];
                patch({ ai: { provider, model } }, 'AI model updated.');
              }}
              options={[
                { value: '', label: 'Platform default', hint: 'Follows the default set under AI models' },
                ...models.map((m) => ({
                  value: key(m),
                  label: m.label.split(' · ')[0],
                  hint: m.available ? m.label.split(' · ')[1] : 'API key not set',
                  disabled: !m.available,
                  group: m.provider === 'claude' ? 'Claude (Anthropic)' : 'Gemini (Google)',
                })),
              ]}
            />
          </label>
          <button className="btn-ghost" disabled={busy} onClick={() => confirm('Reset this month’s AI usage to 0?') && patch({ resetAiUsage: true }, 'AI usage reset.')}>
            <RotateCcw className="size-4" /> Reset usage
          </button>
        </div>

        <div className="rounded-2xl bg-surface-2 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="mr-auto text-sm font-semibold">Allowed models</span>
            <Select
              size="sm"
              className="w-44"
              aria-label="Allowed models"
              value={custom ? 'custom' : 'platform'}
              onChange={(v) => setCustom(v === 'custom')}
              options={[
                { value: 'platform', label: 'Platform list', hint: 'Same as every workspace' },
                { value: 'custom', label: 'Custom for this workspace', hint: 'Can include models disabled platform-wide' },
              ]}
            />
          </div>
          {custom && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {models.map((m) => (
                <label key={key(m)} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-[#151515]"
                    checked={allowed.includes(key(m))}
                    onChange={(e) => setAllowed(e.target.checked ? [...allowed, key(m)] : allowed.filter((k) => k !== key(m)))}
                  />
                  {m.label.split(' · ')[0]}
                </label>
              ))}
            </div>
          )}
          <label className="mt-3 flex items-center gap-3 text-sm">
            <input type="checkbox" className="accent-[#151515]" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
            <span>
              <span className="font-semibold">Lock model</span> <span className="text-muted">— the workspace can't change it in Settings</span>
            </span>
          </label>
          <div className="mt-3 flex justify-end">
            <button
              className="btn-primary py-2"
              disabled={busy || !policyDirty || (custom && allowed.length === 0)}
              onClick={() => patch({ aiPolicy: { allowed: custom ? allowed : null, locked } }, 'AI policy saved.')}
            >
              Save AI policy
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------- Payments: history, autopay, offline payments, payment links ----------

const METHOD_LABEL: Record<string, string> = { checkout: 'Checkout', subscription: 'Autopay', link: 'Payment link', manual: 'Offline' };

function PaymentsCard({ org, plans, patchDone }: { org: Props['org']; plans: Plan[]; patchDone: () => void }) {
  const paid = plans.filter((p) => !isFree(p));
  const [modal, setModal] = useState<'' | 'manual' | 'link'>('');
  const [form, setForm] = useState({ plan: paid[0]?.id ?? '', period: 'monthly' as 'monthly' | 'yearly', amount: '', reference: '', note: '', notify: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const planOf = (id: string) => plans.find((p) => p.id === id);
  const defaultRupees = () => {
    const p = planOf(form.plan);
    return p ? String((form.period === 'yearly' ? p.priceYearly : p.priceMonthly) / 100) : '';
  };
  const amountPaise = Math.round((Number(form.amount || defaultRupees()) || 0) * 100);

  function open(kind: 'manual' | 'link') {
    setError('');
    setLinkUrl('');
    setForm((f) => ({ ...f, amount: '' }));
    setModal(kind);
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      if (modal === 'manual') {
        await api(`/api/admin/orgs/${org.id}/manual-payment`, { body: { plan: form.plan, period: form.period, amount: amountPaise, reference: form.reference, note: form.note } });
        setModal('');
        patchDone();
      } else {
        const res = await api<{ url: string }>(`/api/admin/orgs/${org.id}/payment-link`, { body: { plan: form.plan, period: form.period, amount: amountPaise, notify: form.notify } });
        setLinkUrl(res.url);
        patchDone();
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function stopAutopay() {
    if (!confirm('Turn off Autopay for this workspace? No further charges; paid time stays.')) return;
    try {
      await api(`/api/admin/orgs/${org.id}/autopay-cancel`, { method: 'POST', body: {} });
      patchDone();
    } catch (err) {
      alert(errorText(err));
    }
  }

  return (
    <Card icon={<CalendarClock className="size-5" />} title="Payments" description="Payment history, Autopay, and payments you collect for this workspace.">
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => open('link')} disabled={!paid.length}>
          Send payment link
        </button>
        <button className="btn-ghost" onClick={() => open('manual')} disabled={!paid.length}>
          Record offline payment
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
        <span className="mr-auto">
          <b>Autopay:</b>{' '}
          {org.autopay
            ? `${org.autopay.on ? 'on' : org.autopay.cancelAtCycleEnd ? 'turned off (ends with current period)' : org.autopay.status} · ${planOf(org.autopay.plan)?.name ?? org.autopay.plan} (${org.autopay.period})${
                org.autopay.currentEnd ? ` · cycle ends ${new Date(org.autopay.currentEnd).toLocaleDateString('en-IN')}` : ''
              }`
            : 'not set up'}
        </span>
        {org.autopay?.on && (
          <button className="btn-danger py-1.5 text-xs" onClick={stopAutopay}>
            Turn off Autopay
          </button>
        )}
      </div>

      {org.payments.length > 0 ? (
        <ul className="mt-4 divide-y divide-line text-sm">
          {org.payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="min-w-0">
                {planOf(p.plan)?.name ?? p.plan} · <span className="text-muted">{p.period}</span>{' '}
                <span className="chip ml-1 bg-surface-2 text-muted ring-line">{METHOD_LABEL[p.method] ?? p.method}</span>
                {p.reference && (
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {p.reference.startsWith('http') ? (
                      <a href={p.reference} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                        {p.reference}
                      </a>
                    ) : (
                      `Ref: ${p.reference}`
                    )}
                    {p.recordedBy && ` · by ${p.recordedBy}`}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-3">
                <span className={`chip ${p.status === 'paid' ? 'bg-success/10 text-success ring-success/20' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                  {p.status === 'paid' ? 'paid' : p.method === 'link' ? 'link sent' : 'pending'}
                </span>
                <span className="tabular-nums">{inr(p.amount / 100)}</span>
                <span className="text-xs text-muted">{new Date(p.at).toLocaleDateString('en-IN')}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">No payments yet.</p>
      )}

      <Modal open={modal !== ''} onClose={() => setModal('')} title={modal === 'manual' ? 'Record offline payment' : 'Send payment link'}>
        {linkUrl ? (
          <div className="space-y-4">
            <p className="text-sm">
              Payment link created{form.notify ? ' and emailed to the workspace owner' : ''}. When it's paid, the plan extends automatically.
            </p>
            <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-2 pl-4">
              <code className="min-w-0 flex-1 truncate text-sm">{linkUrl}</code>
              <button className="btn-primary py-2" onClick={() => navigator.clipboard.writeText(linkUrl)}>
                Copy
              </button>
            </div>
            <div className="flex justify-end">
              <button className="btn-ghost" onClick={() => setModal('')}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label">Plan</span>
                <Select
                  aria-label="Plan"
                  value={form.plan}
                  onChange={(plan) => setForm({ ...form, plan, amount: '' })}
                  options={paid.map((p) => ({ value: p.id, label: p.name, hint: `${formatINR(p.priceMonthly)}/mo` }))}
                />
              </label>
              <label className="block">
                <span className="label">Period</span>
                <Select
                  aria-label="Period"
                  value={form.period}
                  onChange={(period) => setForm({ ...form, period, amount: '' })}
                  options={[
                    { value: 'monthly', label: 'Monthly (1 month)' },
                    { value: 'yearly', label: 'Yearly (12 months)' },
                  ]}
                />
              </label>
            </div>
            <label className="block">
              <span className="label">Amount (₹) — defaults to the plan price</span>
              <input className="input" type="number" min={modal === 'link' ? 1 : 0} value={form.amount} placeholder={defaultRupees()} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </label>
            {modal === 'manual' ? (
              <>
                <label className="block">
                  <span className="label">Reference (UTR / UPI ref / receipt no.)</span>
                  <input className="input" maxLength={120} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                </label>
                <label className="block">
                  <span className="label">Note (optional)</span>
                  <input className="input" maxLength={300} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </label>
                <p className="rounded-2xl bg-surface-2 px-4 py-3 text-xs text-muted">
                  The workspace gets {form.period === 'yearly' ? '12 months' : '1 month'} of {planOf(form.plan)?.name} immediately (added on top of remaining paid time on the same plan).
                </p>
              </>
            ) : (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-[#151515]" checked={form.notify} onChange={(e) => setForm({ ...form, notify: e.target.checked })} />
                Email the link to the workspace owner (via Razorpay)
              </label>
            )}
            <ErrorText>{error}</ErrorText>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setModal('')}>
                Cancel
              </button>
              <button className="btn-primary" disabled={busy || !form.plan || (modal === 'link' && amountPaise < 100)} onClick={submit}>
                {busy ? 'Saving…' : modal === 'manual' ? `Record ${inr(amountPaise / 100)} & extend plan` : `Create ${inr(amountPaise / 100)} link`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
