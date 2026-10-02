import { requireAuth } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { profileSchema, updateProfile } from '@/lib/services/account';

export const PATCH = route(async (req) => {
  const auth = await requireAuth();
  await updateProfile(auth, await parseBody(req, profileSchema));
});
