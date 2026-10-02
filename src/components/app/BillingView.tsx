'use client';

import { Check, RefreshCw, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useState } from 'react';
import { ErrorText, Meter, PageHeader } from '@/components/ui';
import { api, errorText } from '@/lib/client';
import { formatINR, isFree, priceOf, yearlySavingPct, type BillingPeriod, type Plan, type PlanId, type PlanStatus } from '@/lib/plans';

interface RazorpayOptions {
  key: string;
  order_id?: string; // one-time payment
  subscription_id?: string; // Autopay
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (res: { razorpay_order_id?: string; razorpay_subscription_id?: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
}
declare global {
  interface Window {
    Razorpay?: new (o: RazorpayOptions) => { open(): void; on(event: string, cb: (r: { error: { description: string } }) => void): void };
  }
}

type Usage = { used: number; limit: number | null };
interface Props {
  plans: Plan[]; // enabled + visible plans from the platform console
  current: { plan: PlanId; name: string; status: PlanStatus };
  usage: { seats: Usage; leads: Usage; ai: Usage };
  payments: { id: string; plan: string; period: string; amount: number; method: string; paidAt: string }[];
  configured: boolean;
  autopay: { plan: string; period: BillingPeriod; status: string; on: boolean; cancelAtCycleEnd: boolean; currentEnd: string | null } | null;
}

const METHOD: Record<string, string> = { checkout: 'One-time', subscription: 'Autopay', link: 'Payment link', manual: 'Offline' };
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default function BillingView({ plans, current, usage, payments, configured, autopay }: Props) {
  const router = useRouter();
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const [busy, setBusy] = useState<PlanId | 'cancel' | ''>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState<'once' | 'autopay'>('once');
  const autopayOn = Boolean(autopay?.on);

  const nameOf = (id: string) => plans.find((p) => p.id === id)?.name ?? id;
  const bestSaving = Math.max(0, ...plans.map(yearlySavingPct));

  async function checkout(plan: PlanId) {
    setBusy(plan);
    setError('');
    setSuccess('');
    const recurring = mode === 'autopay';
    try {
      if (!window.Razorpay) throw new Error('Payment window failed to load. Check your connection and retry.');
      type Start = { keyId: string; orderId?: string; subscriptionId?: string; amount: number; currency?: string; description: string; prefill: { name: string; email: string } };
      const start = await api<Start>(recurring ? '/api/billing/autopay' : '/api/billing/order', { body: { plan, period } });
      const rzp = new window.Razorpay({
        key: start.keyId,
        ...(recurring ? { subscription_id: start.subscriptionId } : { order_id: start.orderId, amount: start.amount, currency: start.currency }),
        name: 'Smart CRM',
        description: start.description,
        prefill: start.prefill,
        theme: { color: '#151515' },
        handler: async (res) => {
          try {
            await api(recurring ? '/api/billing/autopay/verify' : '/api/billing/verify', { body: res });
            setSuccess(recurring ? `Autopay is on — you're on ${nameOf(plan)} and it renews automatically. 🎉` : `You're on ${nameOf(plan)}! 🎉`);
            router.refresh();
          } catch (err) {
            setError(errorText(err));
          } finally {
            setBusy('');
          }
        },
        modal: { ondismiss: () => setBusy('') },
      });
      rzp.on('payment.failed', (r) => {
        setError(r.error.description || 'Payment failed.');
        setBusy('');
      });
      rzp.open();
    } catch (err) {
      setError(errorText(err));
      setBusy('');
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <PageHeader
        title="Billing"
        subtitle={
          current.status.locked
            ? `Your ${current.status.source === 'trial' ? 'free trial' : `${current.status.assigned.name} plan`} has ended. Choose a plan to unlock your workspace.`
            : current.status.expired
            ? `Your ${current.status.onTrial || current.status.source === 'trial' ? 'free trial' : `${current.status.assigned.name} plan`} has ended — you're on ${current.name} limits now.`
            : current.status.expiresAt
              ? `${current.name} plan · ${current.status.onTrial ? 'trial ends' : 'renews/ends'} ${fmtDate(current.status.expiresAt)}`
              : `${current.name} plan`
        }
      />
      {current.status.onTrial && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-2/10 px-4 py-3 text-sm">
          <span className="rounded-full bg-brand-2 px-2.5 py-0.5 text-xs font-bold text-white">Free trial</span>
          <span>
            You&apos;re on a free trial with <b>{current.name}</b> limits — <b>{current.status.daysLeft} day{current.status.daysLeft === 1 ? '' : 's'} left</b>. Subscribe to a plan below for more seats,
            leads and AI, and to keep using Smart CRM when the trial ends.
          </span>
        </div>
      )}
      {success && <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-700">{success}</p>}
      <ErrorText>{error}</ErrorText>
      {!configured && <ErrorText>Razorpay keys are not set (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET), so upgrades are disabled.</ErrorText>}

      <section className="card grid gap-5 p-5 sm:grid-cols-3">
        <Meter label="Team members" used={usage.seats.used} limit={usage.seats.limit ?? Infinity} />
        <Meter label="Leads" used={usage.leads.used} limit={usage.leads.limit ?? Infinity} />
        <Meter label="AI actions this month" used={usage.ai.used} limit={usage.ai.limit ?? Infinity} />
      </section>

      {autopay && (
        <section className="card flex flex-wrap items-center gap-4 p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-success/10 text-success">
            <RefreshCw className="size-5" />
          </span>
          <div className="mr-auto min-w-0">
            <p className="font-semibold">
              {autopay.on ? 'Autopay is on' : autopay.cancelAtCycleEnd || autopay.status === 'cancelled' ? 'Autopay turned off' : `Autopay ${autopay.status}`} · {nameOf(autopay.plan)} ({autopay.period})
            </p>
            <p className="text-sm text-muted">
              {autopay.on
                ? `Renews automatically${autopay.currentEnd ? ` on ${fmtDate(autopay.currentEnd)}` : ''}. You can turn it off any time.`
                : autopay.cancelAtCycleEnd || (autopay.status === 'cancelled' && current.status.expiresAt && !current.status.expired)
                  ? `No further charges. Your paid access continues${current.status.expiresAt ? ` until ${fmtDate(current.status.expiresAt)}` : ''}.`
                  : autopay.status === 'pending'
                    ? 'The last renewal failed — Razorpay will retry. Check your card or UPI mandate.'
                    : 'Autopay has stopped. Pay below to continue.'}
            </p>
          </div>
          {autopay.on && (
            <button
              className="btn-ghost"
              disabled={Boolean(busy)}
              onClick={async () => {
                if (!confirm('Turn off Autopay? You keep access until the end of the period you paid for.')) return;
                setBusy('cancel');
                setError('');
                try {
                  await api('/api/billing/autopay/cancel', { method: 'POST', body: {} });
                  setSuccess('Autopay turned off. No further charges.');
                  router.refresh();
                } catch (err) {
                  setError(errorText(err));
                } finally {
                  setBusy('');
                }
              }}
            >
              Turn off Autopay
            </button>
          )}
        </section>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <div className="segmented w-full max-w-xs" role="group" aria-label="Payment type">
          {(
            [
              ['once', 'Pay once'],
              ['autopay', 'Autopay'],
            ] as const
          ).map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} disabled={m === 'autopay' && autopayOn}>
              {label}
            </button>
          ))}
        </div>
        <div className="segmented w-full max-w-xs">
          {(['monthly', 'yearly'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} aria-pressed={period === p} className="capitalize">
              {p} {p === 'yearly' && bestSaving > 0 && <span className={period === p ? 'text-white/80' : 'text-emerald-600'}>−{bestSaving}%</span>}
            </button>
          ))}
        </div>
      </div>
      <p className="-mt-3 text-center text-xs text-muted">
        {mode === 'autopay'
          ? 'Autopay renews automatically every period with your card or UPI Autopay. Turn it off any time.'
          : autopayOn
            ? 'Autopay is on — a one-time payment adds an extra period on top.'
            : 'Pay for one period. Nothing renews automatically.'}
      </p>

      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 pt-3 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
        {plans.map((plan) => {
          const id = plan.id;
          const isCurrent = current.plan === id && !current.status.expired;
          const featured = plan.popular;
          return (
            <div key={id} className={`relative flex w-[82%] shrink-0 snap-center flex-col rounded-3xl p-5 md:w-auto md:rounded-2xl ${featured ? 'ai-border shadow-xl shadow-brand/10' : 'card'}`}>
              {featured && <span className="absolute -top-2.5 left-5 rounded-full bg-gradient-to-r from-brand to-brand-2 px-2 py-0.5 text-[11px] font-medium text-white">Most popular</span>}
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="mt-1 text-xs text-muted">{plan.tagline}</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight">
                {isFree(plan) ? '₹0' : formatINR(priceOf(plan, period))}
                <span className="text-sm font-normal text-muted">/{period === 'monthly' ? 'mo' : 'yr'}</span>
              </p>
              <ul className="my-5 flex-1 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>
              {isFree(plan) ? (
                <button className="btn-ghost" disabled>
                  {isCurrent ? 'Current plan' : 'Included'}
                </button>
              ) : (
                <button className={featured ? 'btn-primary' : 'btn-ghost'} disabled={!configured || Boolean(busy)} onClick={() => checkout(id)}>
                  {busy === id
                    ? 'Opening…'
                    : mode === 'autopay'
                      ? `Autopay ${plan.name}`
                      : isCurrent && current.status.onTrial
                      ? `Subscribe to ${plan.name}`
                      : isCurrent
                        ? 'Extend plan'
                        : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <ShieldCheck className="size-3.5" /> Secure payments by Razorpay · UPI, cards, netbanking, wallets
      </p>

      {payments.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-medium">Payment history</h2>
          <ul className="divide-y divide-line text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-2.5 sm:py-2">
                <span>
                  {nameOf(p.plan)} · <span className="text-muted">{p.period}</span> <span className="chip ml-1 bg-surface-2 text-muted ring-line">{METHOD[p.method] ?? p.method}</span>
                </span>
                <span className="tabular-nums text-muted">
                  {formatINR(p.amount)} · {fmtDate(p.paidAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
