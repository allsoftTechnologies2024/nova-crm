import { z } from 'zod';
import { modelChoices } from '@/lib/ai';
import { PROVIDERS, modelKey } from '@/lib/ai/models';
import { requireAuth } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { badRequest, forbidden, parseBody, route } from '@/lib/http';
import { actorOf, logActivity } from '@/lib/services/activity';
import { Organization } from '@/models/Organization';

const schema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  ai: z.object({ provider: z.enum(['claude', 'gemini']), model: z.string() }).optional(),
});

export const PATCH = route(async (req) => {
  const auth = await requireAuth('settings:manage');
  const { name, ai } = await parseBody(req, schema);
  if (ai) {
    if (!PROVIDERS[ai.provider].models[ai.model]) throw badRequest('Unknown AI model.');
    if (auth.org.aiPolicy.locked) throw forbidden('Your AI model is managed by the platform.');
    const allowed = (await modelChoices(auth.org.aiPolicy)).find((c) => c.key === modelKey(ai.provider, ai.model));
    if (!allowed) throw badRequest('That AI model is not available for your workspace.');
    if (!allowed.configured) throw badRequest('That AI model is not set up on the server.');
  }
  await connectDB();
  await Organization.updateOne({ _id: auth.org.id }, { $set: { ...(name ? { name } : {}), ...(ai ? { ai } : {}) } });
  const actor = actorOf(auth);
  if (name && name !== auth.org.name) await logActivity(actor, { action: 'workspace.renamed', category: 'workspace', summary: `Renamed the workspace "${auth.org.name}" → "${name}"` });
  if (ai) await logActivity(actor, { action: 'workspace.ai_model', category: 'workspace', summary: `Switched the AI model to ${PROVIDERS[ai.provider].models[ai.model].label.split(' · ')[0]}` });
});
