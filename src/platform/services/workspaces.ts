import 'server-only';
import mongoose from 'mongoose';
import { z } from 'zod';
import { PROVIDERS } from '@/lib/ai/models';
import { connectDB } from '@/lib/db';
import { badRequest, notFound } from '@/lib/http';
import type { PlanId, PlanSource } from '@/lib/plans';
import { allPlans, getPlan, getSettings } from '@/lib/services/plans';
import type { Role } from '@/lib/rbac';
import { logActivity, systemActor } from '@/lib/services/activity';
import { Conversation } from '@/models/Conversation';
import { Lead } from '@/models/Lead';
import { OrgActivity } from '@/models/OrgActivity';
import { Organization } from '@/models/Organization';
import { Payment } from '@/models/Payment';
import { TeamReport } from '@/models/TeamReport';
import { User } from '@/models/User';
import type { AdminContext } from '../auth/session';
import { audit } from './audit';
import { iso, month, oid, rx } from './_shared';

// Platform-side management of customer workspaces (organizations).

export interface OrgRow {
  id: string;
  name: string;
  plan: PlanId;
  planName: string;
  planSource: PlanSource;
  planExpiresAt: string | null;
  suspended: boolean;
  owner: string;
  users: number;
  leads: number;
  aiUsed: number;
  createdAt: string;
}

export async function listOrgs(q = ''): Promise<OrgRow[]> {
  await connectDB();
  let filter: mongoose.QueryFilter<unknown> = {};
  if (q) {
    // Match workspace name or any member's email/name.
    const members = await User.find({ $or: [{ email: rx(q) }, { name: rx(q) }] }, { orgId: 1 }).limit(200).lean();
    filter = { $or: [{ name: rx(q) }, { _id: { $in: members.map((m) => m.orgId) } }] };
  }
  const orgs = await Organization.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  const ids = orgs.map((o) => o._id);
  const [userCounts, leadCounts, owners] = await Promise.all([
    User.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([{ $match: { orgId: { $in: ids }, active: true } }, { $group: { _id: '$orgId', n: { $sum: 1 } } }]),
    Lead.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([{ $match: { orgId: { $in: ids } } }, { $group: { _id: '$orgId', n: { $sum: 1 } } }]),
    User.find({ orgId: { $in: ids }, role: 'owner' }, { orgId: 1, email: 1 }).lean(),
  ]);
  const names = new Map((await allPlans()).map((p) => [p.id, p.name]));
  const count = (rows: { _id: mongoose.Types.ObjectId; n: number }[], id: mongoose.Types.ObjectId) => rows.find((r) => String(r._id) === String(id))?.n ?? 0;
  return orgs.map((o) => ({
    id: String(o._id),
    name: o.name,
    plan: o.plan as PlanId,
    planName: names.get(o.plan) ?? o.plan,
    planSource: (o.planSource as PlanSource) || 'free',
    planExpiresAt: iso(o.planExpiresAt),
    suspended: Boolean(o.suspended),
    owner: owners.find((u) => String(u.orgId) === String(o._id))?.email ?? '—',
    users: count(userCounts, o._id),
    leads: count(leadCounts, o._id),
    aiUsed: o.aiUsage?.month === month() ? (o.aiUsage.count ?? 0) : 0,
    createdAt: iso(o.createdAt as Date)!,
  }));
}

export async function getOrgDetail(id: string) {
  await connectDB();
  const org = await Organization.findById(oid(id, 'Workspace')).lean();
  if (!org) throw notFound('Workspace not found.');
  const [members, leads, payments] = await Promise.all([
    User.find({ orgId: org._id }).sort({ createdAt: 1 }).lean(),
    Lead.countDocuments({ orgId: org._id }),
    Payment.find({ orgId: org._id }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  return {
    id: String(org._id),
    name: org.name,
    plan: org.plan as PlanId,
    planSource: (org.planSource as PlanSource) || 'free',
    trialUsed: Boolean(org.trialUsed),
    planExpiresAt: iso(org.planExpiresAt),
    suspended: Boolean(org.suspended),
    limitOverrides: { seats: org.limitOverrides?.seats ?? null, leads: org.limitOverrides?.leads ?? null, aiCredits: org.limitOverrides?.aiCredits ?? null },
    ai: { provider: (org.ai?.provider as 'claude' | 'gemini') || 'gemini', model: org.ai?.model || '' },
    aiUsed: org.aiUsage?.month === month() ? (org.aiUsage.count ?? 0) : 0,
    leads,
    createdAt: iso(org.createdAt as Date)!,
    members: members.map((u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role as Role, active: u.active })),
    payments: payments.map((p) => ({ id: String(p._id), plan: p.plan, period: p.period, amount: p.amount, status: p.status, at: iso((p.paidAt ?? p.createdAt) as Date)! })),
  };
}

const limit = z.number().int().min(-1).max(1_000_000).nullable();
export const orgUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  plan: z.string().trim().min(1).max(60).optional(),
  planExpiresAt: z.string().nullable().optional(), // ISO date; null = no expiry date
  limitOverrides: z.object({ seats: limit, leads: limit, aiCredits: limit }).optional(),
  suspended: z.boolean().optional(),
  resetAiUsage: z.literal(true).optional(),
  startTrial: z.literal(true).optional(), // (re)start the configured free trial
  ai: z.object({ provider: z.enum(['claude', 'gemini']), model: z.string() }).optional(),
});

export async function updateOrg(actor: AdminContext, id: string, input: z.infer<typeof orgUpdateSchema>) {
  await connectDB();
  const org = await Organization.findById(oid(id, 'Workspace'));
  if (!org) throw notFound('Workspace not found.');
  const changes: string[] = [];
  if (input.name !== undefined && input.name !== org.name) {
    changes.push(`renamed "${org.name}" → "${input.name}"`);
    org.name = input.name;
  }
  if (input.plan !== undefined || input.planExpiresAt !== undefined) {
    const expires = input.planExpiresAt ? new Date(input.planExpiresAt) : null;
    if (expires && Number.isNaN(expires.getTime())) throw badRequest('Invalid expiry date.');
    if (input.plan !== undefined) {
      const plan = await getPlan(input.plan);
      if (!plan) throw badRequest('Unknown plan.');
      org.plan = plan.id;
    }
    if (input.planExpiresAt !== undefined) org.planExpiresAt = expires;
    const target = await getPlan(org.plan);
    if (target && target.priceMonthly > 0 && !org.planExpiresAt) throw badRequest('A paid plan needs an expiry date.');
    org.planSource = 'admin';
    changes.push(`plan → ${target?.name ?? org.plan}${org.planExpiresAt ? ` until ${org.planExpiresAt.toISOString().slice(0, 10)}` : ''}`);
  }
  if (input.startTrial) {
    const { trial } = await getSettings();
    const plan = await getPlan(trial.planKey);
    if (!plan) throw badRequest('The trial plan is not set up. Configure it under Plans.');
    org.plan = plan.id;
    org.planExpiresAt = new Date(Date.now() + trial.days * 86_400_000);
    org.planSource = 'trial';
    org.trialUsed = true;
    changes.push(`started a ${trial.days}-day ${plan.name} trial`);
  }
  if (input.limitOverrides) {
    org.limitOverrides = input.limitOverrides;
    const fmt = (v: number | null) => (v == null ? 'plan' : v < 0 ? '∞' : v);
    changes.push(`limits → seats ${fmt(input.limitOverrides.seats)}, leads ${fmt(input.limitOverrides.leads)}, AI ${fmt(input.limitOverrides.aiCredits)}`);
  }
  if (input.suspended !== undefined && input.suspended !== Boolean(org.suspended)) {
    org.suspended = input.suspended;
    changes.push(input.suspended ? 'suspended' : 'reactivated');
  }
  if (input.resetAiUsage) {
    org.aiUsage = { month: month(), count: 0 };
    changes.push('AI usage reset');
  }
  if (input.ai) {
    if (!PROVIDERS[input.ai.provider].models[input.ai.model]) throw badRequest('Unknown AI model.');
    org.ai = input.ai;
    changes.push(`AI → ${input.ai.model}`);
  }
  if (!changes.length) return;
  await org.save();
  await audit(actor, 'org.update', 'org', id, `${org.name}: ${changes.join('; ')}`);
  // Visible to the customer in their own activity log.
  await logActivity(systemActor(id), { action: 'workspace.admin_override', category: 'workspace', summary: `Platform support updated the workspace: ${changes.join('; ')}` });
}

// Permanently removes a workspace and everything that belongs to it.
export async function deleteOrg(actor: AdminContext, id: string, confirmName: string) {
  await connectDB();
  const org = await Organization.findById(oid(id, 'Workspace'));
  if (!org) throw notFound('Workspace not found.');
  if (confirmName.trim() !== org.name) throw badRequest('Type the exact workspace name to confirm.');
  const [users, leads] = await Promise.all([User.countDocuments({ orgId: org._id }), Lead.countDocuments({ orgId: org._id })]);
  await Promise.all([
    Lead.deleteMany({ orgId: org._id }),
    Conversation.deleteMany({ orgId: org._id }),
    Payment.deleteMany({ orgId: org._id }),
    OrgActivity.deleteMany({ orgId: org._id }),
    TeamReport.deleteMany({ orgId: org._id }),
    User.deleteMany({ orgId: org._id }),
  ]);
  await org.deleteOne();
  await audit(actor, 'org.delete', 'org', id, `Deleted "${org.name}" (${users} users, ${leads} leads)`);
}
