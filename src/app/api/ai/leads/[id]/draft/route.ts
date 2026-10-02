import { z } from 'zod';
import { withAi } from '@/lib/ai';
import { draftMessage } from '@/lib/ai/features';
import { requireAuth } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { getLead } from '@/lib/services/leads';
import { actorOf, logActivity } from '@/lib/services/activity';
import { leadTitle } from '@/lib/lead-meta';

const schema = z.object({ channel: z.enum(['email', 'whatsapp']), goal: z.string().trim().max(300).default('') });

// Drafts a follow-up email / WhatsApp message for the lead. Nothing is sent automatically.
export const POST = route<{ id: string }>(async (req, { params }) => {
  const auth = await requireAuth('lead:read', 'ai:use');
  const { channel, goal } = await parseBody(req, schema);
  const lead = await getLead(auth, (await params).id);
  const draft = await withAi(auth, (ai) => draftMessage(ai, { lead, channel, goal, senderName: auth.user.name, company: auth.org.name }));
  await logActivity(actorOf(auth), {
    action: 'ai.draft',
    category: 'ai',
    summary: `Drafted a ${channel === 'whatsapp' ? 'WhatsApp message' : 'follow-up email'} for ${leadTitle(lead)} with AI`,
    entity: { type: 'lead', id: lead.id, label: leadTitle(lead) },
  });
  return { draft };
});
