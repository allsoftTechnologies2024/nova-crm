import 'server-only';
import { connectDB } from '@/lib/db';
import { PLAN_IDS, type PlanId } from '@/lib/plans';
import { Lead } from '@/models/Lead';
import { Organization } from '@/models/Organization';
import { Payment } from '@/models/Payment';
import { User } from '@/models/User';
import { month } from './_shared';

// Platform-wide totals for the console overview.
export async function platformStats() {
  await connectDB();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [orgs, users, leads, suspended, newOrgs, revenue, aiRows, planRows] = await Promise.all([
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
    Organization.aggregate<{ _id: PlanId; n: number }>([
      // Expired paid plans count as Starter.
      { $project: { plan: { $cond: [{ $and: [{ $ne: ['$plan', 'free'] }, { $gt: ['$planExpiresAt', new Date()] }] }, '$plan', 'free'] } } },
      { $group: { _id: '$plan', n: { $sum: 1 } } },
    ]),
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
    plans: PLAN_IDS.map((p) => ({ plan: p, count: planRows.find((r) => r._id === p)?.n ?? 0 })),
  };
}
