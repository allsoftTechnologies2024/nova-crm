import { requirePlatformAdmin } from '@/platform/auth/session';
import { parseBody, route } from '@/lib/http';
import { createAdmin, newAdminSchema } from '@/platform/services/admins';

export const POST = route(async (req) => {
  const actor = await requirePlatformAdmin();
  await createAdmin(actor, await parseBody(req, newAdminSchema));
});
