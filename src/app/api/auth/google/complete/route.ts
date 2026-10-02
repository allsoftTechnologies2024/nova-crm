import { cookies } from 'next/headers';
import { z } from 'zod';
import { GOOGLE_SIGNUP_COOKIE, verifyPendingSignup } from '@/lib/auth/google';
import { connectDB } from '@/lib/db';
import { HttpError, badRequest, parseBody, route } from '@/lib/http';
import { createWorkspace } from '@/lib/services/signup';
import { User } from '@/models/User';

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  company: z.string().trim().min(1).max(120),
});

// Last step of Google sign-up: the email comes from the signed cookie (verified by Google), never the form.
export const POST = route(async (req) => {
  const input = await parseBody(req, schema);
  const jar = await cookies();
  const identity = await verifyPendingSignup(jar.get(GOOGLE_SIGNUP_COOKIE)?.value);
  if (!identity) throw new HttpError(401, 'Your Google sign-in expired. Please continue with Google again.');
  await connectDB();
  if (await User.exists({ $or: [{ email: identity.email }, { googleId: identity.sub }] })) throw badRequest('That Google account already has a workspace. Sign in instead.');
  await createWorkspace({ name: input.name, company: input.company, email: identity.email, googleId: identity.sub });
  jar.delete(GOOGLE_SIGNUP_COOKIE);
});
