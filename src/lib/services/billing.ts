import 'server-only';
import crypto from 'node:crypto';
import { z } from 'zod';
import type { AuthContext } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { badRequest, HttpError } from '@/lib/http';
import { BILLING_PERIODS, isFree, priceOf, type BillingPeriod } from '@/lib/plans';
import { getPlan } from './plans';
import { Organization } from '@/models/Organization';
import { Payment, type PaymentDoc } from '@/models/Payment';
import { PlanModel } from '@/models/Plan';
import { logActivity, systemActor } from './activity';

// Payments for plan periods, all through Razorpay (REST API, no SDK):
//   checkout      one-time payment from Billing (order → Checkout → verify / webhook)
//   subscription  Autopay: a Razorpay subscription charges every period; each charge extends the plan
//   link          a payment link a platform admin sends to a workspace owner
//   manual        an offline payment (bank transfer, UPI, cash) recorded by a platform admin
// Every route ends in grantPeriod(), which runs exactly once per payment.

export const checkoutSchema = z.object({ plan: z.string().trim().min(1).max(60), period: z.enum(['monthly', 'yearly']) });
export const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});
export const autopayVerifySchema = z.object({
  razorpay_subscription_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const razorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const safeEqual = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const hmac = (secret: string, payload: string) => crypto.createHmac('sha256', secret).update(payload).digest('hex');

// Minimal Razorpay REST client.
export async function razorpay<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  if (!razorpayConfigured()) throw new HttpError(503, 'Payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  const basic = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) throw new HttpError(502, data.error?.description || `Razorpay request failed (${res.status}).`);
  return data;
}

// A plan the platform currently sells (enabled, visible, paid) and its price for the period.
async function sellable(planKey: string, period: BillingPeriod) {
  const plan = await getPlan(planKey);
  if (!plan || !plan.active || !plan.public || isFree(plan)) throw badRequest('That plan is not available.');
  const amount = priceOf(plan, period);
  if (amount <= 0) throw badRequest('That billing period is not available for this plan.');
  return { plan, amount };
}

const METHOD_LABEL: Record<string, string> = { checkout: 'Payment', subscription: 'Autopay payment', link: 'Payment-link payment', manual: 'Offline payment' };

// Extends the workspace's plan by one paid period. Renewing the same plan stacks onto remaining paid time.
async function grantPeriod(payment: PaymentDoc) {
  const org = await Organization.findById(payment.orgId);
  if (!org) return;
  const now = new Date();
  const stacks = org.plan === payment.plan && org.planSource === 'paid' && org.planExpiresAt && org.planExpiresAt > now;
  const expires = new Date(stacks ? org.planExpiresAt! : now);
  expires.setMonth(expires.getMonth() + BILLING_PERIODS[payment.period as BillingPeriod].months);
  org.plan = payment.plan;
  org.planExpiresAt = expires;
  org.planSource = 'paid';
  await org.save();
  const planName = (await getPlan(payment.plan))?.name ?? payment.plan;
  await logActivity(systemActor(String(org._id)), {
    action: 'billing.paid',
    category: 'billing',
    summary: `${METHOD_LABEL[payment.method ?? 'checkout'] ?? 'Payment'} received: ${planName} plan (${payment.period}) · ₹${(payment.amount / 100).toLocaleString('en-IN')} — active until ${expires.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    entity: { type: 'payment', id: payment.orderId, label: payment.orderId },
    meta: { amount: payment.amount, method: payment.method },
  });
}

// Marks a pending payment paid exactly once, then grants the period.
async function activate(orderId: string, paymentId: string) {
  await connectDB();
  const payment = await Payment.findOneAndUpdate({ orderId, status: 'created' }, { $set: { status: 'paid', paymentId, paidAt: new Date() } }, { new: true });
  if (!payment) return false; // unknown or already activated
  await grantPeriod(payment);
  return true;
}

// ---------- One-time checkout ----------

export async function createOrder(auth: AuthContext, input: z.infer<typeof checkoutSchema>) {
  const { plan, amount } = await sellable(input.plan, input.period);
  const order = await razorpay<{ id: string }>('/orders', {
    amount,
    currency: 'INR',
    receipt: `org_${auth.org.id.slice(-8)}_${Date.now()}`,
    notes: { orgId: auth.org.id, plan: input.plan, period: input.period },
  });
  await connectDB();
  await Payment.create({ orgId: auth.org.id, orderId: order.id, plan: input.plan, period: input.period, amount, method: 'checkout' });
  return {
    keyId: process.env.RAZORPAY_KEY_ID!,
    orderId: order.id,
    amount,
    currency: 'INR',
    description: `${plan.name} plan · ${input.period}`,
    prefill: { name: auth.user.name, email: auth.user.email },
    orgName: auth.org.name,
  };
}

// Browser callback from Razorpay Checkout: verify the signature, then activate.
export async function verifyPayment(auth: AuthContext, input: z.infer<typeof verifySchema>) {
  const expected = hmac(process.env.RAZORPAY_KEY_SECRET ?? '', `${input.razorpay_order_id}|${input.razorpay_payment_id}`);
  if (!safeEqual(expected, input.razorpay_signature)) throw badRequest('Payment verification failed.');
  await connectDB();
  if (!(await Payment.exists({ orderId: input.razorpay_order_id, orgId: auth.org.id }))) throw badRequest('Unknown order.');
  await activate(input.razorpay_order_id, input.razorpay_payment_id);
}

// ---------- Autopay (Razorpay Subscriptions) ----------

const LIVE_AUTOPAY = ['created', 'authenticated', 'active', 'pending'];

// The Razorpay plan for (our plan, period, current price) — created once and re-created when the price changes.
async function razorpayPlanId(planKey: string, period: BillingPeriod, amount: number, name: string) {
  const doc = await PlanModel.findOne({ key: planKey });
  if (!doc) throw badRequest('That plan is not available.');
  // Keyed by the API key too: test-mode plan ids don't exist in live mode.
  const keyId = process.env.RAZORPAY_KEY_ID ?? '';
  const stored = (doc.razorpayPlans as Record<string, { id: string; amount: number; keyId?: string }> | undefined)?.[period];
  if (stored?.id && stored.amount === amount && stored.keyId === keyId) return stored.id;
  const created = await razorpay<{ id: string }>('/plans', {
    period, // "monthly" | "yearly"
    interval: 1,
    item: { name: `${name} (${period})`, amount, currency: 'INR' },
    notes: { planKey, period },
  });
  await PlanModel.updateOne({ key: planKey }, { $set: { [`razorpayPlans.${period}`]: { id: created.id, amount, keyId } } });
  return created.id;
}

export async function startAutopay(auth: AuthContext, input: z.infer<typeof checkoutSchema>) {
  await connectDB();
  const org = await Organization.findById(auth.org.id);
  if (!org) throw badRequest('Workspace not found.');
  const current = org.autopay;
  if (current?.subscriptionId && LIVE_AUTOPAY.includes(current.status ?? '') && current.status !== 'created' && !current.cancelAtCycleEnd) {
    throw badRequest('Autopay is already on. Turn it off first to switch plans.');
  }
  const { plan, amount } = await sellable(input.plan, input.period);
  const planId = await razorpayPlanId(plan.id, input.period, amount, plan.name);
  // Abandon an earlier, never-authorised attempt.
  if (current?.subscriptionId && current.status === 'created') {
    await razorpay(`/subscriptions/${current.subscriptionId}/cancel`, { cancel_at_cycle_end: 0 }).catch(() => {});
  }
  const sub = await razorpay<{ id: string; status: string }>('/subscriptions', {
    plan_id: planId,
    total_count: input.period === 'yearly' ? 10 : 120, // up to 10 years; cancel any time
    quantity: 1,
    customer_notify: 1,
    notes: { orgId: auth.org.id, plan: plan.id, period: input.period },
  });
  await Organization.updateOne(
    { _id: org._id },
    { $set: { autopay: { subscriptionId: sub.id, plan: plan.id, period: input.period, status: sub.status || 'created', currentEnd: null, cancelAtCycleEnd: false } } }
  );
  return {
    keyId: process.env.RAZORPAY_KEY_ID!,
    subscriptionId: sub.id,
    amount,
    description: `${plan.name} plan · ${input.period} · Autopay`,
    prefill: { name: auth.user.name, email: auth.user.email },
  };
}

// Records one subscription charge (first payment or a renewal). Idempotent per Razorpay payment id.
async function recordSubscriptionCharge(subscriptionId: string, paymentId: string, amount?: number) {
  await connectDB();
  const org = await Organization.findOne({ 'autopay.subscriptionId': subscriptionId });
  if (!org?.autopay?.plan || !org.autopay.period) return false;
  const orderId = `sub_${paymentId}`;
  if (await Payment.exists({ orderId })) return false; // already counted
  const plan = await getPlan(org.autopay.plan);
  const period = org.autopay.period as BillingPeriod;
  try {
    await Payment.create({
      orgId: org._id,
      orderId,
      paymentId,
      subscriptionId,
      plan: org.autopay.plan,
      period,
      amount: amount ?? (plan ? priceOf(plan, period) : 0),
      method: 'subscription',
      status: 'created',
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return false; // a parallel callback/webhook won
    throw err;
  }
  return activate(orderId, paymentId);
}

// Browser callback after the customer authorises Autopay (and pays the first period).
export async function verifyAutopay(auth: AuthContext, input: z.infer<typeof autopayVerifySchema>) {
  const expected = hmac(process.env.RAZORPAY_KEY_SECRET ?? '', `${input.razorpay_payment_id}|${input.razorpay_subscription_id}`);
  if (!safeEqual(expected, input.razorpay_signature)) throw badRequest('Payment verification failed.');
  await connectDB();
  const org = await Organization.findOne({ _id: auth.org.id, 'autopay.subscriptionId': input.razorpay_subscription_id });
  if (!org) throw badRequest('Unknown subscription.');
  if (['created', 'authenticated'].includes(org.autopay?.status ?? '')) {
    await Organization.updateOne({ _id: org._id }, { $set: { 'autopay.status': 'active' } });
  }
  await recordSubscriptionCharge(input.razorpay_subscription_id, input.razorpay_payment_id);
}

// Stops future charges. Paid time already granted is kept.
export async function cancelAutopay(orgId: string, by: { name: string; userId: string | null }) {
  await connectDB();
  const org = await Organization.findById(orgId);
  const sub = org?.autopay;
  if (!org || !sub?.subscriptionId || !LIVE_AUTOPAY.includes(sub.status ?? '') || sub.cancelAtCycleEnd) throw badRequest('Autopay is not on for this workspace.');
  // Not yet authorised → cancel now; otherwise stop at the end of the current paid cycle.
  let immediate = sub.status === 'created';
  try {
    await razorpay(`/subscriptions/${sub.subscriptionId}/cancel`, { cancel_at_cycle_end: immediate ? 0 : 1 });
  } catch (err) {
    if (immediate) throw err;
    // Razorpay only allows end-of-cycle cancellation for active subscriptions; otherwise cancel now.
    await razorpay(`/subscriptions/${sub.subscriptionId}/cancel`, { cancel_at_cycle_end: 0 });
    immediate = true;
  }
  await Organization.updateOne({ _id: org._id }, { $set: immediate ? { 'autopay.status': 'cancelled' } : { 'autopay.cancelAtCycleEnd': true } });
  await logActivity(
    { orgId, userId: by.userId, name: by.name },
    { action: 'billing.autopay_cancelled', category: 'billing', summary: immediate ? 'Cancelled Autopay setup' : 'Turned off Autopay — no further charges; the current paid period continues' }
  );
}

// ---------- Webhooks ----------

type Entity = Record<string, unknown> & { id: string };
interface WebhookEvent {
  event: string;
  payload?: {
    payment?: { entity?: Entity & { order_id?: string; amount?: number } };
    subscription?: { entity?: Entity & { status?: string; current_end?: number | null } };
    payment_link?: { entity?: Entity };
  };
}

// Server-to-server webhook (signature-checked, no login). Configure in Razorpay: payment.captured, order.paid,
// payment_link.paid, subscription.activated, subscription.charged, subscription.pending, subscription.halted,
// subscription.cancelled, subscription.completed.
export async function handleWebhook(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature || !safeEqual(hmac(secret, rawBody), signature)) throw badRequest('Invalid webhook signature.');
  const event = JSON.parse(rawBody) as WebhookEvent;
  const payment = event.payload?.payment?.entity;
  const sub = event.payload?.subscription?.entity;

  if ((event.event === 'payment.captured' || event.event === 'order.paid') && payment?.order_id) {
    await activate(payment.order_id, payment.id);
    return;
  }
  if (event.event === 'payment_link.paid' && event.payload?.payment_link?.entity?.id) {
    await activate(event.payload.payment_link.entity.id, payment?.id ?? '');
    return;
  }
  if (sub?.id && event.event.startsWith('subscription.')) {
    await connectDB();
    const set: Record<string, unknown> = { 'autopay.status': sub.status ?? event.event.split('.')[1] };
    if (sub.current_end) set['autopay.currentEnd'] = new Date(sub.current_end * 1000);
    await Organization.updateOne({ 'autopay.subscriptionId': sub.id }, { $set: set });
    if (event.event === 'subscription.charged' && payment?.id) await recordSubscriptionCharge(sub.id, payment.id, payment.amount);
  }
}

// ---------- History / status ----------

export async function paymentHistory(auth: AuthContext) {
  await connectDB();
  const rows = await Payment.find({ orgId: auth.org.id, status: 'paid' }).sort({ paidAt: -1 }).limit(20).lean();
  return rows.map((p) => ({ id: String(p._id), plan: p.plan, period: p.period, amount: p.amount, method: p.method ?? 'checkout', paidAt: p.paidAt?.toISOString() ?? '' }));
}

export interface AutopayStatus {
  plan: string;
  period: BillingPeriod;
  status: string;
  on: boolean; // charging every period
  cancelAtCycleEnd: boolean;
  currentEnd: string | null;
}

export async function autopayStatus(orgId: string): Promise<AutopayStatus | null> {
  await connectDB();
  const org = await Organization.findById(orgId, { autopay: 1 }).lean();
  const a = org?.autopay;
  if (!a?.subscriptionId || a.status === 'created') return null;
  return {
    plan: a.plan ?? '',
    period: (a.period as BillingPeriod) ?? 'monthly',
    status: a.status ?? 'created',
    on: LIVE_AUTOPAY.includes(a.status ?? '') && !a.cancelAtCycleEnd,
    cancelAtCycleEnd: Boolean(a.cancelAtCycleEnd),
    currentEnd: a.currentEnd ? new Date(a.currentEnd).toISOString() : null,
  };
}

// ---------- Platform admin: payment links + offline payments ----------

export const paymentLinkSchema = z.object({
  plan: z.string().min(1),
  period: z.enum(['monthly', 'yearly']),
  amount: z.number().int().min(100).optional(), // paise; defaults to the plan price
  notify: z.boolean().default(true), // Razorpay emails the link to the owner
});
export const manualPaymentSchema = z.object({
  plan: z.string().min(1),
  period: z.enum(['monthly', 'yearly']),
  amount: z.number().int().min(0).max(100_000_000), // paise
  reference: z.string().trim().max(120).default(''),
  note: z.string().trim().max(300).default(''),
});

// Creates a Razorpay payment link for a workspace's owner. Paying it extends the plan (payment_link.paid).
export async function createPaymentLink(orgId: string, owner: { name: string; email: string }, input: z.infer<typeof paymentLinkSchema>, recordedBy: string) {
  const plan = await getPlan(input.plan);
  if (!plan || isFree(plan)) throw badRequest('Choose a paid plan.');
  const amount = input.amount ?? priceOf(plan, input.period);
  if (amount < 100) throw badRequest('Amount must be at least ₹1.');
  const link = await razorpay<{ id: string; short_url: string }>('/payment_links', {
    amount,
    currency: 'INR',
    description: `${plan.name} plan · ${input.period}`,
    customer: { name: owner.name, email: owner.email },
    notify: { email: input.notify, sms: false },
    reminder_enable: input.notify,
    reference_id: `org_${orgId.slice(-8)}_${Date.now()}`,
    notes: { orgId, plan: plan.id, period: input.period },
  });
  await connectDB();
  await Payment.create({ orgId, orderId: link.id, plan: plan.id, period: input.period, amount, method: 'link', reference: link.short_url, recordedBy });
  return { id: link.id, url: link.short_url, amount };
}

// Records an offline payment as paid and extends the plan.
export async function recordManualPayment(orgId: string, input: z.infer<typeof manualPaymentSchema>, recordedBy: string) {
  const plan = await getPlan(input.plan);
  if (!plan) throw badRequest('Unknown plan.');
  await connectDB();
  const payment = await Payment.create({
    orgId,
    orderId: `manual_${crypto.randomUUID()}`,
    plan: plan.id,
    period: input.period,
    amount: input.amount,
    method: 'manual',
    reference: input.reference,
    note: input.note,
    recordedBy,
    status: 'paid',
    paidAt: new Date(),
  });
  await grantPeriod(payment);
  return String(payment._id);
}
