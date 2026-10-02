'use client';

import { CheckCircle2, Cpu, Info, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorText } from '@/components/ui';
import Select from '@/components/ui/Select';
import { api, errorText } from '@/lib/client';

interface Model {
  key: string;
  provider: string;
  providerLabel: string;
  label: string;
  inrPerAction: number;
  configured: boolean;
  enabled: boolean;
  isDefault: boolean;
  chosenBy: number;
}
interface Props {
  models: Model[];
  defaultModel: string;
  overrides: { custom: number; locked: number };
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: n < 10 ? 2 : 0 })}`;

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

export default function AiModelsManager({ models, defaultModel, overrides }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(models.filter((m) => m.enabled).map((m) => m.key));
  const [def, setDef] = useState(defaultModel || enabled[0] || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const dirty = def !== defaultModel || JSON.stringify([...enabled].sort()) !== JSON.stringify(models.filter((m) => m.enabled).map((m) => m.key).sort());

  function toggle(key: string, on: boolean) {
    setSaved(false);
    const next = on ? [...enabled, key] : enabled.filter((k) => k !== key);
    setEnabled(next);
    if (!next.includes(def)) setDef(next[0] ?? '');
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      await api('/api/admin/ai-settings', { method: 'PATCH', body: { enabledModels: enabled, defaultModel: def } });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const defaultOptions = models
    .filter((m) => enabled.includes(m.key))
    .map((m) => ({ value: m.key, label: m.label.split(' · ')[0], hint: `${m.providerLabel} · ≈${inr(m.inrPerAction)}/action${m.configured ? '' : ' · API key not set'}`, disabled: !m.configured }));

  return (
    <div className="max-w-6xl space-y-6">
      <section className="card p-6">
        <div className="mb-5 flex items-start gap-4">
          <span className="icon-tile size-11 shrink-0">
            <Cpu className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold">Platform AI models</h2>
            <p className="text-sm text-muted">
              Workspaces choose from the enabled models in their Settings. New workspaces, and any whose choice gets disabled, use the default.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="block max-w-md">
            <span className="label">Default model</span>
            <Select aria-label="Default model" value={def} onChange={(v) => (setDef(v), setSaved(false))} options={defaultOptions} placeholder="Enable a model first" />
          </label>
          <div className="flex items-center gap-3">
            {saved && !dirty && <span className="text-sm font-semibold text-success">Saved ✓</span>}
            <button className="btn-primary" disabled={busy || !dirty || !enabled.length || !def} onClick={save}>
              {busy ? 'Saving…' : 'Save AI settings'}
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-4">
            <ErrorText>{error}</ErrorText>
          </div>
        )}
        <p className="mt-4 flex gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
          <Info className="mt-0.5 size-4 shrink-0" />
          {overrides.custom || overrides.locked
            ? `${overrides.custom} workspace(s) have a custom model list and ${overrides.locked} are locked to a model — manage those under Workspaces.`
            : 'Per-workspace overrides (custom model list, lock a model) are under Workspaces → open a workspace → AI.'}{' '}
          Costs are rough estimates per AI action.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {models.map((m) => {
          const on = enabled.includes(m.key);
          return (
            <article key={m.key} className={`card flex flex-col p-5 ${on ? '' : 'opacity-60'}`}>
              <div className="flex items-start gap-3">
                <div className="mr-auto min-w-0">
                  <p className="text-xs font-semibold text-muted">{m.providerLabel}</p>
                  <h3 className="text-base font-bold">{m.label.split(' · ')[0]}</h3>
                  <p className="text-xs text-muted">{m.label.split(' · ')[1]}</p>
                </div>
                {def === m.key && on && <span className="chip bg-brand-2/10 text-brand-2 ring-brand-2/20">Default</span>}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-3 text-xs">
                <div>
                  <dt className="text-muted">Cost / action</dt>
                  <dd className="font-bold">≈{inr(m.inrPerAction)}</dd>
                </div>
                <div>
                  <dt className="text-muted">1,000 actions</dt>
                  <dd className="font-bold">≈{inr(m.inrPerAction * 1000)}</dd>
                </div>
              </dl>
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
                {m.configured ? <CheckCircle2 className="size-3.5 text-success" /> : <XCircle className="size-3.5 text-rose-500" />}
                {m.configured ? 'API key set' : 'API key not set on server'}
                <span className="ml-auto font-medium text-muted">{m.chosenBy} workspace(s) chose it</span>
              </p>
              <label className="mt-4 flex items-center gap-3 border-t border-line pt-4 text-sm">
                <span className="mr-auto font-semibold">Enabled for workspaces</span>
                <Switch label={`Enable ${m.label}`} checked={on} onChange={(v) => toggle(m.key, v)} />
              </label>
            </article>
          );
        })}
      </div>
    </div>
  );
}
