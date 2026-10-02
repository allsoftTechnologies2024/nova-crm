import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { GOOGLE_SIGNUP_COOKIE, GOOGLE_STATE_COOKIE, PENDING_SIGNUP_MAX_AGE, finishGoogleFlow, signPendingSignup } from '@/lib/auth/google';
import { startSession } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { logActivity } from '@/lib/services/activity';
import { Organization } from '@/models/Organization';
import { User } from '@/models/User';

const back = (req: Request, error: string) => NextResponse.redirect(new URL(`/login?error=${error}`, req.url));

// Google redirects here. Existing account (matched by Google id, else by verified email) → signed in.
// New person → their verified identity is held in a short-lived signed cookie while they name the workspace.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const jar = await cookies();
  const saved = (() => {
    try {
      return JSON.parse(jar.get(GOOGLE_STATE_COOKIE)?.value ?? '') as { state: string; nonce: string; verifier: string };
    } catch {
      return null;
    }
  })();
  jar.delete({ name: GOOGLE_STATE_COOKIE, path: '/api/auth/google' });

  if (params.get('error')) return back(req, 'google_cancelled'); // user closed the Google screen
  const code = params.get('code');
  if (!saved || !code || params.get('state') !== saved.state) return back(req, 'google_state');

  let identity;
  try {
    identity = await finishGoogleFlow(req, code, saved);
  } catch (err) {
    console.error('[google sign-in]', err);
    return back(req, 'google_failed');
  }

  await connectDB();
  const user = (await User.findOne({ googleId: identity.sub })) ?? (await User.findOne({ email: identity.email }));
  if (!user) {
    jar.set(GOOGLE_SIGNUP_COOKIE, await signPendingSignup(identity), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: PENDING_SIGNUP_MAX_AGE,
    });
    return NextResponse.redirect(new URL('/signup/google', req.url));
  }

  if (!user.active) return back(req, 'inactive');
  const org = await Organization.findById(user.orgId, { suspended: 1 }).lean();
  if (org?.suspended) return back(req, 'suspended');
  if (user.googleId !== identity.sub) {
    // First Google sign-in for an account created with email + password (or by a teammate's invite): link it.
    user.googleId = identity.sub;
    await user.save();
  }
  await startSession(String(user._id), String(user.orgId));
  await logActivity({ orgId: String(user.orgId), userId: String(user._id), name: user.name }, { action: 'auth.login', category: 'auth', summary: 'Signed in with Google' });
  return NextResponse.redirect(new URL('/app', req.url));
}
