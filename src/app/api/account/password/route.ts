import { requireAuth, startSession } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { changePassword, passwordChangeSchema } from '@/lib/services/account';

// Other sessions are signed out; this one gets a fresh cookie so the user stays signed in here.
export const POST = route(async (req) => {
  const auth = await requireAuth();
  const { userId, orgId } = await changePassword(auth, await parseBody(req, passwordChangeSchema));
  await startSession(userId, orgId);
});
