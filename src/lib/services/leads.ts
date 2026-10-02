import 'server-only';
import mongoose from 'mongoose';
import { z } from 'zod';
import type { AuthContext } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { badRequest, forbidden, notFound, HttpError } from '@/lib/http';
import { LEAD_PRIORITIES, LEAD_STATUSES, STATUS_META, leadTitle, type ActivityType, type LeadDTO, type LeadStatus } from '@/lib/lead-meta';
import { limitLabel } from '@/lib/plans';
import { Lead, type LeadDoc } from '@/models/Lead';
import { User } from '@/models/User';
import { actorOf, logActivity, type ActivityEntry } from './activity';

// ---------- Input validation ----------

const text = (max: number) => z.string().trim().max(max);
const tags = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (Array.isArray(v) ? v : v.split(',')).map((t) => t.trim().toLowerCase().slice(0, 40)).filter(Boolean).slice(0, 20));
const optionalDate = z
  .union([z.string(), z.null()])
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), 'Invalid date');

export const leadInputSchema = z
  .object({
    name: text(120),
    company: text(160),
    email: z.union([z.email().max(200), z.literal('')]),
    phone: text(40),
    source: text(80),
    need: text(3000),
    value: z.coerce.number().min(0).max(1e12),
    status: z.enum(LEAD_STATUSES),
    priority: z.enum(LEAD_PRIORITIES),
    tags,
    nextFollowUp: optionalDate,
    assignedTo: z.union([z.string(), z.null()]),
  })
  .partial();
export type LeadInput = z.infer<typeof leadInputSchema>;

export const activityInputSchema = z.object({
  type: z.enum(['note', 'call', 'email']).default('note'),
  text: text(3000).min(1),
});

// ---------- RBAC scoping ----------

const oid = (id: string) => {
  if (!mongoose.isValidObjectId(id)) throw notFound('Lead not found.');
  return new mongoose.Types.ObjectId(id);
};

// Agents only ever see leads assigned to or created by them; read_all roles see the whole workspace.
function scope(auth: AuthContext): mongoose.QueryFilter<LeadDoc> {
  const base = { orgId: new mongoose.Types.ObjectId(auth.org.id) };
  if (auth.can('lead:read_all')) return base;
  const me = new mongoose.Types.ObjectId(auth.user.id);
  return { ...base, $or: [{ assignedTo: me }, { createdBy: me }] };
}

async function resolveAssignee(auth: AuthContext, assignedTo: string | null | undefined) {
  if (assignedTo === undefined) return undefined;
  if (!auth.can('lead:assign') && assignedTo !== auth.user.id) throw forbidden('Only managers and admins can assign leads.');
  if (assignedTo === null) return null;
  const user = mongoose.isValidObjectId(assignedTo) && (await User.exists({ _id: assignedTo, orgId: auth.org.id, active: true }));
  if (!user) throw badRequest('That team member does not exist.');
  return new mongoose.Types.ObjectId(assignedTo);
}

// ---------- Serialisation ----------

type PopulatedLead = Omit<LeadDoc, 'assignedTo'> & {
  assignedTo: { _id: mongoose.Types.ObjectId; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
  activities: { _id: mongoose.Types.ObjectId; type: string; text: string; by: string; at: Date }[];
};

const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : null);
const inrText = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export function toDTO(l: PopulatedLead): LeadDTO {
  return {
    id: String(l._id),
    name: l.name ?? '',
    company: l.company ?? '',
    email: l.email ?? '',
    phone: l.phone ?? '',
    source: l.source ?? '',
    need: l.need ?? '',
    value: l.value ?? 0,
    status: l.status as LeadStatus,
    priority: l.priority as LeadDTO['priority'],
    tags: l.tags ?? [],
    nextFollowUp: iso(l.nextFollowUp),
    assignedTo: l.assignedTo ? { id: String(l.assignedTo._id), name: l.assignedTo.name } : null,
    ai: l.ai?.at ? { score: l.ai.score ?? 0, summary: l.ai.summary ?? '', nextAction: l.ai.nextAction ?? '', at: iso(l.ai.at)! } : null,
    activities: (l.activities ?? []).map((a) => ({ id: String(a._id), type: a.type as ActivityType, text: a.text, by: a.by, at: iso(a.at)! })),
    createdAt: iso(l.createdAt)!,
    updatedAt: iso(l.updatedAt)!,
  };
}

// ---------- Queries ----------

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  priority: z.enum(LEAD_PRIORITIES).optional(),
  mine: z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1').optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export async function listLeads(auth: AuthContext, query: z.input<typeof listQuerySchema> = {}) {
  const { q, status, priority, mine, limit } = listQuerySchema.parse(query);
  await connectDB();
  const filter: mongoose.QueryFilter<LeadDoc> = { ...scope(auth) };
  const and: mongoose.QueryFilter<LeadDoc>[] = [];
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (mine) filter.assignedTo = new mongoose.Types.ObjectId(auth.user.id);
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    and.push({ $or: [{ name: rx }, { company: rx }, { email: rx }, { phone: rx }, { need: rx }, { tags: rx }] });
  }
  if (and.length) filter.$and = and;
  const rows = await Lead.find(filter, { activities: { $slice: -1 } })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate('assignedTo', 'name')
    .lean<PopulatedLead[]>();
  return rows.map(toDTO);
}

export async function getLead(auth: AuthContext, id: string) {
  await connectDB();
  const lead = await Lead.findOne({ ...scope(auth), _id: oid(id) })
    .populate('assignedTo', 'name')
    .lean<PopulatedLead>();
  if (!lead) throw notFound('Lead not found.');
  return toDTO(lead);
}

export async function pipelineStats(auth: AuthContext) {
  await connectDB();
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const [byStatus, dueCount, total] = await Promise.all([
    Lead.aggregate<{ _id: LeadStatus; count: number; value: number }>([
      { $match: scope(auth) },
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$value' } } },
    ]),
    Lead.countDocuments({ ...scope(auth), status: { $nin: ['won', 'lost'] }, nextFollowUp: { $ne: null, $lte: endOfDay } }),
    Lead.countDocuments(scope(auth)),
  ]);
  const stages = LEAD_STATUSES.map((s) => {
    const row = byStatus.find((r) => r._id === s);
    return { status: s, label: STATUS_META[s].label, count: row?.count ?? 0, value: row?.value ?? 0 };
  });
  const won = stages.find((s) => s.status === 'won')!;
  const lost = stages.find((s) => s.status === 'lost')!;
  const open = stages.filter((s) => s.status !== 'won' && s.status !== 'lost');
  return {
    total,
    openCount: open.reduce((a, s) => a + s.count, 0),
    openValue: open.reduce((a, s) => a + s.value, 0),
    wonValue: won.value,
    winRate: won.count + lost.count ? Math.round((won.count / (won.count + lost.count)) * 100) : 0,
    dueFollowUps: dueCount,
    stages,
  };
}

export async function dueFollowUps(auth: AuthContext, limit = 8) {
  await connectDB();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const rows = await Lead.find(
    { ...scope(auth), status: { $nin: ['won', 'lost'] }, nextFollowUp: { $ne: null, $lte: endOfDay } },
    { activities: 0 }
  )
    .sort({ nextFollowUp: 1 })
    .limit(limit)
    .populate('assignedTo', 'name')
    .lean<PopulatedLead[]>();
  return rows.map(toDTO);
}

// ---------- Mutations ----------

function fieldsOf(input: LeadInput) {
  const { assignedTo: _ignored, ...rest } = input;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

export async function createLeads(auth: AuthContext, inputs: LeadInput[], via: 'manual' | 'ai' = 'manual') {
  if (!auth.can('lead:create')) throw forbidden();
  if (!inputs.length) throw badRequest('Nothing to save.');
  await connectDB();
  const orgId = new mongoose.Types.ObjectId(auth.org.id);
  const limit = auth.plan.limits.leads;
  if (Number.isFinite(limit) && (await Lead.countDocuments({ orgId })) + inputs.length > limit) {
    throw new HttpError(402, `Your ${auth.plan.name} plan allows ${limitLabel(limit)} leads. Upgrade in Billing to add more.`);
  }
  const me = new mongoose.Types.ObjectId(auth.user.id);
  const docs = [];
  for (const input of inputs) {
    const assignee = await resolveAssignee(auth, input.assignedTo);
    docs.push({
      ...fieldsOf(input),
      orgId,
      createdBy: me,
      assignedTo: assignee === undefined ? me : assignee,
      activities: [{ type: 'created', text: via === 'ai' ? 'Created by AI from notes' : 'Lead created', by: auth.user.name }],
    });
  }
  const created = await Lead.insertMany(docs);
  await logActivity(
    actorOf(auth),
    created.map((d) => {
      const label = leadTitle({ name: d.name ?? '', company: d.company ?? '', email: d.email ?? '', phone: d.phone ?? '' });
      return {
        action: 'lead.created',
        category: 'lead' as const,
        summary: `${via === 'ai' ? 'Added (AI capture)' : 'Added'} lead ${label}${d.value ? ` worth ${inrText(d.value)}` : ''}`,
        entity: { type: 'lead', id: String(d._id), label },
        meta: { via, value: d.value ?? 0 },
      };
    })
  );
  return created.map((d) => String(d._id));
}

export async function updateLead(
  auth: AuthContext,
  id: string,
  input: LeadInput,
  log?: { type: ActivityType; text: string }
) {
  if (!auth.can('lead:update')) throw forbidden();
  await connectDB();
  const lead = await Lead.findOne({ ...scope(auth), _id: oid(id) });
  if (!lead) throw notFound('Lead not found.');

  const activities: { type: ActivityType; text: string; by: string }[] = [];
  const by = auth.user.name;
  const label = leadTitle({ name: lead.name ?? '', company: lead.company ?? '', email: lead.email ?? '', phone: lead.phone ?? '' });
  const entity = { type: 'lead', id, label };
  const org: ActivityEntry[] = [];
  const fromStatus = lead.status as LeadStatus;
  if (input.status && input.status !== lead.status) {
    activities.push({ type: 'status', text: `${STATUS_META[lead.status as LeadStatus].label} → ${STATUS_META[input.status].label}`, by });
  }
  const assignee = await resolveAssignee(auth, input.assignedTo);
  if (assignee !== undefined && String(assignee) !== String(lead.assignedTo)) {
    lead.assignedTo = assignee;
    const name = assignee ? (await User.findById(assignee, { name: 1 }).lean())?.name : null;
    activities.push({ type: 'assign', text: name ? `Assigned to ${name}` : 'Unassigned', by });
    org.push({ action: 'lead.assigned', category: 'lead', summary: `${name ? `Assigned ${label} to ${name}` : `Unassigned ${label}`}`, entity, meta: { to: name ?? null } });
  }
  const changedFields = Object.entries(fieldsOf(input))
    .filter(([k, v]) => k !== 'status' && k !== 'tags' && String(v ?? '') !== String((lead.get(k) as unknown) ?? ''))
    .map(([k]) => k);
  if (input.tags) input.tags = [...new Set([...(log?.type === 'ai' ? lead.tags : []), ...input.tags])];
  lead.set(fieldsOf(input));
  if (log?.text) activities.push({ ...log, by });
  if (activities.length) lead.activities.push(...activities);
  await lead.save();

  if (input.status && input.status !== fromStatus) {
    const to = input.status;
    const value = lead.value ?? 0;
    org.push({
      action: to === 'won' ? 'lead.won' : to === 'lost' ? 'lead.lost' : 'lead.stage_changed',
      category: 'lead',
      summary:
        to === 'won'
          ? `Won ${label}${value ? ` (${inrText(value)})` : ''} 🎉`
          : to === 'lost'
            ? `Marked ${label} as lost`
            : `Moved ${label} ${STATUS_META[fromStatus].label} → ${STATUS_META[to].label}`,
      entity,
      meta: { from: fromStatus, to, value: to === 'won' ? value : 0 },
    });
    // Count wins/losses as stage changes too, so per-member stage-change totals include them.
    if (to === 'won' || to === 'lost') org.push({ action: 'lead.stage_changed', category: 'lead', summary: `Moved ${label} ${STATUS_META[fromStatus].label} → ${STATUS_META[to].label}`, entity, meta: { from: fromStatus, to } });
  }
  if (changedFields.length && log?.type !== 'ai') {
    org.push({ action: 'lead.updated', category: 'lead', summary: `Updated ${label} (${changedFields.join(', ')})`, entity, meta: { fields: changedFields } });
  }
  await logActivity(actorOf(auth), org);
  return getLead(auth, id);
}

export async function saveInsights(auth: AuthContext, id: string, ai: { score: number; summary: string; nextAction: string }) {
  await connectDB();
  const res = await Lead.updateOne({ ...scope(auth), _id: oid(id) }, { $set: { ai: { ...ai, at: new Date() } } });
  if (!res.matchedCount) throw notFound('Lead not found.');
}

export async function addActivity(auth: AuthContext, id: string, input: z.infer<typeof activityInputSchema>) {
  if (!auth.can('lead:update')) throw forbidden();
  await connectDB();
  const res = await Lead.updateOne(
    { ...scope(auth), _id: oid(id) },
    { $push: { activities: { ...input, by: auth.user.name, at: new Date() } } }
  );
  if (!res.matchedCount) throw notFound('Lead not found.');
  const lead = await getLead(auth, id);
  const kind = input.type === 'call' ? 'Logged a call with' : input.type === 'email' ? 'Logged an email to' : 'Added a note on';
  await logActivity(actorOf(auth), {
    action: `lead.${input.type}`,
    category: 'note',
    summary: `${kind} ${leadTitle(lead)}: ${input.text.slice(0, 160)}`,
    entity: { type: 'lead', id, label: leadTitle(lead) },
  });
  return lead;
}

export async function deleteLead(auth: AuthContext, id: string) {
  if (!auth.can('lead:delete')) throw forbidden();
  await connectDB();
  const lead = await Lead.findOneAndDelete({ ...scope(auth), _id: oid(id) }, { projection: { name: 1, company: 1, email: 1, phone: 1, value: 1 } }).lean();
  if (!lead) throw notFound('Lead not found.');
  const label = leadTitle({ name: lead.name ?? '', company: lead.company ?? '', email: lead.email ?? '', phone: lead.phone ?? '' });
  await logActivity(actorOf(auth), { action: 'lead.deleted', category: 'lead', summary: `Deleted lead ${label}`, entity: { type: 'lead', id, label } });
}

// ---------- Dashboard ----------

// Leads added and value per month for the last 12 months (for the overview chart).
export async function monthlyTrend(auth: AuthContext) {
  await connectDB();
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - 11);
  const rows = await Lead.aggregate<{ _id: { y: number; m: number }; count: number; value: number; won: number }>([
    { $match: { ...scope(auth), createdAt: { $gte: start } } },
    {
      $group: {
        _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
        count: { $sum: 1 },
        value: { $sum: '$value' },
        won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
      },
    },
  ]);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(start);
    d.setMonth(start.getMonth() + i);
    const row = rows.find((r) => r._id.y === d.getFullYear() && r._id.m === d.getMonth() + 1);
    return { key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: d.toLocaleString('en-US', { month: 'short' }), count: row?.count ?? 0, value: row?.value ?? 0, won: row?.won ?? 0 };
  });
}

// Latest timeline entries across the leads this user can see ("who did what").
export async function recentActivity(auth: AuthContext, limit = 6) {
  await connectDB();
  const rows = await Lead.aggregate<{ _id: mongoose.Types.ObjectId; name: string; company: string; a: { _id: mongoose.Types.ObjectId; type: string; text: string; by: string; at: Date } }>([
    { $match: scope(auth) },
    { $project: { name: 1, company: 1, a: { $slice: ['$activities', -5] } } },
    { $unwind: '$a' },
    { $sort: { 'a.at': -1 } },
    { $limit: limit },
  ]);
  return rows.map((r) => ({
    id: String(r.a._id),
    leadId: String(r._id),
    lead: r.company || r.name || 'Lead',
    type: r.a.type as ActivityType,
    text: r.a.text,
    by: r.a.by || 'System',
    at: new Date(r.a.at).toISOString(),
  }));
}
