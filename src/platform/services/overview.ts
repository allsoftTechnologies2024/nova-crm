import 'server-only';
import { connectDB } from '@/lib/db';
import { allPlans, getSettings } from '@/lib/services/plans';
import { Lead } from '@/models/Lead';
import { Organization } from '@/models/Organization';
import { Payment } from '@/models/Payment';
import { User } from '@/models/User';
import { month } from './_shared';

// Platform-wide totals for the console overview.
export async function platformStats() {
  await connectDB();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [plans, settings] = await Promise.all([allPlans(), getSettings()]);
  const now = new Date();
  const [orgs, users, leads, suspended, newOrgs, revenue, aiRows, planRows, trials] = await Promise.all([
    Organization.countDocuments(),
    User.countDocuments({ active: true }),
    Lead.countDocuments(),
    Organization.countDocuments({ suspended: true }),
    Organization.countDocuments({ createdAt: { $gte: since } }),
    Payment.aggregate<{ total: number; last30: number }>([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' }, last30: { $sum: { $cond: [{ $gte: ['$paidAt', since] }, '$amount', 0] } } } },
    ]),
    Organization.aggregate<{ used: number }>([{ $match: { 'aiUsage.month': month() } }, { $group: { _id: null, used: { $sum: '$aiUsage.count' } } }]),
    Organization.aggregate<{ _id: string; n: number }>([
      // Effective plan: a dated plan that has ended counts as the fallback plan.
      { $project: { plan: { $cond: [{ $or: [{ $eq: ['$planExpiresAt', null] }, { $gt: ['$planExpiresAt', now] }] }, '$plan', settings.fallbackPlanKey] } } },
      { $group: { _id: '$plan', n: { $sum: 1 } } },
    ]),
    Organization.countDocuments({ planSource: 'trial', planExpiresAt: { $gt: now } }),
  ]);
  return {
    orgs,
    users,
    leads,
    suspended,
    newOrgs,
    revenue: revenue[0]?.total ?? 0,
    revenue30: revenue[0]?.last30 ?? 0,
    aiThisMonth: aiRows[0]?.used ?? 0,
    trials,
    plans: plans.map((p) => ({ plan: p.id, name: p.name, count: planRows.find((r) => r._id === p.id)?.n ?? 0 })),
  };
}
