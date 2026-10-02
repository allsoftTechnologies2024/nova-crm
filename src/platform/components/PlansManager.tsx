'use client';

import { Check, Gift, LifeBuoy, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ErrorText, Modal } from '@/components/ui';
import Select from '@/components/ui/Select';
import { api, errorText } from '@/lib/client';
import { LOCK_PLAN_KEY, formatINR, isFree, limitLabel, toStoredLimit, yearlySavingPct, type Plan } from '@/lib/plans';

type AdminPlan = Plan & { usage: { workspaces: number; trials: number } };
interface Settings {
  trial: { enabled: boolean; planKey: string; days: number };
  fallbackPlanKey: string;
}

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40 ${checked ? 'bg-success' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

export default function PlansManager({ plans, settings }: { plans: AdminPlan[]; settings: Settings }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<AdminPlan | 'new' | null>(null);

  async function patch(key: string, body: Record<string, unknown>) {
    setError('');
    try {
      await api(`/api/admin/plans/${key}`, { method: 'PATCH', body });
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function remove(p: AdminPlan) {
    if (!confirm(`Delete the ${p.name} plan permanently?`)) return;
    setError('');
    try {
      await api(`/api/admin/plans/${p.id}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="max-w-7xl space-y-6">
      <TrialSettings plans={plans} settings={settings} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">
          Disabled plans are hidden from new buyers; workspaces already on them keep them until their period ends.
        </p>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          <Plus className="size-4" /> New plan
        </button>
      </div>
      <ErrorText>{error}</ErrorText>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => {
          const isFallback = settings.fallbackPlanKey === p.id;
          const isTrial = settings.trial.enabled && settings.trial.planKey === p.id;
          const saving = yearlySavingPct(p);
          return (
            <article key={p.id} className={`card flex flex-col p-6 ${p.active ? '' : 'opacity-60'}`}>
              <div className="flex items-start gap-3">
                <div className="mr-auto min-w-0">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    {p.name} {p.popular && <Star className="size-4 fill-brand-2 text-brand-2" />}
                  </h3>
                  <p className="font-mono text-[11px] text-muted">{p.id}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {isFallback && (
                    <span className="chip bg-surface-2 text-fg ring-line">
                      <LifeBuoy className="size-3" /> Fallback
                    </span>
                  )}
                  {isTrial && (
                    <span className="chip bg-brand-2/10 text-brand-2 ring-brand-2/20">
                      <Gift className="size-3" /> Trial
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-muted">{p.tagline || '—'}</p>

              <p className="mt-4 text-3xl font-bold tracking-tight">
                {isFree(p) ? 'Free' : formatINR(p.priceMonthly)}
                {!isFree(p) && <span className="text-sm font-medium text-muted">/mo</span>}
              </p>
              {!isFree(p) && (
                <p className="text-xs text-muted">
                  {formatINR(p.priceYearly)}/yr{saving > 0 ? ` · ${saving}% off` : ''}
                </p>
              )}

              <dl className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-3 text-center text-xs">
                {(
                  [
                    ['Seats', p.limits.seats],
                    ['Leads', p.limits.leads],
                    ['AI / mo', p.limits.aiCredits],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-bold tabular-nums">{limitLabel(v)}</dd>
                  </div>
                ))}
              </dl>

              <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                {p.features.slice(0, 5).map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
                {p.features.length > 5 && <li className="text-xs text-muted">+{p.features.length - 5} more</li>}
              </ul>

              <p className="mt-4 text-xs font-semibold text-muted">
                {p.usage.workspaces} workspace{p.usage.workspaces === 1 ? '' : 's'} on this plan{p.usage.trials ? ` · ${p.usage.trials} on trial` : ''}
              </p>

              <div className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
                {(
                  [
                    ['Enabled', 'active', 'Can be chosen by new sign-ups and buyers'],
                    ['Shown on pricing', 'public', 'Listed on the website and in Billing'],
                    ['Most popular', 'popular', 'Highlighted card (only one plan)'],
                  ] as const
                ).map(([label, field, hint]) => (
                  <label key={field} className="flex items-center gap-3">
                    <span className="mr-auto">
                      <span className="block font-semibold">{label}</span>
                      <span className="block text-xs text-muted">{hint}</span>
                    </span>
                    <Switch label={`${label}: ${p.name}`} checked={p[field]} onChange={(v) => patch(p.id, { [field]: v })} />
                  </label>
                ))}
              </div>

              <div className="mt-5 flex gap-2">
                <button className="btn-ghost flex-1" onClick={() => setEditing(p)}>
                  <Pencil className="size-4" /> Edit
                </button>
                <button className="btn-danger" onClick={() => remove(p)} aria-label={`Delete ${p.name}`} title="Delete plan">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New plan' : `Edit ${editing?.name ?? ''}`} wide>
        {editing !== null && (
          <PlanForm
            plan={editing === 'new' ? null : editing}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

// ---------- Trial & fallback ----------

function TrialSettings({ plans, settings }: { plans: AdminPlan[]; settings: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const enabled = plans.filter((p) => p.active);
  const options = (list: AdminPlan[]) => list.map((p) => ({ value: p.id, label: p.name, hint: isFree(p) ? 'Free' : `${formatINR(p.priceMonthly)}/mo` }));
  const dirty = JSON.stringify(form) !== JSON.stringify(settings);
  const lock = form.fallbackPlanKey === LOCK_PLAN_KEY;
  const fallbackName = lock ? null : (plans.find((p) => p.id === form.fallbackPlanKey)?.name ?? '—');

  async function save() {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await api('/api/admin/plan-settings', { method: 'PATCH', body: form });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6">
      <div className="mb-5 flex flex-wrap items-start gap-4">
        <span className="icon-tile size-11 shrink-0">
          <Gift className="size-5" />
        </span>
        <div className="mr-auto">
          <h2 className="text-base font-bold">Free trial & fallback plan</h2>
          <p className="text-sm text-muted">What new workspaces start on, and what they drop to when a trial or subscription ends.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)_200px_minmax(0,1fr)] lg:items-end">
        <Field label="Free trial for new sign-ups">
          <div className="flex h-11 items-center gap-3">
            <Switch label="Free trial" checked={form.trial.enabled} onChange={(v) => setForm({ ...form, trial: { ...form.trial, enabled: v } })} />
            <span className="text-sm font-semibold">{form.trial.enabled ? 'On' : 'Off'}</span>
          </div>
        </Field>
        <Field label="Trial plan">
          <Select
            aria-label="Trial plan"
            value={form.trial.planKey}
            disabled={!form.trial.enabled}
            onChange={(planKey) => setForm({ ...form, trial: { ...form.trial, planKey } })}
            options={options(enabled)}
          />
        </Field>
        <Field label="Trial length (days)">
          <input
            type="number"
            min={1}
            max={365}
            className="input"
            disabled={!form.trial.enabled}
            value={form.trial.days}
            onChange={(e) => setForm({ ...form, trial: { ...form.trial, days: Math.max(1, Math.min(365, Number(e.target.value) || 1)) } })}
          />
        </Field>
        <Field label="Fallback plan (after trial / subscription ends)">
          <Select
            aria-label="Fallback plan"
            value={form.fallbackPlanKey}
            onChange={(fallbackPlanKey) => setForm({ ...form, fallbackPlanKey })}
            options={[{ value: LOCK_PLAN_KEY, label: 'None, lock workspace', hint: 'Must subscribe' }, ...options(enabled)]}
          />
        </Field>
      </div>

      {form.trial.enabled && (
        <div className="mt-3 flex flex-wrap gap-2">
          {[7, 14, 30, 60].map((d) => (
            <button key={d} type="button" className={`pill ${form.trial.days === d ? 'ring-2 ring-brand-2' : ''}`} onClick={() => setForm({ ...form, trial: { ...form.trial, days: d } })}>
              {d} days
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
        {form.trial.enabled ? (
          <>
            New workspaces get <b>{plans.find((p) => p.id === form.trial.planKey)?.name ?? '—'}</b> free for <b>{form.trial.days} days</b>,{' '}
            {lock ? (
              <>
                then are <b>locked (read-only)</b> until they subscribe.
              </>
            ) : (
              <>
                then move to <b>{fallbackName}</b> unless they subscribe.
              </>
            )}
          </>
        ) : (
          <>
            {lock ? (
              <>
                With no trial and no fallback plan, new workspaces would be <b>locked from the start</b>. Turn the trial on or pick a fallback plan.
              </>
            ) : (
              <>
                New workspaces start on <b>{fallbackName}</b>. Paid subscriptions drop back to it when they end.
              </>
            )}
          </>
        )}{' '}
        Existing trials keep their current end date.
      </p>

      {error && (
        <div className="mt-4">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && !dirty && <span className="text-sm font-semibold text-success">Saved ✓</span>}
        <button className="btn-primary" disabled={busy || !dirty} onClick={save}>
          {busy ? 'Saving…' : 'Save trial settings'}
        </button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

// ---------- Create / edit ----------

type LimitKey = 'seats' | 'leads' | 'aiCredits';
const LIMIT_FIELDS: { key: LimitKey; label: string }[] = [
  { key: 'seats', label: 'Team seats' },
  { key: 'leads', label: 'Leads' },
  { key: 'aiCredits', label: 'AI actions / month' },
];

function PlanForm({ plan, onDone }: { plan: AdminPlan | null; onDone: () => void }) {
  const rupees = (paise: number) => (paise ? String(paise / 100) : '');
  const [f, setF] = useState({
    key: plan?.id ?? '',
    name: plan?.name ?? '',
    tagline: plan?.tagline ?? '',
    monthly: rupees(plan?.priceMonthly ?? 0),
    yearly: rupees(plan?.priceYearly ?? 0),
    limits: Object.fromEntries(
      LIMIT_FIELDS.map(({ key }) => {
        const v = plan?.limits[key] ?? 10;
        return [key, { unlimited: !Number.isFinite(v), value: Number.isFinite(v) ? String(v) : '' }];
      })
    ) as Record<LimitKey, { unlimited: boolean; value: string }>,
    features: (plan?.features ?? []).join('\n'),
    sortOrder: String(plan?.sortOrder ?? 0),
    active: plan?.active ?? true,
    public: plan?.public ?? true,
    popular: plan?.popular ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const monthlyPaise = Math.round((Number(f.monthly) || 0) * 100);
  const yearlyPaise = Math.round((Number(f.yearly) || 0) * 100);
  const saving = monthlyPaise > 0 && yearlyPaise > 0 && yearlyPaise < monthlyPaise * 12 ? Math.round((1 - yearlyPaise / (monthlyPaise * 12)) * 100) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = {
      name: f.name,
      tagline: f.tagline,
      priceMonthly: monthlyPaise,
      priceYearly: yearlyPaise,
      limits: Object.fromEntries(LIMIT_FIELDS.map(({ key }) => [key, f.limits[key].unlimited ? -1 : toStoredLimit(Math.max(0, Math.floor(Number(f.limits[key].value) || 0)))])),
      features: f.features
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      sortOrder: Number(f.sortOrder) || 0,
      active: f.active,
      public: f.public,
      popular: f.popular,
    };
    try {
      if (plan) await api(`/api/admin/plans/${plan.id}`, { method: 'PATCH', body });
      else await api('/api/admin/plans', { body: { ...body, key: f.key } });
      onDone();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plan name">
          <input className="input" required maxLength={40} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Growth" />
        </Field>
        <Field label={plan ? 'Key (permanent)' : 'Key — permanent id, e.g. growth'}>
          <input
            className="input font-mono"
            required
            disabled={Boolean(plan)}
            value={f.key}
            onChange={(e) => setF({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            placeholder="growth"
          />
        </Field>
      </div>
      <Field label="Tagline">
        <input className="input" maxLength={120} value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} placeholder="For teams that are scaling up" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Monthly price (₹) — leave empty for a free plan">
          <input className="input" type="number" min={0} step="1" value={f.monthly} onChange={(e) => setF({ ...f, monthly: e.target.value })} placeholder="0" />
        </Field>
        <Field label={`Yearly price (₹)${saving ? ` — ${saving}% off monthly` : ''}`}>
          <div className="flex gap-2">
            <input className="input" type="number" min={0} step="1" value={f.yearly} onChange={(e) => setF({ ...f, yearly: e.target.value })} placeholder="0" />
            <button
              type="button"
              className="btn-ghost shrink-0 px-3 text-xs"
              disabled={!monthlyPaise}
              onClick={() => setF({ ...f, yearly: String(Math.round((monthlyPaise * 12 * 0.8) / 100)) })}
              title="Set yearly to 12 months minus 20%"
            >
              −20%
            </button>
          </div>
        </Field>
      </div>

      <div>
        <span className="label">Limits</span>
        <div className="grid gap-3 sm:grid-cols-3">
          {LIMIT_FIELDS.map(({ key, label }) => (
            <div key={key} className="rounded-2xl bg-surface-2 p-3">
              <p className="mb-2 text-xs font-semibold">{label}</p>
              <input
                className="input bg-surface"
                type="number"
                min={0}
                disabled={f.limits[key].unlimited}
                value={f.limits[key].unlimited ? '' : f.limits[key].value}
                placeholder={f.limits[key].unlimited ? '∞' : '0'}
                onChange={(e) => setF({ ...f, limits: { ...f.limits, [key]: { ...f.limits[key], value: e.target.value } } })}
                aria-label={label}
              />
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="accent-[#151515]"
                  checked={f.limits[key].unlimited}
                  onChange={(e) => setF({ ...f, limits: { ...f.limits, [key]: { ...f.limits[key], unlimited: e.target.checked } } })}
                />
                Unlimited
              </label>
            </div>
          ))}
        </div>
      </div>

      <Field label="Features (one per line, shown on the pricing card)">
        <textarea className="input min-h-28" value={f.features} onChange={(e) => setF({ ...f, features: e.target.value })} placeholder={'10 team members\n5,000 leads\nAI Copilot'} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Sort order">
          <input className="input" type="number" min={0} max={999} value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: e.target.value })} />
        </Field>
        {(
          [
            ['Enabled', 'active'],
            ['Shown on pricing', 'public'],
            ['Most popular', 'popular'],
          ] as const
        ).map(([label, key]) => (
          <div key={key}>
            <span className="label">{label}</span>
            <div className="flex h-11 items-center">
              <Switch label={label} checked={f[key]} onChange={(v) => setF({ ...f, [key]: v })} />
            </div>
          </div>
        ))}
      </div>

      <ErrorText>{error}</ErrorText>
      <div className="flex justify-end gap-2">
        <button className="btn-primary" disabled={busy || !f.name || (!plan && f.key.length < 2)}>
          {busy ? 'Saving…' : plan ? 'Save changes' : 'Create plan'}
        </button>
      </div>
    </form>
  );
}
