import { parseBody, route } from '@/lib/http';
import { requirePlatformAdmin } from '@/platform/auth/session';
import { paymentLinkSchema, sendPaymentLink } from '@/platform/services/billing';

export const POST = route<{ id: string }>(async (req, { params }) => {
  const actor = await requirePlatformAdmin();
  return sendPaymentLink(actor, (await params).id, await parseBody(req, paymentLinkSchema));
});
