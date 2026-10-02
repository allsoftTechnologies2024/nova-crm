import { requireAuthWhileLocked } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { autopayVerifySchema, verifyAutopay } from '@/lib/services/billing';

export const POST = route(async (req) => {
  const auth = await requireAuthWhileLocked('billing:manage');
  await verifyAutopay(auth, await parseBody(req, autopayVerifySchema));
});
