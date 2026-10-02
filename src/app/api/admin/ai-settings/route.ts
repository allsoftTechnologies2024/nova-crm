import { parseBody, route } from '@/lib/http';
import { requirePlatformAdmin } from '@/platform/auth/session';
import { aiSettingsSchema, updateAiSettings } from '@/platform/services/ai';

export const PATCH = route(async (req) => {
  const actor = await requirePlatformAdmin();
  await updateAiSettings(actor, await parseBody(req, aiSettingsSchema));
});
