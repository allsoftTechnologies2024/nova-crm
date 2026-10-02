import { z } from 'zod';
import { requirePlatformAdmin } from '@/platform/auth/session';
import { parseBody, route } from '@/lib/http';
import { setAdminActive } from '@/platform/services/admins';

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const actor = await requirePlatformAdmin();
  const { active } = await parseBody(req, z.object({ active: z.boolean() }));
  await setAdminActive(actor, (await params).id, active);
});
