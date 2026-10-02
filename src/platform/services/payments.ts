import 'server-only';
import { connectDB } from '@/lib/db';
import { Organization } from '@/models/Organization';
import { Payment } from '@/models/Payment';
import { iso } from './_shared';

export async function listPayments() {
  await connectDB();
  const rows = await Payment.find().sort({ createdAt: -1 }).limit(200).lean();
  const orgs = await Organization.find({ _id: { $in: rows.map((p) => p.orgId) } }, { name: 1 }).lean();
  return rows.map((p) => ({
    id: String(p._id),
    org: { id: String(p.orgId), name: orgs.find((o) => String(o._id) === String(p.orgId))?.name ?? 'Deleted workspace' },
    plan: p.plan,
    period: p.period,
    amount: p.amount,
    status: p.status,
    orderId: p.orderId,
    paymentId: p.paymentId,
    at: iso((p.paidAt ?? p.createdAt) as Date)!,
  }));
}
