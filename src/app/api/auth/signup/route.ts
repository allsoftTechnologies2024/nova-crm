import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { badRequest, parseBody, route } from '@/lib/http';
import { createWorkspace } from '@/lib/services/signup';
import { User } from '@/models/User';

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  company: z.string().trim().min(1).max(120),
  email: z.email().max(200),
  password: z.string().min(8, 'Use at least 8 characters').max(100),
});

// Creates a workspace and its owner, then signs them in.
export const POST = route(async (req) => {
  const input = await parseBody(req, schema);
  await connectDB();
  if (await User.exists({ email: input.email.toLowerCase() })) throw badRequest('That email is already registered. Sign in instead.');
  await createWorkspace({ name: input.name, company: input.company, email: input.email, passwordHash: await bcrypt.hash(input.password, 10) });
});
