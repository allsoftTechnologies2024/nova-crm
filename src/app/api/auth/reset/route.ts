import { startSession } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { resetPassword, resetSchema } from '@/lib/services/account';

export const POST = route(async (req) => {
  const { userId, orgId } = await resetPassword(await parseBody(req, resetSchema));
  await startSession(userId, orgId);
});
