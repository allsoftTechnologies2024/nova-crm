// Subscription plans. Prices are in INR paise for Razorpay; limits are enforced server-side.

export const PLAN_IDS = ['free', 'pro', 'business'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface Plan {
  id: PlanId;
  name: string;
  pricePaise: number; // per month
  tagline: string;
  limits: { seats: number; leads: number; aiCredits: number }; // aiCredits per month; Infinity = unlimited
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Starter',
    pricePaise: 0,
    tagline: 'For solo founders trying AI-first selling',
    limits: { seats: 2, leads: 100, aiCredits: 50 },
    features: ['2 team members', '100 leads', '50 AI actions / month', 'Kanban pipeline'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    pricePaise: 99900,
    tagline: 'For growing sales teams',
    limits: { seats: 10, leads: 5000, aiCredits: 1000 },
    features: ['10 team members', '5,000 leads', '1,000 AI actions / month', 'AI Copilot with actions', 'Role-based access'],
  },
  business: {
    id: 'business',
    name: 'Business',
    pricePaise: 249900,
    tagline: 'For teams that run on AI',
    limits: { seats: Infinity, leads: Infinity, aiCredits: 5000 },
    features: ['Unlimited members', 'Unlimited leads', '5,000 AI actions / month', 'Priority support'],
  },
};

export const BILLING_PERIODS = { monthly: { months: 1, discount: 0 }, yearly: { months: 12, discount: 0.2 } } as const;
export type BillingPeriod = keyof typeof BILLING_PERIODS;

export function priceFor(plan: PlanId, period: BillingPeriod) {
  const { months, discount } = BILLING_PERIODS[period];
  return Math.round(PLANS[plan].pricePaise * months * (1 - discount));
}

export const formatINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

// A paid plan that has run out falls back to Starter limits.
export function activePlan(org: { plan: PlanId; planExpiresAt?: Date | string | null }): Plan {
  if (org.plan === 'free') return PLANS.free;
  if (!org.planExpiresAt || new Date(org.planExpiresAt) < new Date()) return PLANS.free;
  return PLANS[org.plan];
}

export const limitLabel = (n: number) => (Number.isFinite(n) ? n.toLocaleString('en-IN') : 'Unlimited');
