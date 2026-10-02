import BillingView from '@/components/app/BillingView';
import { aiUsage } from '@/lib/ai';
import { requirePage } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { paymentHistory, razorpayConfigured } from '@/lib/services/billing';
import { publicPlans } from '@/lib/services/plans';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';

export const metadata = { title: 'Billing' };

export default async function BillingPage() {
  const auth = await requirePage('billing:manage');
  await connectDB();
  const [leads, seats, payments, plans] = await Promise.all([
    Lead.countDocuments({ orgId: auth.org.id }),
    User.countDocuments({ orgId: auth.org.id, active: true }),
    paymentHistory(auth),
    publicPlans(),
  ]);
  const toLimit = (n: number) => (Number.isFinite(n) ? n : null);
  const ai = aiUsage(auth);

  return (
    <BillingView
      plans={plans}
      current={{ plan: auth.plan.id, name: auth.plan.name, status: auth.planStatus }}
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
