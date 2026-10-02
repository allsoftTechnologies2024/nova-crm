import { startAdminSession } from '@/platform/auth/session';
import { adminLoginSchema, authenticateAdmin } from '@/platform/services/admins';
import { parseBody, route } from '@/lib/http';
import { clientIp, rateLimit } from '@/lib/rate-limit';

// Platform console sign-in. Completely separate from workspace accounts.
export const POST = route(async (req) => {
  const input = await parseBody(req, adminLoginSchema);
  // Stricter than workspace login: the console controls every workspace.
  rateLimit(`admin-login:${clientIp(req)}`, 10, 15 * 60_000);
  rateLimit(`admin-login:${input.email.toLowerCase()}`, 5, 15 * 60_000);
  const adminId = await authenticateAdmin(input);
  await startAdminSession(adminId);
});
