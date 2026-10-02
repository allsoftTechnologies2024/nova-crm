import 'server-only';
import crypto from 'node:crypto';
import { z } from 'zod';
import type { AuthContext } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { badRequest, HttpError } from '@/lib/http';
import { BILLING_PERIODS, isFree, priceOf } from '@/lib/plans';
import { getPlan } from './plans';
import { Organization } from '@/models/Organization';
import { Payment } from '@/models/Payment';
import { logActivity, systemActor } from './activity';

export const checkoutSchema = z.object({ plan: z.string().trim().min(1).max(60), period: z.enum(['monthly', 'yearly']) });
export const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const razorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const safeEqual = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const hmac = (secret: string, payload: string) => crypto.createHmac('sha256', secret).update(payload).digest('hex');

// Creates a Razorpay order (REST API — no SDK needed) and records it.
export async function createOrder(auth: AuthContext, input: z.infer<typeof checkoutSchema>) {
  if (!razorpayConfigured()) throw new HttpError(503, 'Payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  // Only plans the platform currently sells: enabled, visible and paid.
  const plan = await getPlan(input.plan);
  if (!plan || !plan.active || !plan.public || isFree(plan)) throw badRequest('That plan is not available.');
  const amount = priceOf(plan, input.period);
  if (amount <= 0) throw badRequest('That billing period is not available for this plan.');
  const basic = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt: `org_${auth.org.id.slice(-8)}_${Date.now()}`,
      notes: { orgId: auth.org.id, plan: input.plan, period: input.period },
    }),
  });
  const order = (await res.json()) as { id?: string; error?: { description?: string } };
  if (!res.ok || !order.id) throw new HttpError(502, order.error?.description || 'Could not start the payment.');
  await connectDB();
  await Payment.create({ orgId: auth.org.id, orderId: order.id, plan: input.plan, period: input.period, amount });
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

// Marks the order paid exactly once and extends the plan. Safe to call from both callback and webhook.
async function activate(orderId: string, paymentId: string) {
  await connectDB();
  const payment = await Payment.findOneAndUpdate(
    { orderId, status: 'created' },
    { $set: { status: 'paid', paymentId, paidAt: new Date() } },
    { new: true }
  );
  if (!payment) return false; // unknown or already activated
  const org = await Organization.findById(payment.orgId);
  if (!org) return false;
  // Renewing the same plan stacks onto the remaining time; a new plan starts now.
  const now = new Date();
  const current = org.plan === payment.plan && org.planExpiresAt && org.planExpiresAt > now ? org.planExpiresAt : now;
  const expires = new Date(current);
  expires.setMonth(expires.getMonth() + BILLING_PERIODS[payment.period as keyof typeof BILLING_PERIODS].months);
  org.plan = payment.plan;
  org.planExpiresAt = expires;
  org.planSource = 'paid';
  await org.save();
  await logActivity(systemActor(String(org._id)), {
    action: 'billing.paid',
    category: 'billing',
    summary: `Payment received: ${(await getPlan(payment.plan))?.name ?? payment.plan} plan (${payment.period}) · ₹${(payment.amount / 100).toLocaleString('en-IN')} — active until ${expires.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    entity: { type: 'payment', id: payment.orderId, label: payment.orderId },
    meta: { amount: payment.amount },
  });
  return true;
}

// Browser callback from Razorpay Checkout: verify the signature, then activate.
export async function verifyPayment(auth: AuthContext, input: z.infer<typeof verifySchema>) {
  const expected = hmac(process.env.RAZORPAY_KEY_SECRET ?? '', `${input.razorpay_order_id}|${input.razorpay_payment_id}`);
  if (!safeEqual(expected, input.razorpay_signature)) throw badRequest('Payment verification failed.');
  await connectDB();
  if (!(await Payment.exists({ orderId: input.razorpay_order_id, orgId: auth.org.id }))) throw badRequest('Unknown order.');
  await activate(input.razorpay_order_id, input.razorpay_payment_id);
}

// Server-to-server webhook (payment.captured / order.paid): the source of truth if the browser closes early.
export async function handleWebhook(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature || !safeEqual(hmac(secret, rawBody), signature)) throw badRequest('Invalid webhook signature.');
  const event = JSON.parse(rawBody) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string; status: string } } };
  };
  const payment = event.payload?.payment?.entity;
  if ((event.event === 'payment.captured' || event.event === 'order.paid') && payment?.order_id) {
    await activate(payment.order_id, payment.id);
  }
}

export async function paymentHistory(auth: AuthContext) {
  await connectDB();
  const rows = await Payment.find({ orgId: auth.org.id, status: 'paid' }).sort({ paidAt: -1 }).limit(20).lean();
  return rows.map((p) => ({ id: String(p._id), plan: p.plan, period: p.period, amount: p.amount, paidAt: p.paidAt?.toISOString() ?? '' }));
}
