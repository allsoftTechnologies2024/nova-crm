import { route } from '@/lib/http';
import { handleWebhook } from '@/lib/services/billing';

// Razorpay → Settings → Webhooks: point at /api/billing/webhook, events payment.captured + order.paid.
export const POST = route(async (req) => {
  await handleWebhook(await req.text(), req.headers.get('x-razorpay-signature'));
});
