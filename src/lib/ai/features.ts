import 'server-only';
import { LEAD_PRIORITIES, LEAD_STATUSES, STATUS_GUIDE, type LeadDTO } from '@/lib/lead-meta';
import type { AiProvider, ImageInput, JsonSchema } from './types';

// ---------- Schemas (every field required so Claude and Gemini return a stable shape; "" = not mentioned) ----------

const str = (description: string) => ({ type: 'string', description });

const LEAD_PROPS = {
  name: str('Contact person name'),
  company: str('Company / business name'),
  email: str('Email address'),
  phone: str('Phone number exactly as written'),
  source: str('Where the lead came from, e.g. "Referral", "Website", "LinkedIn", "Cold call"'),
  need: str('What they want / their situation, in one or two clear sentences'),
  value: { type: 'number', description: 'Expected deal value in INR as a plain number; 0 if not mentioned' },
  status: { type: 'string', enum: ['', ...LEAD_STATUSES], description: 'Pipeline stage implied by the notes, or ""' },
  priority: { type: 'string', enum: ['', ...LEAD_PRIORITIES], description: 'hot = ready soon, warm = maybe, cold = not now; "" if unclear' },
  nextFollowUp: str('When to follow up as local time "YYYY-MM-DDTHH:mm", resolved against the current time given; "" if none'),
  tags: { type: 'array', items: { type: 'string' }, description: 'A few short lowercase tags' },
  note: str('One or two sentences for the activity timeline about what happened; "" if nothing happened yet'),
};
const LEAD_KEYS = Object.keys(LEAD_PROPS);
const leadObject = { type: 'object', properties: LEAD_PROPS, required: LEAD_KEYS, additionalProperties: false };

export interface ParsedLead {
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  need: string;
  value: number;
  status: string;
  priority: string;
  nextFollowUp: string;
  tags: string[];
  note: string;
}

const RULES = `Rules:
- Use only what the notes say. Never invent names, numbers, emails or values. Leave a field "" (or 0 for value) when it isn't mentioned.
- Notes may be typed, dictated, pasted from email/WhatsApp/LinkedIn, or photos of handwritten pages or business cards, in any language. Write "need" and "note" in clear, short English.
- Keep phone numbers as written; convert spoken numbers to digits. If a handwritten digit is unreadable use "?" — never guess.
- Convert amounts like "2 lakh", "50k", "₹1.5L" to plain INR numbers (200000, 50000, 150000).
- Statuses: ${STATUS_GUIDE}
- Resolve relative dates ("tomorrow", "next Monday", "evening") against the current local time. Only a day given → 11:00; morning 10:00, afternoon 15:00, evening 18:00.`;

function userPrompt(parts: { now: string; text?: string; existing?: unknown; imageCount?: number }) {
  const out = [`Current local time: ${parts.now}`];
  if (parts.existing) out.push(`Existing lead:\n${JSON.stringify(parts.existing, null, 2)}`);
  if (parts.imageCount) out.push(`${parts.imageCount} attached image(s) contain the notes. Read every entry carefully.`);
  if (parts.text) out.push(`Notes:\n<notes>\n${parts.text}\n</notes>`);
  return out.join('\n\n');
}

const clean = (l: Partial<ParsedLead>): ParsedLead => ({
  ...(Object.fromEntries(LEAD_KEYS.map((k) => [k, String(l?.[k as keyof ParsedLead] ?? '').trim()])) as unknown as ParsedLead),
  value: Math.max(0, Number(l?.value) || 0),
  tags: Array.isArray(l?.tags) ? l.tags.map(String).filter(Boolean) : [],
});

// ---------- Features ----------

export async function extractLeads(ai: AiProvider, input: { text: string; now: string; images: ImageInput[] }) {
  const schema: JsonSchema = { type: 'object', properties: { leads: { type: 'array', items: leadObject } }, required: ['leads'], additionalProperties: false };
  const out = await ai.json<{ leads: Partial<ParsedLead>[] }>({
    system: `You are the data-entry assistant inside a sales CRM. Turn the user's raw notes into structured leads.
${RULES}
- The notes may describe one lead or a list of several. Return one entry per distinct person/company.
- A lead nobody has contacted yet has status "new" and note "".`,
    user: userPrompt({ now: input.now, text: input.text, imageCount: input.images.length }),
    images: input.images,
    schema,
  });
  return (out.leads ?? []).map(clean);
}

export async function extractLeadUpdate(ai: AiProvider, input: { text: string; now: string; lead: LeadDTO }) {
  const { activities, ai: _ai, id: _id, ...existing } = input.lead;
  const out = await ai.json<Partial<ParsedLead>>({
    system: `You are the data-entry assistant inside a sales CRM. The user is logging an update on ONE existing lead.
${RULES}
- Return only what changes: new or corrected values in their fields; leave unchanged fields "" (value 0). tags: only new tags.
- "note" is required: summarise this update for the timeline.
- Set status whenever the notes imply a stage change, and nextFollowUp whenever a callback time is mentioned.`,
    user: userPrompt({ now: input.now, text: input.text, existing: { ...existing, recentActivity: activities.slice(-5).map((a) => `${a.at}: ${a.text}`) } }),
    schema: leadObject,
  });
  return clean(out);
}

export interface LeadInsights {
  score: number;
  summary: string;
  nextAction: string;
}

export async function scoreLead(ai: AiProvider, lead: LeadDTO, now: string) {
  const schema: JsonSchema = {
    type: 'object',
    properties: {
      score: { type: 'integer', description: 'Probability-style lead score 0-100 (100 = will almost certainly close soon)' },
      summary: str('2-3 sentence read on this lead: who they are, what they want, where things stand'),
      nextAction: str('The single most useful next step, concrete and specific (who/what/when)'),
    },
    required: ['score', 'summary', 'nextAction'],
    additionalProperties: false,
  };
  const out = await ai.json<LeadInsights>({
    system: `You are a senior sales coach reviewing one lead in a CRM. Score it on fit, intent, budget signals, engagement recency and stage. Be direct and practical; do not invent facts not in the record.`,
    user: `Current time: ${now}\n\nLead record:\n${JSON.stringify({ ...lead, id: undefined }, null, 2)}`,
    schema,
  });
  return { score: Math.min(100, Math.max(0, Math.round(Number(out.score) || 0))), summary: String(out.summary || ''), nextAction: String(out.nextAction || '') };
}

export async function draftMessage(
  ai: AiProvider,
  input: { lead: LeadDTO; channel: 'email' | 'whatsapp'; goal: string; senderName: string; company: string }
) {
  const schema: JsonSchema = {
    type: 'object',
    properties: { subject: str('Email subject line; "" for WhatsApp'), body: str('The message body, ready to send') },
    required: ['subject', 'body'],
    additionalProperties: false,
  };
  return ai.json<{ subject: string; body: string }>({
    system: `You write short, warm, human follow-up messages for a salesperson. ${
      input.channel === 'whatsapp' ? 'WhatsApp style: 2-5 short lines, friendly, no subject, at most one emoji.' : 'Email style: clear subject, under 140 words, one clear call to action, sign off with the sender name.'
    } Never invent prices, dates or facts that aren't in the lead record.`,
    user: `Sender: ${input.senderName} from ${input.company}
Goal of this message: ${input.goal || 'Move the deal to the next step'}

Lead record:
${JSON.stringify({ ...input.lead, id: undefined, activities: input.lead.activities.slice(-6) }, null, 2)}`,
    schema,
  });
}

// "YYYY-MM-DDTHH:mm" in the user's local time → Date, given the browser's getTimezoneOffset().
export function localToDate(value: string, tzOffsetMin: number): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) + tzOffsetMin * 60_000;
  return Number.isNaN(utc) ? null : new Date(utc);
}
