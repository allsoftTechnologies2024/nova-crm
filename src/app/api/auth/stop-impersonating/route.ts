import { endSession, getAuth } from '@/lib/auth/session';
import { badRequest, route } from '@/lib/http';

// Ends a support session. The platform admin's own (separate) admin cookie is untouched,
// so they land back in the console.
export const POST = route(async () => {
  const auth = await getAuth();
  if (!auth?.impersonatedBy) throw badRequest('Not in a support session.');
  await endSession();
});
