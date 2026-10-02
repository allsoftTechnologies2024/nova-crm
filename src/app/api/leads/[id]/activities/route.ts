import { requireAuth } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { activityInputSchema, addActivity } from '@/lib/services/leads';

export const POST = route<{ id: string }>(async (req, { params }) => {
  const auth = await requireAuth('lead:update');
  return { lead: await addActivity(auth, (await params).id, await parseBody(req, activityInputSchema)) };
});
