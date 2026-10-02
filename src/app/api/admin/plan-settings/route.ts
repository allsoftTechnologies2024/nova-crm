import { requirePlatformAdmin } from '@/platform/auth/session';
import { planSettingsSchema, updatePlanSettings } from '@/platform/services/plans';
import { parseBody, route } from '@/lib/http';

export const PATCH = route(async (req) => {
  const actor = await requirePlatformAdmin();
  await updatePlanSettings(actor, await parseBody(req, planSettingsSchema));
});
