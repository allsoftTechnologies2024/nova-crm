import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { HttpError } from '@/lib/http';
import { PlatformAdmin } from '../models/PlatformAdmin';
import { ADMIN_COOKIE, ADMIN_MAX_AGE, signAdminSession, verifyAdminSession } from './token';

export interface AdminContext {
  id: string;
  name: string;
  email: string;
}

export async function startAdminSession(adminId: string) {
  (await cookies()).set(ADMIN_COOKIE, await signAdminSession(adminId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_MAX_AGE,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

// The signed-in platform admin, re-checked against the database on every request.
export const getAdmin = cache(async (): Promise<AdminContext | null> => {
  const session = await verifyAdminSession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!session) return null;
  await connectDB();
  const admin = await PlatformAdmin.findOne({ _id: session.adminId, active: true }).lean();
  if (!admin) return null;
  if (admin.passwordChangedAt && session.issuedAt < Math.floor(new Date(admin.passwordChangedAt).getTime() / 1000)) return null;
  return { id: String(admin._id), name: admin.name, email: admin.email };
});

// API routes: 404 (not 403) so the console's existence isn't advertised.
export async function requirePlatformAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new HttpError(404, 'Not found.');
  return admin;
}

export async function requirePlatformAdminPage() {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
