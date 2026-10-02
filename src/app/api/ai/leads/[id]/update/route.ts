import { z } from 'zod';
import { withAi } from '@/lib/ai';
import { extractLeadUpdate, localToDate } from '@/lib/ai/features';
import { requireAuth } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { LEAD_PRIORITIES, LEAD_STATUSES } from '@/lib/lead-meta';
import { getLead, updateLead, type LeadInput } from '@/lib/services/leads';
import { actorOf, logActivity } from '@/lib/services/activity';

const schema = z.object({ text: z.string().trim().min(1).max(10000), now: z.string().max(100), tzOffset: z.number().int().min(-900).max(900) });

// "Spoke to Priya, wants a quote by Friday, budget 2L" → applied to the lead + logged on its timeline.
export const POST = route<{ id: string }>(async (req, { params }) => {
  const auth = await requireAuth('lead:update', 'ai:use');
  const { id } = await params;
  const input = await parseBody(req, schema);
  const lead = await getLead(auth, id);
  const { provider, changes } = await withAi(auth, async (ai) => ({ provider: ai.label, changes: await extractLeadUpdate(ai, { ...input, lead }) }));

  const patch: LeadInput = {};
  for (const k of ['name', 'company', 'email', 'phone', 'source', 'need'] as const) if (changes[k]) patch[k] = changes[k];
  if (changes.value > 0) patch.value = changes.value;
  if ((LEAD_STATUSES as readonly string[]).includes(changes.status)) patch.status = changes.status as LeadInput['status'];
  if ((LEAD_PRIORITIES as readonly string[]).includes(changes.priority)) patch.priority = changes.priority as LeadInput['priority'];
  const followUp = changes.nextFollowUp && localToDate(changes.nextFollowUp, input.tzOffset);
  if (followUp) patch.nextFollowUp = followUp;
  if (changes.tags.length) patch.tags = changes.tags.map((t) => t.toLowerCase());
  if (patch.email && !z.email().safeParse(patch.email).success) delete patch.email;

  const updated = await updateLead(auth, id, patch, { type: 'ai', text: changes.note || input.text.slice(0, 500) });
  await logActivity(actorOf(auth), {
    action: 'ai.update',
    category: 'ai',
    summary: `Updated ${updated.company || updated.name || 'a lead'} with AI: ${changes.note || input.text.slice(0, 140)}`,
    entity: { type: 'lead', id, label: updated.company || updated.name },
    meta: { provider },
  });
  return { provider, lead: updated };
});
