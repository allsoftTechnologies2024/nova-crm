import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { HttpError, forbidden } from '@/lib/http';
import type { Plan, PlanId, PlanStatus } from '@/lib/plans';
import { effectivePlan } from '@/lib/services/plans';
import { can, type Permission, type Role } from '@/lib/rbac';
import { Organization } from '@/models/Organization';
import { User } from '@/models/User';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from './token';

export interface AuthContext {
  user: { id: string; name: string; email: string; role: Role };
  org: {
    id: string;
    name: string;
    plan: PlanId;
    planExpiresAt: Date | null;
    ai: { provider: 'claude' | 'gemini'; model: string };
    aiUsage: { month: string; count: number };
  };
  plan: Plan; // effective plan right now (expired trial/subscription → fallback plan; admin limit overrides applied)
  planStatus: PlanStatus; // trial / paid / expired details for the UI
  can: (p: Permission) => boolean;
  impersonatedBy: string | null; // platform admin id when this is a support session
}

// null = plan default, -1 = unlimited, n = custom limit.
const applyOverride = (base: number, override: number | null | undefined) => (override == null ? base : override < 0 ? Infinity : override);

export async function startSession(userId: string, orgId: string, impersonator?: string) {
  (await cookies()).set(SESSION_COOKIE, await signSession(userId, orgId, impersonator), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

// The signed-in user and workspace, loaded fresh once per request so role changes and
// deactivations take effect immediately (the cookie only carries ids).
export const getAuth = cache(async (): Promise<AuthContext | null> => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  await connectDB();
  const [user, org] = await Promise.all([
    User.findOne({ _id: session.userId, orgId: session.orgId, active: true }).lean(),
    Organization.findById(session.orgId).lean(),
  ]);
  if (!user || !org) return null;
  // A password change/reset signs out every session issued before it.
  if (user.passwordChangedAt && session.issuedAt < Math.floor(new Date(user.passwordChangedAt).getTime() / 1000)) return null;
  // A suspended workspace locks out its members (support sessions from the platform console still work).
  if (org.suspended && !session.impersonator) return null;
  const role = user.role as Role;
  const { plan: base, status: planStatus } = await effectivePlan(org);
  const o = org.limitOverrides;
  return {
    user: { id: String(user._id), name: user.name, email: user.email, role },
    org: {
      id: String(org._id),
      name: org.name,
      plan: (org.plan ?? '') as PlanId,
      planExpiresAt: org.planExpiresAt ?? null,
      ai: { provider: (org.ai?.provider as 'claude' | 'gemini') || 'gemini', model: org.ai?.model || '' },
      aiUsage: { month: org.aiUsage?.month || '', count: org.aiUsage?.count || 0 },
    },
    plan: {
      ...base,
      limits: {
        seats: applyOverride(base.limits.seats, o?.seats),
        leads: applyOverride(base.limits.leads, o?.leads),
        aiCredits: applyOverride(base.limits.aiCredits, o?.aiCredits),
      },
    },
    planStatus,
    can: (p) => can(role, p),
    impersonatedBy: session.impersonator,
  };
});

// For route handlers: throws 401/403 as HttpError (handled by `route()`). A locked workspace (trial ended,
// no subscription) gets 402 here; support sessions from the platform console still get through.
export async function requireAuth(...permissions: Permission[]) {
  const auth = await requireAuthWhileLocked(...permissions);
  if (auth.planStatus.locked && !auth.impersonatedBy) throw new HttpError(402, 'Your free trial has ended. Choose a plan in Billing to keep using your workspace.');
  return auth;
}

// Same, but also works for a locked workspace. Only for routes needed to get unlocked (billing) or to manage
// your own login (account).
export async function requireAuthWhileLocked(...permissions: Permission[]) {
  const auth = await getAuth();
  if (!auth) throw new HttpError(401, 'Please sign in.');
  if (!permissions.every(auth.can)) throw forbidden();
  return auth;
}

// For server components: redirects instead of throwing.
export async function requirePage(...permissions: Permission[]) {
  const auth = await getAuth();
  if (!auth) redirect('/login?expired=1'); // proxy.ts clears the stale cookie on this URL
  if (!permissions.every(auth.can)) redirect('/app?denied=1');
  return auth;
}
