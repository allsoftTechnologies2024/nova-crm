import { z } from 'zod';
import { requirePlatformAdmin } from '@/platform/auth/session';
import { startSession } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { supportSessionTarget } from '@/platform/services/users';

// Support session: a workspace cookie for the target user, marked with the admin id. The admin cookie is untouched.
export const POST = route(async (req) => {
  const actor = await requirePlatformAdmin();
  const { userId } = await parseBody(req, z.object({ userId: z.string() }));
  const target = await supportSessionTarget(actor, userId);
  await startSession(target.userId, target.orgId, actor.id);
});
