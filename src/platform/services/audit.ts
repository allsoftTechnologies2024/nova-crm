import 'server-only';
import { connectDB } from '@/lib/db';
import type { AdminContext } from '../auth/session';
import { AdminLog } from '../models/AdminLog';
import { iso } from './_shared';

// Platform audit trail: every console action, attributed to the admin's email.
export async function audit(actor: AdminContext, action: string, targetType: 'org' | 'user' | 'platform', targetId: string, summary: string) {
  await AdminLog.create({ actorEmail: actor.email, action, targetType, targetId, summary });
}

export async function recentLogs(limit = 30) {
  await connectDB();
  const rows = await AdminLog.find().sort({ createdAt: -1 }).limit(limit).lean();
  return rows.map((r) => ({ id: String(r._id), actor: r.actorEmail, action: r.action, targetType: r.targetType, targetId: r.targetId, summary: r.summary, at: iso(r.createdAt as Date)! }));
}
