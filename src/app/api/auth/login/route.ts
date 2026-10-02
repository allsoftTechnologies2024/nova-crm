import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { startSession } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { HttpError, parseBody, route } from '@/lib/http';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { logActivity } from '@/lib/services/activity';
import { Organization } from '@/models/Organization';
import { User } from '@/models/User';

const schema = z.object({ email: z.email(), password: z.string().min(1) });

export const POST = route(async (req) => {
  const { email, password } = await parseBody(req, schema);
  rateLimit(`login:${clientIp(req)}`, 30, 15 * 60_000);
  rateLimit(`login:${email.toLowerCase()}`, 10, 15 * 60_000);
  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (user && !user.passwordHash) throw new HttpError(401, 'This account uses Google sign-in. Use "Continue with Google", or reset your password to add one.');
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Wrong email or password.');
  if (!user.active) throw new HttpError(403, 'Your access has been turned off. Ask your workspace admin.');
  const org = await Organization.findById(user.orgId, { suspended: 1 }).lean();
  if (org?.suspended) throw new HttpError(403, 'This workspace has been suspended. Contact support.');
  await startSession(String(user._id), String(user.orgId));
  await logActivity({ orgId: String(user.orgId), userId: String(user._id), name: user.name }, { action: 'auth.login', category: 'auth', summary: 'Signed in' });
});
