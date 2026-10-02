import 'server-only';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { badRequest, HttpError, notFound } from '@/lib/http';
import type { AdminContext } from '../auth/session';
import { PlatformAdmin } from '../models/PlatformAdmin';
import { audit } from './audit';
import { iso, oid } from './_shared';

// Platform admin accounts (the people who run the console). Unrelated to workspace users.

const password = z.string().min(10, 'Use at least 10 characters').max(100);
export const adminLoginSchema = z.object({ email: z.email(), password: z.string().min(1) });
export const newAdminSchema = z.object({ name: z.string().trim().min(1).max(80), email: z.email().max(200), password });
export const adminPasswordSchema = z.object({ current: z.string().min(1), next: password });

// Returns the admin id for valid, active credentials.
export async function authenticateAdmin(input: z.infer<typeof adminLoginSchema>) {
  await connectDB();
  const admin = await PlatformAdmin.findOne({ email: input.email.toLowerCase(), active: true }).select('+passwordHash');
  if (!admin || !(await bcrypt.compare(input.password, admin.passwordHash))) throw new HttpError(401, 'Wrong email or password.');
  admin.lastLoginAt = new Date();
  await admin.save();
  return String(admin._id);
}

export async function listAdmins() {
  await connectDB();
  const rows = await PlatformAdmin.find().sort({ createdAt: 1 }).lean();
  return rows.map((a) => ({ id: String(a._id), name: a.name, email: a.email, active: a.active, lastLoginAt: iso(a.lastLoginAt), createdAt: iso(a.createdAt as Date)! }));
}

export async function createAdmin(actor: AdminContext, input: z.infer<typeof newAdminSchema>) {
  await connectDB();
  if (await PlatformAdmin.exists({ email: input.email.toLowerCase() })) throw badRequest('An admin with that email already exists.');
  const admin = await PlatformAdmin.create({ name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12) });
  await audit(actor, 'admin.create', 'platform', String(admin._id), `Added platform admin ${admin.email}`);
}

export async function setAdminActive(actor: AdminContext, id: string, active: boolean) {
  await connectDB();
  if (id === actor.id) throw badRequest("You can't deactivate yourself.");
  const admin = await PlatformAdmin.findById(oid(id, 'Admin'));
  if (!admin) throw notFound('Admin not found.');
  if (!active && (await PlatformAdmin.countDocuments({ active: true, _id: { $ne: admin._id } })) === 0) throw badRequest('At least one active admin must remain.');
  admin.active = active;
  await admin.save();
  await audit(actor, active ? 'admin.activate' : 'admin.deactivate', 'platform', id, `${active ? 'Reactivated' : 'Deactivated'} platform admin ${admin.email}`);
}

export async function changeAdminPassword(actor: AdminContext, input: z.infer<typeof adminPasswordSchema>) {
  await connectDB();
  const admin = await PlatformAdmin.findById(actor.id).select('+passwordHash');
  if (!admin || !(await bcrypt.compare(input.current, admin.passwordHash))) throw badRequest('Your current password is incorrect.');
  admin.passwordHash = await bcrypt.hash(input.next, 12);
  admin.passwordChangedAt = new Date();
  await admin.save();
  await audit(actor, 'admin.password', 'platform', actor.id, `${actor.email} changed their password`);
}
