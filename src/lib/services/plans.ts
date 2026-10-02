import 'server-only';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db';
import { LOCK_PLAN_KEY, fromStoredLimit, type Plan, type PlanSource, type PlanStatus } from '@/lib/plans';
import { PlanModel, type PlanDoc } from '@/models/Plan';
import { PlatformSettings } from '@/models/PlatformSettings';

// Plans are read on nearly every request (limits), so they're cached in memory. Every change made in the
// platform console bumps `catalogVersion` in the database; each request does one tiny indexed lookup of
// that number and reloads when it differs — so every server (and every Next.js module copy) is current.
// The cache lives on globalThis so API routes and pages in the same process share it.
type Cache = { version: number; plans: Plan[]; settings: Settings };
const store = globalThis as unknown as { __planCatalog?: Cache | null };

export interface Settings {
  trial: { enabled: boolean; planKey: string; days: number };
  fallbackPlanKey: string;
}

// Starting catalogue, created once when the database has no plans (the platform admin can change all of it).
// There is no free plan: new workspaces get a free trial, then must subscribe.
const DEFAULT_PLANS = [
  {
    key: 'pro',
    name: 'Pro',
    tagline: 'For growing sales teams',
    priceMonthly: 99900,
    priceYearly: 959000,
    limits: { seats: 10, leads: 5000, aiCredits: 1000 },
    features: ['10 team members', '5,000 leads', '1,000 AI actions / month', 'AI Copilot with actions', 'Role-based access'],
    popular: true,
    sortOrder: 1,
  },
  {
    key: 'business',
    name: 'Business',
    tagline: 'For teams that run on AI',
    priceMonthly: 249900,
    priceYearly: 2399000,
    limits: { seats: -1, leads: -1, aiCredits: 5000 },
    features: ['Unlimited members', 'Unlimited leads', '5,000 AI actions / month', 'Priority support'],
    sortOrder: 2,
  },
];

// What a locked workspace runs on: no trial, no subscription and no fallback plan. Zero limits; the app shows
// a choose-a-plan screen and the API refuses everything except billing and account routes.
const LOCKED_PLAN: Plan = {
  id: LOCK_PLAN_KEY,
  name: 'No plan',
  tagline: '',
  priceMonthly: 0,
  priceYearly: 0,
  limits: { seats: 0, leads: 0, aiCredits: 0 },
  features: [],
  active: false,
  public: false,
  popular: false,
  sortOrder: 999,
};

export const toPlan = (p: PlanDoc): Plan => ({
  id: p.key,
  name: p.name,
  tagline: p.tagline ?? '',
  priceMonthly: p.priceMonthly ?? 0,
  priceYearly: p.priceYearly ?? 0,
  limits: { seats: fromStoredLimit(p.limits?.seats), leads: fromStoredLimit(p.limits?.leads), aiCredits: fromStoredLimit(p.limits?.aiCredits) },
  features: p.features ?? [],
  active: p.active ?? true,
  public: p.public ?? true,
  popular: p.popular ?? false,
  sortOrder: p.sortOrder ?? 0,
});

async function load(): Promise<Cache> {
  await connectDB();
  const stamp = await PlatformSettings.findOne({ key: 'global' }, { catalogVersion: 1 }).lean();
  const cached = store.__planCatalog;
  if (cached && stamp && (stamp.catalogVersion ?? 0) === cached.version) return cached;
  if ((await PlanModel.estimatedDocumentCount()) === 0) {
    await PlanModel.insertMany(DEFAULT_PLANS).catch(() => {}); // a parallel request may have inserted them
  }
  const s =
    (await PlatformSettings.findOne({ key: 'global' }).lean()) ??
    (await PlatformSettings.findOneAndUpdate({ key: 'global' }, { $setOnInsert: { key: 'global' } }, { upsert: true, new: true }).lean());
  const plans = (await PlanModel.find().sort({ sortOrder: 1, priceMonthly: 1 }).lean()).map(toPlan);
  const cache: Cache = {
    version: s?.catalogVersion ?? 0,
    plans,
    settings: {
      trial: { enabled: s?.trial?.enabled ?? true, planKey: s?.trial?.planKey ?? 'pro', days: s?.trial?.days ?? 30 },
      fallbackPlanKey: s?.fallbackPlanKey ?? LOCK_PLAN_KEY,
    },
  };
  store.__planCatalog = cache;
  return cache;
}

// Call after any plan or trial/fallback change (platform console).
export async function invalidatePlans() {
  await PlatformSettings.updateOne({ key: 'global' }, { $inc: { catalogVersion: 1 } }, { upsert: true });
  store.__planCatalog = null;
  try {
    revalidatePath('/'); // the public pricing section
  } catch {
    // outside a request (scripts) there's nothing to revalidate
  }
}

export async function allPlans() {
  return (await load()).plans;
}
export async function getSettings() {
  return (await load()).settings;
}
export async function getPlan(key: string) {
  return (await load()).plans.find((p) => p.id === key) ?? null;
}

// Plans customers can see and buy (pricing page + Billing).
export async function publicPlans() {
  return (await allPlans()).filter((p) => p.active && p.public);
}

// The plan workspaces drop to when nothing else applies; null = lock them (also if the plan is missing or disabled).
export async function fallbackPlan() {
  const { plans, settings } = await load();
  const plan = plans.find((p) => p.id === settings.fallbackPlanKey);
  return plan?.active ? plan : null;
}

// The plan a workspace actually runs on right now, plus a description of its state for the UI.
export async function effectivePlan(org: { plan?: string | null; planExpiresAt?: Date | null; planSource?: string | null }): Promise<{ plan: Plan; status: PlanStatus }> {
  const assigned = org.plan ? await getPlan(org.plan) : null;
  const source = (org.planSource as PlanSource) || 'free';
  const expiresAt = org.planExpiresAt ? new Date(org.planExpiresAt) : null;
  const expired = Boolean(expiresAt && expiresAt <= new Date());
  // A dated plan (trial / paid / admin grant) runs until it expires; an undated plan runs indefinitely.
  // A plan that was never paid for or granted ('free' source) stops working once the platform disables it.
  const usable = Boolean(assigned && !expired && (assigned.active || source !== 'free'));
  const fallback = usable ? null : await fallbackPlan();
  const plan = usable ? assigned! : (fallback ?? LOCKED_PLAN);
  const daysLeft = expiresAt && !expired ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000)) : null;
  return {
    plan,
    status: {
      source,
      assigned: { id: assigned?.id ?? org.plan ?? '', name: assigned?.name ?? 'Unknown plan' },
      expiresAt: expiresAt?.toISOString() ?? null,
      expired,
      locked: !usable && !fallback,
      onTrial: source === 'trial' && !expired,
      daysLeft,
    },
  };
}

// What a brand-new workspace starts on: the free trial if enabled, otherwise the fallback plan (or locked).
export async function initialPlanFor(): Promise<{ plan: string; planExpiresAt: Date | null; planSource: PlanSource; trialUsed: boolean }> {
  const settings = await getSettings();
  const trial = settings.trial.enabled ? await getPlan(settings.trial.planKey) : null;
  if (trial?.active) {
    return { plan: trial.id, planExpiresAt: new Date(Date.now() + settings.trial.days * 86_400_000), planSource: 'trial', trialUsed: true };
  }
  return { plan: (await fallbackPlan())?.id ?? LOCK_PLAN_KEY, planExpiresAt: null, planSource: 'free', trialUsed: false };
}
