import { requireAuthWhileLocked } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { checkoutSchema, startAutopay } from '@/lib/services/billing';

// Starts a Razorpay subscription (Autopay). Works for a locked workspace so it can pay to unlock.
export const POST = route(async (req) => {
  const auth = await requireAuthWhileLocked('billing:manage');
  return startAutopay(auth, await parseBody(req, checkoutSchema));
});
