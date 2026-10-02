import { z } from 'zod';
import { withAi } from '@/lib/ai';
import { scoreLead } from '@/lib/ai/features';
import { requireAuth } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { getLead, saveInsights } from '@/lib/services/leads';
import { actorOf, logActivity } from '@/lib/services/activity';
import { leadTitle } from '@/lib/lead-meta';

// AI lead score + summary + next best action, saved on the lead.
export const POST = route<{ id: string }>(async (req, { params }) => {
  const auth = await requireAuth('lead:read', 'ai:use');
  const { id } = await params;
  const { now } = await parseBody(req, z.object({ now: z.string().max(100) }));
  const lead = await getLead(auth, id);
  const insights = await withAi(auth, (ai) => scoreLead(ai, lead, now));
  await saveInsights(auth, id, insights);
  await logActivity(actorOf(auth), {
    action: 'ai.score',
    category: 'ai',
    summary: `AI-scored ${leadTitle(lead)}: ${insights.score}/100`,
    entity: { type: 'lead', id, label: leadTitle(lead) },
    meta: { score: insights.score },
  });
  return { insights: { ...insights, at: new Date().toISOString() } };
});
