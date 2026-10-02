import 'server-only';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { badRequest, notFound } from '@/lib/http';
import { LOCK_PLAN_KEY } from '@/lib/plans';
import { allPlans, getSettings, invalidatePlans } from '@/lib/services/plans';
import { Organization } from '@/models/Organization';
import { PlanModel } from '@/models/Plan';
import { PlatformSettings } from '@/models/PlatformSettings';
import type { AdminContext } from '../auth/session';
import { audit } from './audit';

// Platform-side management of the plan catalogue and trial / fallback rules.

const money = z.number().int().min(0).max(100_000_000); // paise
const limit = z.number().int().min(-1).max(10_000_000); // -1 = unlimited
// No defaults here: an update must only touch the fields it sends (Zod applies .default() even in .partial()).
const planFields = {
  name: z.string().trim().min(1).max(40),
  tagline: z.string().trim().max(120),
  priceMonthly: money,
  priceYearly: money,
  limits: z.object({ seats: limit, leads: limit, aiCredits: limit }),
  features: z.array(z.string().trim().min(1).max(80)).max(12),
  active: z.boolean(),
  public: z.boolean(),
  popular: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
};
export const newPlanSchema = z.object({
  key: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,30}$/, 'Use 2-31 lowercase letters, numbers or dashes'),
  ...planFields,
  tagline: planFields.tagline.default(''),
  features: planFields.features.default([]),
  active: planFields.active.default(true),
  public: planFields.public.default(true),
  popular: planFields.popular.default(false),
  sortOrder: planFields.sortOrder.default(0),
});
export const planUpdateSchema = z.object(planFields).partial();
export const planSettingsSchema = z.object({
  trial: z.object({ enabled: z.boolean(), planKey: z.string().trim().min(1), days: z.number().int().min(1).max(365) }),
  fallbackPlanKey: z.string().trim().min(1),
});

// Workspaces currently on each plan (an ended trial/subscription counts toward the fallback plan instead).
async function usage() {
  const now = new Date();
  const rows = await Organization.aggregate<{ _id: string; n: number; trials: number }>([
    { $match: { $or: [{ planExpiresAt: null }, { planExpiresAt: { $gt: now } }] } },
    { $group: { _id: '$plan', n: { $sum: 1 }, trials: { $sum: { $cond: [{ $eq: ['$planSource', 'trial'] }, 1, 0] } } } },
  ]);
  return new Map(rows.map((r) => [r._id, { workspaces: r.n, trials: r.trials }]));
}

export async function plansOverview() {
  await connectDB();
  const [plans, settings, used] = await Promise.all([allPlans(), getSettings(), usage()]);
  return { plans: plans.map((p) => ({ ...p, usage: used.get(p.id) ?? { workspaces: 0, trials: 0 } })), settings };
}

async function assertNotRequired(key: string, what: string) {
  const s = await getSettings();
  if (s.fallbackPlanKey === key) throw badRequest(`This is the fallback plan — choose another fallback before you ${what} it.`);
  if (s.trial.enabled && s.trial.planKey === key) throw badRequest(`This is the free-trial plan — change the trial plan before you ${what} it.`);
}

async function clearOtherPopular(key: string) {
  await PlanModel.updateMany({ key: { $ne: key } }, { $set: { popular: false } });
}

export async function createPlan(actor: AdminContext, input: z.infer<typeof newPlanSchema>) {
  await connectDB();
  if (await PlanModel.exists({ key: input.key })) throw badRequest('A plan with that key already exists.');
  await PlanModel.create(input);
  if (input.popular) await clearOtherPopular(input.key);
  await invalidatePlans();
  await audit(actor, 'plan.create', 'platform', input.key, `Created plan ${input.name} (${input.key})`);
}

export async function updatePlan(actor: AdminContext, key: string, input: z.infer<typeof planUpdateSchema>) {
  await connectDB();
  const plan = await PlanModel.findOne({ key });
  if (!plan) throw notFound('Plan not found.');
  if (input.active === false && plan.active) await assertNotRequired(key, 'disable');
  plan.set(input);
  await plan.save();
  if (input.popular) await clearOtherPopular(key);
  await invalidatePlans();
  await audit(actor, 'plan.update', 'platform', key, `Updated plan ${plan.name}: ${Object.keys(input).join(', ')}`);
}

export async function deletePlan(actor: AdminContext, key: string) {
  await connectDB();
  const plan = await PlanModel.findOne({ key });
  if (!plan) throw notFound('Plan not found.');
  await assertNotRequired(key, 'delete');
  const inUse = await Organization.countDocuments({ plan: key });
  if (inUse) throw badRequest(`${inUse} workspace(s) are on this plan. Disable it instead (hides it from new buyers), or move them first.`);
  await plan.deleteOne();
  await invalidatePlans();
  await audit(actor, 'plan.delete', 'platform', key, `Deleted plan ${plan.name} (${key})`);
}

export async function updatePlanSettings(actor: AdminContext, input: z.infer<typeof planSettingsSchema>) {
  await connectDB();
  const plans = await allPlans();
  const lock = input.fallbackPlanKey === LOCK_PLAN_KEY;
  if (lock) {
    // Without a fallback, a sign-up with no trial would be locked the moment it's created.
    if (!input.trial.enabled) throw badRequest('Turn the free trial on, or choose a fallback plan. Otherwise new sign-ups are locked immediately.');
  } else {
    const fallback = plans.find((p) => p.id === input.fallbackPlanKey);
    if (!fallback) throw badRequest('Choose an existing fallback plan.');
    if (!fallback.active) throw badRequest('The fallback plan must be enabled.');
  }
  if (input.trial.enabled) {
    const trial = plans.find((p) => p.id === input.trial.planKey);
    if (!trial || !trial.active) throw badRequest('Choose an enabled plan for the free trial.');
  }
  await PlatformSettings.updateOne({ key: 'global' }, { $set: { trial: input.trial, fallbackPlanKey: input.fallbackPlanKey } }, { upsert: true });
  await invalidatePlans();
  const t = input.trial;
  await audit(actor, 'plan.settings', 'platform', 'global', `Trial ${t.enabled ? `on: ${t.days} days of ${t.planKey}` : 'off'} · ${lock ? 'no fallback (lock workspace)' : `fallback plan ${input.fallbackPlanKey}`}`);
}
