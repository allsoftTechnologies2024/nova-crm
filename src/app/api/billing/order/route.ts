import { requireAuthWhileLocked } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { checkoutSchema, createOrder } from '@/lib/services/billing';

export const POST = route(async (req) => {
  const auth = await requireAuthWhileLocked('billing:manage');
  return createOrder(auth, await parseBody(req, checkoutSchema));
});
