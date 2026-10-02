import 'server-only';
import { z } from 'zod';
import type { AuthContext } from '@/lib/auth/session';
import { HttpError } from '@/lib/http';
import { LEAD_PRIORITIES, LEAD_STATUSES, STATUS_GUIDE, leadTitle, type LeadDTO } from '@/lib/lead-meta';
import { ROLE_META } from '@/lib/rbac';
import { createLeads, dueFollowUps, getLead, listLeads, pipelineStats, updateLead } from '@/lib/services/leads';
import type { Permission } from '@/lib/rbac';
import type { ToolDef, ToolResult } from './types';

// Each tool: a zod schema (validated before running — streamed tool input is not validated by the API),
// the permission it needs (tools a role can't use are never offered), and the service call it makes.
interface CopilotTool<S extends z.ZodType> {
  description: string;
  input: S;
  permission: Permission;
  run: (auth: AuthContext, input: z.infer<S>) => Promise<unknown>;
}
const tool = <S extends z.ZodType>(t: CopilotTool<S>) => t;

const compact = (l: LeadDTO) => ({
  id: l.id,
  lead: leadTitle(l),
  contact: [l.name, l.email, l.phone].filter(Boolean).join(' · '),
  status: l.status,
  priority: l.priority,
  value: l.value,
  nextFollowUp: l.nextFollowUp,
  owner: l.assignedTo?.name ?? null,
  aiScore: l.ai?.score ?? null,
  need: l.need.slice(0, 160),
});

const TOOLS = {
  search_leads: tool({
    description: 'Search and filter leads the user can see. Returns up to `limit` leads, most recently updated first.',
    permission: 'lead:read',
    input: z.object({
      query: z.string().optional().describe('Free text matched against name, company, email, phone, need, tags'),
      status: z.enum(LEAD_STATUSES).optional(),
      priority: z.enum(LEAD_PRIORITIES).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    run: async (auth, i) => (await listLeads(auth, { q: i.query, status: i.status, priority: i.priority, limit: i.limit ?? 15 })).map(compact),
  }),
  get_lead: tool({
    description: 'Get one lead in full, including its recent activity timeline.',
    permission: 'lead:read',
    input: z.object({ id: z.string() }),
    run: async (auth, i) => {
      const lead = await getLead(auth, i.id);
      return { ...lead, activities: lead.activities.slice(-12) };
    },
  }),
  pipeline_summary: tool({
    description: 'Pipeline totals: lead counts and INR value per stage, win rate, and how many follow-ups are due today or overdue.',
    permission: 'lead:read',
    input: z.object({}),
    run: (auth) => pipelineStats(auth),
  }),
  due_followups: tool({
    description: 'Open leads whose follow-up is due today or overdue, oldest first.',
    permission: 'lead:read',
    input: z.object({}),
    run: async (auth) => (await dueFollowUps(auth, 25)).map(compact),
  }),
  update_lead: tool({
    description: 'Update a lead: change status/priority/value, set the next follow-up, and/or log a note on its timeline. Only call this when the user asked for the change.',
    permission: 'lead:update',
    input: z.object({
      id: z.string(),
      status: z.enum(LEAD_STATUSES).optional(),
      priority: z.enum(LEAD_PRIORITIES).optional(),
      value: z.number().min(0).optional(),
      nextFollowUp: z.string().optional().describe('ISO 8601 date-time with timezone offset, e.g. 2026-10-03T11:00:00+05:30'),
      note: z.string().optional().describe('Short note for the activity timeline'),
    }),
    run: async (auth, { id, note, nextFollowUp, ...rest }) => {
      const date = nextFollowUp ? new Date(nextFollowUp) : undefined;
      if (date && Number.isNaN(date.getTime())) throw new HttpError(400, 'nextFollowUp is not a valid date');
      const lead = await updateLead(auth, id, { ...rest, ...(date ? { nextFollowUp: date } : {}) }, note ? { type: 'ai', text: note } : undefined);
      return { ok: true, lead: compact(lead) };
    },
  }),
  create_lead: tool({
    description: 'Create a new lead assigned to the current user. Only call this when the user asked to add a lead.',
    permission: 'lead:create',
    input: z.object({
      name: z.string().optional(),
      company: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      need: z.string().optional(),
      value: z.number().min(0).optional(),
      priority: z.enum(LEAD_PRIORITIES).optional(),
    }),
    run: async (auth, i) => {
      const [id] = await createLeads(auth, [{ ...i, email: i.email?.toLowerCase() || '' }], 'ai');
      return { ok: true, id };
    },
  }),
};
export type CopilotToolName = keyof typeof TOOLS;

export function copilotTools(auth: AuthContext): ToolDef[] {
  return (Object.entries(TOOLS) as [CopilotToolName, CopilotTool<z.ZodType>][])
    .filter(([, t]) => auth.can(t.permission))
    .map(([name, t]) => {
      const { $schema: _drop, ...schema } = z.toJSONSchema(t.input) as Record<string, unknown>;
      return { name, description: t.description, schema };
    });
}

export async function runCopilotTool(auth: AuthContext, name: string, raw: unknown): Promise<ToolResult> {
  const t = TOOLS[name as CopilotToolName] as CopilotTool<z.ZodType> | undefined;
  if (!t || !auth.can(t.permission)) return { content: `Tool "${name}" is not available to this user's role.`, isError: true };
  const parsed = t.input.safeParse(raw);
  if (!parsed.success) return { content: `Invalid input: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`, isError: true };
  try {
    return { content: JSON.stringify(await t.run(auth, parsed.data)) };
  } catch (err) {
    return { content: err instanceof HttpError ? err.message : 'The action failed.', isError: true };
  }
}

// Stable across requests (cacheable): no timestamps or per-user data here.
export const COPILOT_SYSTEM = `You are Copilot, the AI sales assistant built into a CRM. You help the team understand their pipeline, prioritise their day, and keep leads up to date.

How to work:
- Ground every answer in data from your tools. Never invent leads, numbers or history. If the data isn't there, say so.
- Use tools proactively to answer (search, then get details). Change data (update_lead, create_lead) only when the user asks for it, then confirm what you changed.
- Pipeline stages: ${STATUS_GUIDE}
- Money is INR; format like ₹1,50,000. Refer to leads by company or name, not by id.
- Be concise and practical. Use short markdown: bold for lead names, bullet lists for multiple items. No tables.
- If a tool says the user's role can't do something, explain that politely.`;

export function copilotContext(auth: AuthContext, now: string) {
  const scope = auth.can('lead:read_all') ? 'every lead in the workspace' : 'only leads assigned to or created by them';
  return `[Context] User: ${auth.user.name} (${ROLE_META[auth.user.role].label}) at ${auth.org.name}. They can see ${scope}. Current local time: ${now}.`;
}
