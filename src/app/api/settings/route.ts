import { z } from 'zod';
import { PROVIDERS } from '@/lib/ai/models';
import { requireAuth } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { badRequest, parseBody, route } from '@/lib/http';
import { actorOf, logActivity } from '@/lib/services/activity';
import { Organization } from '@/models/Organization';

const schema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  ai: z.object({ provider: z.enum(['claude', 'gemini']), model: z.string() }).optional(),
});

export const PATCH = route(async (req) => {
  const auth = await requireAuth('settings:manage');
  const { name, ai } = await parseBody(req, schema);
  if (ai && !PROVIDERS[ai.provider].models[ai.model]) throw badRequest('Unknown AI model.');
  await connectDB();
  await Organization.updateOne({ _id: auth.org.id }, { $set: { ...(name ? { name } : {}), ...(ai ? { ai } : {}) } });
  const actor = actorOf(auth);
  if (name && name !== auth.org.name) await logActivity(actor, { action: 'workspace.renamed', category: 'workspace', summary: `Renamed the workspace "${auth.org.name}" → "${name}"` });
  if (ai) await logActivity(actor, { action: 'workspace.ai_model', category: 'workspace', summary: `Switched the AI model to ${PROVIDERS[ai.provider].models[ai.model].label.split(' · ')[0]}` });
});
