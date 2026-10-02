// Plan types + pure helpers (safe for client components). Plans themselves live in the database and are
// managed from the platform console; server code loads them via lib/services/plans.ts.

export type PlanId = string; // the plan's key, e.g. "pro"

export interface Limits {
  seats: number; // Infinity = unlimited
  leads: number;
  aiCredits: number; // per month
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthly: number; // paise; 0 = free
  priceYearly: number; // paise, total for 12 months
  limits: Limits;
  features: string[];
  active: boolean; // can be chosen for new sign-ups / purchases
  public: boolean; // shown on the pricing page and in Billing
  popular: boolean; // highlighted card
  sortOrder: number;
}

// Fallback value meaning "no free plan": a workspace without a trial or subscription is locked until it pays.
// Plan keys must start with a letter or digit, so this can never collide with a real plan.
export const LOCK_PLAN_KEY = '__lock__';

// How the workspace got its current plan.
export type PlanSource = 'free' | 'trial' | 'paid' | 'admin';

export interface PlanStatus {
  source: PlanSource;
  assigned: { id: PlanId; name: string }; // what the workspace is set to
  expiresAt: string | null; // trial / subscription end
  expired: boolean; // past expiresAt → running on the fallback plan
  locked: boolean; // no usable plan and no fallback: read-only until the workspace subscribes
  onTrial: boolean;
  daysLeft: number | null;
}

export const BILLING_PERIODS = { monthly: { months: 1, label: 'Monthly' }, yearly: { months: 12, label: 'Yearly' } } as const;
export type BillingPeriod = keyof typeof BILLING_PERIODS;

export const priceOf = (plan: Pick<Plan, 'priceMonthly' | 'priceYearly'>, period: BillingPeriod) => (period === 'yearly' ? plan.priceYearly : plan.priceMonthly);
export const isFree = (plan: Pick<Plan, 'priceMonthly'>) => plan.priceMonthly <= 0;

// Yearly discount shown on the toggle, e.g. 20 (%). 0 when yearly isn't cheaper.
export function yearlySavingPct(plan: Pick<Plan, 'priceMonthly' | 'priceYearly'>) {
  const full = plan.priceMonthly * 12;
  return full > 0 && plan.priceYearly < full ? Math.round((1 - plan.priceYearly / full) * 100) : 0;
}

export const formatINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
export const limitLabel = (n: number) => (Number.isFinite(n) ? n.toLocaleString('en-IN') : 'Unlimited');

// Stored limits use -1 for "unlimited"; at runtime that's Infinity.
export const fromStoredLimit = (n: number | null | undefined) => (n == null || n < 0 ? Infinity : n);
export const toStoredLimit = (n: number) => (Number.isFinite(n) ? n : -1);
