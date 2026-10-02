import { HttpError, parseBody, route } from '@/lib/http';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { forgotSchema, requestPasswordReset } from '@/lib/services/account';

// Always answers the same way, whether or not the email has an account.
export const POST = route(async (req) => {
  const { email } = await parseBody(req, forgotSchema);
  rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60_000);
  // The link goes into an email, so it must come from config — a spoofed Host header could otherwise
  // send the reset token to an attacker's domain. (Dev falls back to the request origin.)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? '' : new URL(req.url).origin);
  if (!appUrl) throw new HttpError(503, 'Password reset is not configured (NEXT_PUBLIC_APP_URL).');
  await requestPasswordReset(email, appUrl.replace(/\/$/, ''));
  return { ok: true };
});
