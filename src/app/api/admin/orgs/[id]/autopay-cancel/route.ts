import { route } from '@/lib/http';
import { requirePlatformAdmin } from '@/platform/auth/session';
import { adminCancelAutopay } from '@/platform/services/billing';

export const POST = route<{ id: string }>(async (_req, { params }) => {
  const actor = await requirePlatformAdmin();
  await adminCancelAutopay(actor, (await params).id);
});
