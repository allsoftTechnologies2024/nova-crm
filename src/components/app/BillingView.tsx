'use client';

import { Check, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useState } from 'react';
import { ErrorText, Meter, PageHeader } from '@/components/ui';
import { api, errorText } from '@/lib/client';
import { PLANS, PLAN_IDS, formatINR, priceFor, type BillingPeriod, type PlanId } from '@/lib/plans';

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (res: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
}
declare global {
  interface Window {
    Razorpay?: new (o: RazorpayOptions) => { open(): void; on(event: string, cb: (r: { error: { description: string } }) => void): void };
  }
}

type Usage = { used: number; limit: number | null };
interface Props {
  current: { plan: PlanId; name: string; expiresAt: string | null; expired: boolean };
  usage: { seats: Usage; leads: Usage; ai: Usage };
  payments: { id: string; plan: string; period: string; amount: number; paidAt: string }[];
  configured: boolean;
}

export default function BillingView({ current, usage, payments, configured }: Props) {
  const router = useRouter();
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const [busy, setBusy] = useState<PlanId | ''>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function checkout(plan: 'pro' | 'business') {
    setBusy(plan);
    setError('');
    setSuccess('');
    try {
      if (!window.Razorpay) throw new Error('Payment window failed to load. Check your connection and retry.');
      const order = await api<{ keyId: string; orderId: string; amount: number; currency: string; description: string; prefill: { name: string; email: string }; orgName: string }>(
        '/api/billing/order',
        { body: { plan, period } }
      );
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'LeadPilot',
        description: order.description,
        prefill: order.prefill,
        theme: { color: '#151515' },
        handler: async (res) => {
          try {
            await api('/api/billing/verify', { body: res });
            setSuccess(`You're on ${PLANS[plan].name}! 🎉`);
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
          current.expired
            ? 'Your paid plan has ended — you are on Starter limits. Renew to restore them.'
            : current.expiresAt
              ? `${current.name} plan · renews/ends ${new Date(current.expiresAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}`
              : `${current.name} plan`
        }
      />
      {success && <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-700">{success}</p>}
      <ErrorText>{error}</ErrorText>
      {!configured && <ErrorText>Razorpay keys are not set (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET), so upgrades are disabled.</ErrorText>}

      <section className="card grid gap-5 p-5 sm:grid-cols-3">
        <Meter label="Team members" used={usage.seats.used} limit={usage.seats.limit ?? Infinity} />
        <Meter label="Leads" used={usage.leads.used} limit={usage.leads.limit ?? Infinity} />
        <Meter label="AI actions this month" used={usage.ai.used} limit={usage.ai.limit ?? Infinity} />
      </section>

      <div className="flex justify-center">
        <div className="segmented w-full max-w-xs">
          {(['monthly', 'yearly'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} aria-pressed={period === p} className="capitalize">
              {p} {p === 'yearly' && <span className={period === p ? 'text-white/80' : 'text-emerald-600'}>−20%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 pt-3 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
        {PLAN_IDS.map((id) => {
          const plan = PLANS[id];
          const isCurrent = current.plan === id;
          const featured = id === 'pro';
          return (
            <div key={id} className={`relative flex w-[82%] shrink-0 snap-center flex-col rounded-3xl p-5 md:w-auto md:rounded-2xl ${featured ? 'ai-border shadow-xl shadow-brand/10' : 'card'}`}>
              {featured && <span className="absolute -top-2.5 left-5 rounded-full bg-gradient-to-r from-brand to-brand-2 px-2 py-0.5 text-[11px] font-medium text-white">Most popular</span>}
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="mt-1 text-xs text-muted">{plan.tagline}</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight">
                {plan.pricePaise ? formatINR(priceFor(id, period)) : '₹0'}
                <span className="text-sm font-normal text-muted">/{period === 'monthly' ? 'mo' : 'yr'}</span>
              </p>
              <ul className="my-5 flex-1 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>
              {id === 'free' ? (
                <button className="btn-ghost" disabled>
                  {isCurrent ? 'Current plan' : 'Included'}
                </button>
              ) : (
                <button className={featured ? 'btn-primary' : 'btn-ghost'} disabled={!configured || Boolean(busy)} onClick={() => checkout(id)}>
                  {busy === id ? 'Opening…' : isCurrent ? 'Extend plan' : `Upgrade to ${plan.name}`}
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
                  {PLANS[p.plan as PlanId]?.name ?? p.plan} · <span className="text-muted">{p.period}</span>
                </span>
                <span className="tabular-nums text-muted">
                  {formatINR(p.amount)} · {new Date(p.paidAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
