import 'server-only';
import mongoose from 'mongoose';
import { z } from 'zod';
import type { AuthContext } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import type { Role } from '@/lib/rbac';
import { Lead } from '@/models/Lead';
import { ACTIVITY_CATEGORIES, OrgActivity, type ActivityCategory } from '@/models/OrgActivity';
import { User } from '@/models/User';

export interface Actor {
  orgId: string;
  userId: string | null;
  name: string;
  impersonatedBy?: string | null;
}
export const actorOf = (auth: AuthContext): Actor => ({ orgId: auth.org.id, userId: auth.user.id, name: auth.user.name, impersonatedBy: auth.impersonatedBy });
export const systemActor = (orgId: string): Actor => ({ orgId, userId: null, name: 'System' });

export interface ActivityEntry {
  action: string;
  category: ActivityCategory;
  summary: string;
  entity?: { type: string; id: string; label: string };
  meta?: Record<string, unknown>;
}

// Records one workspace activity. Never throws: logging must not break the action it describes.
export async function logActivity(actor: Actor, entry: ActivityEntry | ActivityEntry[]) {
  const entries = Array.isArray(entry) ? entry : [entry];
  if (!entries.length) return;
  try {
    await connectDB();
    await OrgActivity.insertMany(
      entries.map((e) => ({
        orgId: actor.orgId,
        actorId: actor.userId,
        actorName: actor.name,
        action: e.action,
        category: e.category,
        summary: e.summary.slice(0, 500),
        entityType: e.entity?.type ?? '',
        entityId: e.entity?.id ?? '',
        entityLabel: e.entity?.label ?? '',
        meta: { ...(e.meta ?? {}), ...(actor.impersonatedBy ? { viaSupport: true } : {}) },
      }))
    );
  } catch (err) {
    console.error('activity log failed', err);
  }
}

// ---------- Reading ----------

export interface ActivityDTO {
  id: string;
  actor: { id: string | null; name: string };
  action: string;
  category: ActivityCategory;
  summary: string;
  entity: { type: string; id: string; label: string } | null;
  meta: Record<string, unknown>;
  at: string;
}

export const activityQuerySchema = z.object({
  actor: z.string().optional(),
  category: z.enum(ACTIVITY_CATEGORIES).optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
  q: z.string().trim().max(100).optional(),
  before: z.string().datetime().optional(), // cursor: createdAt of the last row already shown
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const canSeeAll = (auth: AuthContext) => auth.can('activity:view_all');

export async function listActivity(auth: AuthContext, query: z.input<typeof activityQuerySchema> = {}) {
  const { actor, category, days, q, before, limit } = activityQuerySchema.parse(query);
  await connectDB();
  const filter: mongoose.QueryFilter<unknown> = { orgId: new mongoose.Types.ObjectId(auth.org.id) };
  // Members without activity:view_all only ever see their own activity.
  const actorId = canSeeAll(auth) ? actor : auth.user.id;
  if (actorId === 'system') filter.actorId = null;
  else if (actorId && mongoose.isValidObjectId(actorId)) filter.actorId = new mongoose.Types.ObjectId(actorId);
  if (category) filter.category = category;
  const createdAt: Record<string, Date> = {};
  if (days) createdAt.$gte = new Date(Date.now() - days * 86_400_000);
  if (before) createdAt.$lt = new Date(before);
  if (Object.keys(createdAt).length) filter.createdAt = createdAt;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ summary: rx }, { entityLabel: rx }, { actorName: rx }];
  }
  const rows = await OrgActivity.find(filter).sort({ createdAt: -1 }).limit(limit + 1).lean();
  const page = rows.slice(0, limit);
  return {
    items: page.map(
      (r): ActivityDTO => ({
        id: String(r._id),
        actor: { id: r.actorId ? String(r.actorId) : null, name: r.actorName },
        action: r.action,
        category: r.category as ActivityCategory,
        summary: r.summary,
        entity: r.entityType ? { type: r.entityType, id: r.entityId, label: r.entityLabel } : null,
        meta: (r.meta as Record<string, unknown>) ?? {},
        at: new Date(r.createdAt).toISOString(),
      })
    ),
    nextCursor: rows.length > limit ? new Date(page[page.length - 1].createdAt).toISOString() : null,
  };
}

// ---------- Per-member stats (live, no AI) ----------

export interface MemberStats {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  lastActive: string | null;
  counts: { leadsCreated: number; stageChanges: number; won: number; lost: number; notes: number; calls: number; emails: number; aiActions: number; logins: number; total: number };
  wonValue: number;
  openLeads: number;
  overdueFollowUps: number;
}

export async function memberStats(auth: AuthContext, sinceDays: number): Promise<MemberStats[]> {
  await connectDB();
  const orgId = new mongoose.Types.ObjectId(auth.org.id);
  const since = new Date(Date.now() - sinceDays * 86_400_000);
  const userFilter = canSeeAll(auth) ? { orgId } : { orgId, _id: new mongoose.Types.ObjectId(auth.user.id) };
  const [users, grouped, lastSeen, owned] = await Promise.all([
    User.find(userFilter, { name: 1, role: 1, active: 1 }).sort({ name: 1 }).lean(),
    OrgActivity.aggregate<{ _id: { actor: mongoose.Types.ObjectId; action: string }; n: number; value: number }>([
      { $match: { orgId, createdAt: { $gte: since }, actorId: { $ne: null } } },
      { $group: { _id: { actor: '$actorId', action: '$action' }, n: { $sum: 1 }, value: { $sum: { $ifNull: ['$meta.value', 0] } } } },
    ]),
    OrgActivity.aggregate<{ _id: mongoose.Types.ObjectId; at: Date }>([
      { $match: { orgId, actorId: { $ne: null } } },
      { $group: { _id: '$actorId', at: { $max: '$createdAt' } } },
    ]),
    Lead.aggregate<{ _id: mongoose.Types.ObjectId; open: number; overdue: number }>([
      { $match: { orgId, status: { $nin: ['won', 'lost'] }, assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', open: { $sum: 1 }, overdue: { $sum: { $cond: [{ $and: [{ $ne: ['$nextFollowUp', null] }, { $lt: ['$nextFollowUp', new Date()] }] }, 1, 0] } } } },
    ]),
  ]);

  return users.map((u) => {
    const mine = grouped.filter((g) => String(g._id.actor) === String(u._id));
    const n = (...actions: string[]) => mine.filter((g) => actions.includes(g._id.action)).reduce((a, g) => a + g.n, 0);
    const own = owned.find((o) => String(o._id) === String(u._id));
    return {
      id: String(u._id),
      name: u.name,
      role: u.role as Role,
      active: u.active,
      lastActive: lastSeen.find((l) => String(l._id) === String(u._id))?.at.toISOString() ?? null,
      counts: {
        leadsCreated: n('lead.created'),
        stageChanges: n('lead.stage_changed'),
        won: n('lead.won'),
        lost: n('lead.lost'),
        notes: n('lead.note'),
        calls: n('lead.call'),
        emails: n('lead.email'),
        aiActions: mine.filter((g) => g._id.action.startsWith('ai.')).reduce((a, g) => a + g.n, 0),
        logins: n('auth.login'),
        total: mine.reduce((a, g) => a + g.n, 0),
      },
      wonValue: mine.filter((g) => g._id.action === 'lead.won').reduce((a, g) => a + g.value, 0),
      openLeads: own?.open ?? 0,
      overdueFollowUps: own?.overdue ?? 0,
    };
  });
}

// Recent activity lines for one member (fed to the AI team report).
export async function recentLinesFor(orgId: string, actorId: string, since: Date, limit = 25) {
  const rows = await OrgActivity.find({ orgId, actorId, createdAt: { $gte: since } }, { summary: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(limit).lean();
  return rows.map((r) => `${new Date(r.createdAt).toISOString().slice(0, 16).replace('T', ' ')} ${r.summary}`);
}
