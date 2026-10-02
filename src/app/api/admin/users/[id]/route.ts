import { requirePlatformAdmin } from '@/platform/auth/session';
import { parseBody, route } from '@/lib/http';
import { updateUser, userUpdateSchema } from '@/platform/services/users';

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const actor = await requirePlatformAdmin();
  await updateUser(actor, (await params).id, await parseBody(req, userUpdateSchema));
});
