import BillingView from '@/components/app/BillingView';
import { aiUsage } from '@/lib/ai';
import { requirePage } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { paymentHistory, razorpayConfigured } from '@/lib/services/billing';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';

export const metadata = { title: 'Billing' };

export default async function BillingPage() {
  const auth = await requirePage('billing:manage');
  await connectDB();
  const [leads, seats, payments] = await Promise.all([
    Lead.countDocuments({ orgId: auth.org.id }),
    User.countDocuments({ orgId: auth.org.id, active: true }),
    paymentHistory(auth),
  ]);
  const toLimit = (n: number) => (Number.isFinite(n) ? n : null);
  const ai = aiUsage(auth);

  return (
    <BillingView
      current={{
        plan: auth.plan.id,
        name: auth.plan.name,
        expiresAt: auth.plan.id === 'free' ? null : (auth.org.planExpiresAt?.toISOString() ?? null),
        expired: auth.org.plan !== 'free' && auth.plan.id === 'free',
      }}
      usage={{
        seats: { used: seats, limit: toLimit(auth.plan.limits.seats) },
        leads: { used: leads, limit: toLimit(auth.plan.limits.leads) },
        ai: { used: ai.used, limit: toLimit(ai.limit) },
      }}
      payments={payments}
      configured={razorpayConfigured()}
    />
  );
}
