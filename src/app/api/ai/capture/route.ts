import { z } from 'zod';
import { withAi } from '@/lib/ai';
import { extractLeads } from '@/lib/ai/features';
import { requireAuth } from '@/lib/auth/session';
import { badRequest, parseBody, route } from '@/lib/http';
import { actorOf, logActivity } from '@/lib/services/activity';

const schema = z.object({
  text: z.string().max(20000).default(''),
  now: z.string().max(100),
  images: z
    .array(z.object({ mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']), data: z.string().max(7_000_000) }))
    .max(4)
    .default([]),
});

// Notes / screenshots / business-card photos → lead drafts. Nothing is saved until the user confirms.
export const POST = route(async (req) => {
  const auth = await requireAuth('lead:create', 'ai:use');
  const input = await parseBody(req, schema);
  if (!input.text.trim() && !input.images.length) throw badRequest('Add some notes or a photo first.');
  const res = await withAi(auth, async (ai) => ({ provider: ai.label, leads: await extractLeads(ai, input) }));
  await logActivity(actorOf(auth), {
    action: 'ai.capture',
    category: 'ai',
    summary: `Used AI capture on ${input.images.length ? `${input.images.length} photo(s)${input.text.trim() ? ' + notes' : ''}` : 'notes'} → found ${res.leads.length} lead(s)`,
    meta: { provider: res.provider, found: res.leads.length },
  });
  return res;
});
