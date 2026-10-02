import { z } from 'zod';
import { withAi } from '@/lib/ai';
import { COPILOT_SYSTEM, copilotContext, copilotTools, runCopilotTool } from '@/lib/ai/copilot';
import type { ChatTurn } from '@/lib/ai/types';
import { requireAuth } from '@/lib/auth/session';
import { HttpError, parseBody, route } from '@/lib/http';
import { appendExchange, getConversation } from '@/lib/services/conversations';
import { actorOf, logActivity } from '@/lib/services/activity';

const schema = z.object({
  now: z.string().max(100),
  conversationId: z.string().nullish(),
  message: z.string().trim().min(1).max(8000),
});

const HISTORY_TURNS = 20; // recent messages sent to the model

export type CopilotEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string }
  | { type: 'saved'; conversationId: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

// Streams the Copilot's reply as NDJSON events. History is loaded from the database (not trusted from the
// client) and the exchange is saved when the reply finishes. One AI credit per user message.
export const POST = route(async (req) => {
  const auth = await requireAuth('ai:use');
  const { now, conversationId, message } = await parseBody(req, schema);
  const past = conversationId ? (await getConversation(auth, conversationId)).messages : [];

  const recent: ChatTurn[] = [
    // An assistant turn that only ran tools has no text; the API needs non-empty content.
    ...past.slice(-HISTORY_TURNS).map(({ role, content, tools }) => ({ role, content: content || `(used tools: ${tools.join(', ') || 'none'})` })),
    { role: 'user', content: message },
  ];
  while (recent[0].role !== 'user') recent.shift(); // the window must start with a user turn
  recent[0] = { role: 'user', content: `${copilotContext(auth, now)}\n\n${recent[0].content}` };

  const encoder = new TextEncoder();
  let open = true;
  const stream = new ReadableStream({
    cancel() {
      open = false; // client went away (e.g. pressed Stop); keep going so the reply is still saved
    },
    async start(controller) {
      const send = (e: CopilotEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
        } catch {
          open = false;
        }
      };
      const reply = { content: '', tools: [] as string[] };
      try {
        await withAi(auth, (ai) =>
          ai.chat({
            system: COPILOT_SYSTEM,
            history: recent,
            tools: copilotTools(auth),
            onText: (text) => {
              reply.content += text;
              send({ type: 'text', text });
            },
            onTool: (name, input) => {
              reply.tools.push(name);
              send({ type: 'tool', name });
              return runCopilotTool(auth, name, input);
            },
          })
        );
      } catch (err) {
        send({ type: 'error', message: err instanceof HttpError ? err.message : 'Copilot hit an error. Please try again.' });
        if (!(err instanceof HttpError)) console.error(err);
      }
      const changed = reply.tools.filter((t) => t === 'update_lead' || t === 'create_lead').length;
      if (reply.content.trim() || reply.tools.length) {
        await logActivity(actorOf(auth), {
          action: 'ai.copilot',
          category: 'ai',
          summary: `Asked Copilot: “${message.slice(0, 120)}”${changed ? ` · Copilot made ${changed} lead change(s)` : ''}`,
          meta: { tools: reply.tools },
        });
      }
      // Save whatever was answered (a failed turn with no reply is not stored, so the user can just retry).
      if (reply.content.trim() || reply.tools.length) {
        try {
          const id = await appendExchange(auth, conversationId ?? null, message, { content: reply.content.trim(), tools: reply.tools });
          send({ type: 'saved', conversationId: id });
        } catch (err) {
          console.error(err);
        }
      }
      send({ type: 'done' });
      if (open) controller.close();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
});
