import { parseBody, route } from '@/lib/http';
import { requirePlatformAdmin } from '@/platform/auth/session';
import { addManualPayment, manualPaymentSchema } from '@/platform/services/billing';

export const POST = route<{ id: string }>(async (req, { params }) => {
  const actor = await requirePlatformAdmin();
  await addManualPayment(actor, (await params).id, await parseBody(req, manualPaymentSchema));
});
