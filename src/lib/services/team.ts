import 'server-only';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import type { AuthContext } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { badRequest, forbidden, HttpError, notFound } from '@/lib/http';
import { limitLabel } from '@/lib/plans';
import { ROLES, ROLE_META, assignableRoles, outranks, type Role } from '@/lib/rbac';
import { Lead } from '@/models/Lead';
import { User } from '@/models/User';
import { actorOf, logActivity } from './activity';

export interface MemberDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  openLeads: number;
}

export const newMemberSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().max(200),
  password: z.string().min(8).max(100),
  role: z.enum(ROLES),
});
export const memberUpdateSchema = z.object({ role: z.enum(ROLES).optional(), active: z.boolean().optional() });

export async function listMembers(auth: AuthContext): Promise<MemberDTO[]> {
  await connectDB();
  const orgId = new mongoose.Types.ObjectId(auth.org.id);
  const [users, counts] = await Promise.all([
    User.find({ orgId }).sort({ createdAt: 1 }).lean(),
    Lead.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
      { $match: { orgId, status: { $nin: ['won', 'lost'] } } },
      { $group: { _id: '$assignedTo', n: { $sum: 1 } } },
    ]),
  ]);
  return users.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role as Role,
    active: u.active,
    openLeads: counts.find((c) => String(c._id) === String(u._id))?.n ?? 0,
  }));
}

export async function addMember(auth: AuthContext, input: z.infer<typeof newMemberSchema>) {
  if (!auth.can('team:manage')) throw forbidden();
  if (!assignableRoles(auth.user.role).includes(input.role)) throw forbidden(`You can't add someone as ${input.role}.`);
  await connectDB();
  const seats = auth.plan.limits.seats;
  if (Number.isFinite(seats) && (await User.countDocuments({ orgId: auth.org.id, active: true })) >= seats) {
    throw new HttpError(402, `Your ${auth.plan.name} plan allows ${limitLabel(seats)} members. Upgrade in Billing.`);
  }
  if (await User.exists({ email: input.email.toLowerCase() })) throw badRequest('That email is already registered.');
  const user = await User.create({
    orgId: auth.org.id,
    name: input.name,
    email: input.email,
    role: input.role,
    passwordHash: await bcrypt.hash(input.password, 10),
  });
  await logActivity(actorOf(auth), {
    action: 'team.member_added',
    category: 'team',
    summary: `Added ${input.name} (${input.email}) as ${ROLE_META[input.role].label}`,
    entity: { type: 'user', id: String(user._id), label: input.name },
  });
  return String(user._id);
}

export async function updateMember(auth: AuthContext, id: string, input: z.infer<typeof memberUpdateSchema>) {
  if (!auth.can('team:manage')) throw forbidden();
  if (id === auth.user.id) throw badRequest("You can't change your own role or access.");
  await connectDB();
  const target = mongoose.isValidObjectId(id) ? await User.findOne({ _id: id, orgId: auth.org.id }) : null;
  if (!target) throw notFound('Member not found.');
  if (!outranks(auth.user.role, target.role as Role)) throw forbidden('You can only manage members below your role.');
  if (input.role && !assignableRoles(auth.user.role).includes(input.role)) throw forbidden(`You can't make someone ${input.role}.`);
  if (input.active === true && !target.active) {
    const seats = auth.plan.limits.seats;
    if (Number.isFinite(seats) && (await User.countDocuments({ orgId: auth.org.id, active: true })) >= seats) {
      throw new HttpError(402, `No free seats on the ${auth.plan.name} plan.`);
    }
  }
  const changes: string[] = [];
  if (input.role && input.role !== target.role) changes.push(`changed ${target.name}'s role ${ROLE_META[target.role as Role].label} → ${ROLE_META[input.role].label}`);
  if (input.active !== undefined && input.active !== target.active) changes.push(`${input.active ? 'reactivated' : 'deactivated'} ${target.name}`);
  if (input.role) target.role = input.role;
  if (input.active !== undefined) target.active = input.active;
  await target.save();
  if (changes.length) {
    const s = changes.join(' and ');
    await logActivity(actorOf(auth), {
      action: input.active === false ? 'team.member_deactivated' : input.active === true ? 'team.member_reactivated' : 'team.role_changed',
      category: 'team',
      summary: s.charAt(0).toUpperCase() + s.slice(1),
      entity: { type: 'user', id, label: target.name },
    });
  }
}

// Team members as assignee options (any lead reader may see names).
export async function assigneeOptions(auth: AuthContext) {
  await connectDB();
  const users = await User.find({ orgId: auth.org.id, active: true, role: { $ne: 'viewer' } }, { name: 1 }).sort({ name: 1 }).lean();
  return users.map((u) => ({ id: String(u._id), name: u.name }));
}
