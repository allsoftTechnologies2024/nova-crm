import 'server-only';
import { SignJWT, createRemoteJWKSet, jwtVerify } from 'jose';

// "Continue with Google" (OpenID Connect authorization-code flow with PKCE). No extra libraries:
// we redirect to Google, exchange the code server-side and verify Google's signed ID token with jose.

export const GOOGLE_STATE_COOKIE = 'g_oauth'; // state + nonce + PKCE verifier for one round trip
export const GOOGLE_SIGNUP_COOKIE = 'g_signup'; // verified Google identity waiting for a workspace name
const TEN_MINUTES = 10 * 60;

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// Must exactly match an "Authorized redirect URI" on the Google OAuth client.
export function googleRedirectUri(req: Request) {
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  return `${base.replace(/\/$/, '')}/api/auth/google/callback`;
}

const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');
const random = () => b64url(crypto.getRandomValues(new Uint8Array(32)));

export async function startGoogleFlow(req: Request) {
  const state = random();
  const nonce = random();
  const verifier = random();
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return { url: url.toString(), cookie: JSON.stringify({ state, nonce, verifier }), maxAge: TEN_MINUTES };
}

export interface GoogleIdentity {
  sub: string; // Google's stable user id
  email: string;
  name: string;
}

// Exchanges the code and returns the verified identity. Throws on anything unexpected.
export async function finishGoogleFlow(req: Request, code: string, saved: { nonce: string; verifier: string }): Promise<GoogleIdentity> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(req),
      grant_type: 'authorization_code',
      code_verifier: saved.verifier,
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error('Google returned no ID token');
  const { payload } = await jwtVerify(id_token, GOOGLE_JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: process.env.GOOGLE_CLIENT_ID!,
  });
  if (payload.nonce !== saved.nonce) throw new Error('Google sign-in nonce mismatch');
  // Only a Google-verified email may match or claim an account.
  if (payload.email_verified !== true || typeof payload.email !== 'string' || !payload.sub) throw new Error('Google account email is not verified');
  const name = typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : payload.email.split('@')[0];
  return { sub: payload.sub, email: payload.email.toLowerCase(), name };
}

// A verified Google identity that has no account yet, held for the "name your workspace" step.
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET!);

export const signPendingSignup = (id: GoogleIdentity) =>
  new SignJWT({ typ: 'google_signup', email: id.email, name: id.name }).setProtectedHeader({ alg: 'HS256' }).setSubject(id.sub).setIssuedAt().setExpirationTime(`${TEN_MINUTES}s`).sign(secret());

export async function verifyPendingSignup(token?: string): Promise<GoogleIdentity | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.typ !== 'google_signup' || !payload.sub) return null;
    return { sub: payload.sub, email: String(payload.email), name: String(payload.name) };
  } catch {
    return null;
  }
}

export const PENDING_SIGNUP_MAX_AGE = TEN_MINUTES;
