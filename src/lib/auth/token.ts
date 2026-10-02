import { SignJWT, jwtVerify } from 'jose';

// Workspace session tokens. Edge-safe (used by proxy.ts): no database or Node-only imports here.
// Platform-admin tokens live in src/platform/auth/token.ts (separate cookie, type and key).
export const SESSION_COOKIE = 'crm_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const secret = () => {
  if (!process.env.AUTH_SECRET) throw new Error('AUTH_SECRET is not set. Add it to .env.local.');
  return new TextEncoder().encode(process.env.AUTH_SECRET);
};

// Workspace session. `imp` = id of the platform admin running a support session as this user.
export const signSession = (userId: string, orgId: string, imp?: string) =>
  new SignJWT({ typ: 'user', org: orgId, ...(imp ? { imp } : {}) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());

export async function verifySession(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    // Defence in depth: platform tokens use a different key, and are also rejected by type.
    if (payload.typ === 'admin' || !payload.sub) return null;
    return { userId: payload.sub, orgId: String(payload.org), issuedAt: payload.iat ?? 0, impersonator: typeof payload.imp === 'string' ? payload.imp : null };
  } catch {
    return null;
  }
}
