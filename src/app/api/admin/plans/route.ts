import { requirePlatformAdmin } from '@/platform/auth/session';
import { createPlan, newPlanSchema } from '@/platform/services/plans';
import { parseBody, route } from '@/lib/http';

export const POST = route(async (req) => {
  const actor = await requirePlatformAdmin();
  await createPlan(actor, await parseBody(req, newPlanSchema));
});
