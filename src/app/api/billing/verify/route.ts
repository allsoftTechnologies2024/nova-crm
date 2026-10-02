import { requireAuthWhileLocked } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { verifyPayment, verifySchema } from '@/lib/services/billing';

export const POST = route(async (req) => {
  const auth = await requireAuthWhileLocked('billing:manage');
  await verifyPayment(auth, await parseBody(req, verifySchema));
});
