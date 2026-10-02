import { SignJWT, jwtVerify } from 'jose';

// Platform-admin console tokens. Edge-safe (used by proxy.ts): no database or Node-only imports.
// Uses its own cookie, its own token type and its own signing key, so a workspace token can never
// verify here (and an admin token can never verify as a workspace session).
export const ADMIN_COOKIE = 'crm_admin';
export const ADMIN_MAX_AGE = 60 * 60 * 8; // 8 hours

const key = () => {
  const base = process.env.PLATFORM_AUTH_SECRET || (process.env.AUTH_SECRET && `${process.env.AUTH_SECRET}::platform-admin`);
  if (!base) throw new Error('AUTH_SECRET is not set. Add it to .env.local.');
  return new TextEncoder().encode(base);
};

export const signAdminSession = (adminId: string) =>
  new SignJWT({ typ: 'admin' }).setProtectedHeader({ alg: 'HS256' }).setSubject(adminId).setIssuedAt().setExpirationTime(`${ADMIN_MAX_AGE}s`).sign(key());

export async function verifyAdminSession(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (payload.typ !== 'admin' || !payload.sub) return null;
    return { adminId: payload.sub, issuedAt: payload.iat ?? 0 };
  } catch {
    return null;
  }
}
