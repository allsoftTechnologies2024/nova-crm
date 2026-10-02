import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/token';
import { ADMIN_COOKIE, verifyAdminSession } from '@/platform/auth/token';

// Optimistic redirects only. Every page and route handler still checks the session and permissions itself.
// Workspace (/app) and platform console (/admin) use separate cookies and never grant access to each other.
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    const isAdmin = Boolean(await verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value));
    if (pathname === '/admin/login') return isAdmin ? NextResponse.redirect(new URL('/admin', request.url)) : NextResponse.next();
    return isAdmin ? NextResponse.next() : NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const signedIn = Boolean(await verifySession(request.cookies.get(SESSION_COOKIE)?.value));
  // A page rejected this session (password changed, user deactivated, workspace suspended) even though the
  // cookie's signature is still valid. Drop the cookie and show the login form instead of bouncing back to /app.
  if (pathname === '/login' && searchParams.has('expired')) {
    const res = NextResponse.next();
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  if (pathname.startsWith('/app') && !signedIn) return NextResponse.redirect(new URL('/login', request.url));
  if ((pathname === '/login' || pathname === '/signup') && signedIn) return NextResponse.redirect(new URL('/app', request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/app/:path*', '/admin/:path*', '/login', '/signup'] };
