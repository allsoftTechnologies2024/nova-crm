import { requirePlatformAdmin, startAdminSession } from '@/platform/auth/session';
import { parseBody, route } from '@/lib/http';
import { adminPasswordSchema, changeAdminPassword } from '@/platform/services/admins';

// Signs out other admin sessions; this browser gets a fresh admin cookie.
export const POST = route(async (req) => {
  const actor = await requirePlatformAdmin();
  await changeAdminPassword(actor, await parseBody(req, adminPasswordSchema));
  await startAdminSession(actor.id);
});
