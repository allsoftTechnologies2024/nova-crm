import 'server-only';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { badRequest, notFound } from '@/lib/http';
import { ROLES, ROLE_META, type Role } from '@/lib/rbac';
import { logActivity, systemActor } from '@/lib/services/activity';
import { Organization } from '@/models/Organization';
import { User } from '@/models/User';
import type { AdminContext } from '../auth/session';
import { audit } from './audit';
import { iso, oid, rx } from './_shared';

// Platform-side management of workspace users (across all workspaces).

export async function listUsers(q = '') {
  await connectDB();
  const filter = q ? { $or: [{ email: rx(q) }, { name: rx(q) }] } : {};
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(300).lean();
  const orgs = await Organization.find({ _id: { $in: users.map((u) => u.orgId) } }, { name: 1, suspended: 1 }).lean();
  return users.map((u) => {
    const org = orgs.find((o) => String(o._id) === String(u.orgId));
    return {
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role as Role,
      active: u.active,
      org: { id: String(u.orgId), name: org?.name ?? '—', suspended: Boolean(org?.suspended) },
      createdAt: iso(u.createdAt as Date)!,
    };
  });
}

export const userUpdateSchema = z.object({ role: z.enum(ROLES).optional(), active: z.boolean().optional(), name: z.string().trim().min(1).max(80).optional() });

export async function updateUser(actor: AdminContext, id: string, input: z.infer<typeof userUpdateSchema>) {
  await connectDB();
  const user = await User.findById(oid(id, 'User'));
  if (!user) throw notFound('User not found.');
  // Every workspace must keep at least one active owner.
  const losingOwner = user.role === 'owner' && ((input.role && input.role !== 'owner') || input.active === false);
  if (losingOwner && !(await User.exists({ orgId: user.orgId, role: 'owner', active: true, _id: { $ne: user._id } }))) {
    throw badRequest('This is the only owner of the workspace. Make someone else owner first.');
  }
  const changes: string[] = [];
  if (input.name !== undefined && input.name !== user.name) (changes.push(`name → ${input.name}`), (user.name = input.name));
  if (input.role && input.role !== user.role) (changes.push(`role ${ROLE_META[user.role as Role].label} → ${ROLE_META[input.role].label}`), (user.role = input.role));
  if (input.active !== undefined && input.active !== user.active) (changes.push(input.active ? 'reactivated' : 'deactivated'), (user.active = input.active));
  if (!changes.length) return;
  await user.save();
  await audit(actor, 'user.update', 'user', id, `${user.email}: ${changes.join('; ')}`);
  await logActivity(systemActor(String(user.orgId)), {
    action: 'team.admin_override',
    category: 'team',
    summary: `Platform support updated ${user.name}: ${changes.join('; ')}`,
    entity: { type: 'user', id, label: user.name },
  });
}

// Sets a random temporary password (shown once to the admin) and signs the user out everywhere.
export async function resetUserPassword(actor: AdminContext, id: string) {
  await connectDB();
  const user = await User.findById(oid(id, 'User'));
  if (!user) throw notFound('User not found.');
  const temp = crypto.randomBytes(9).toString('base64url');
  user.passwordHash = await bcrypt.hash(temp, 10);
  user.passwordChangedAt = new Date();
  await user.save();
  await audit(actor, 'user.password_reset', 'user', id, `Temporary password issued for ${user.email}`);
  await logActivity(systemActor(String(user.orgId)), { action: 'auth.password_reset', category: 'auth', summary: `Platform support issued a temporary password for ${user.name}`, entity: { type: 'user', id, label: user.name } });
  return temp;
}

// Validates a support-session target and records it. The caller issues the workspace session.
export async function supportSessionTarget(actor: AdminContext, id: string) {
  await connectDB();
  const user = await User.findById(oid(id, 'User')).lean();
  if (!user || !user.active) throw badRequest('That user is not active.');
  await audit(actor, 'user.impersonate', 'user', id, `Started a support session as ${user.email}`);
  return { userId: String(user._id), orgId: String(user.orgId) };
}
