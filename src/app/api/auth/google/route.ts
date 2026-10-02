import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { GOOGLE_STATE_COOKIE, googleConfigured, startGoogleFlow } from '@/lib/auth/google';

// "Continue with Google" button target: same flow for sign-in and sign-up.
export async function GET(req: Request) {
  if (!googleConfigured()) return NextResponse.redirect(new URL('/login?error=google_off', req.url));
  const { url, cookie, maxAge } = await startGoogleFlow(req);
  (await cookies()).set(GOOGLE_STATE_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // must survive the top-level redirect back from Google
    path: '/api/auth/google',
    maxAge,
  });
  return NextResponse.redirect(url);
}
