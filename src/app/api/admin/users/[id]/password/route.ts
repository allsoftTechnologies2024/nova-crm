import { requirePlatformAdmin } from '@/platform/auth/session';
import { route } from '@/lib/http';
import { resetUserPassword } from '@/platform/services/users';

// Returns the temporary password once; it is never stored in plain text.
export const POST = route<{ id: string }>(async (_req, { params }) => {
  const actor = await requirePlatformAdmin();
  return { password: await resetUserPassword(actor, (await params).id) };
});
