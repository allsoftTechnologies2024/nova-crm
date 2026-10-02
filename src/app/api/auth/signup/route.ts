import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { startSession } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { badRequest, parseBody, route } from '@/lib/http';
import { logActivity } from '@/lib/services/activity';
import { Organization } from '@/models/Organization';
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
  const org = await Organization.create({
    name: input.company,
    ai: { provider: process.env.ANTHROPIC_API_KEY ? 'claude' : 'gemini', model: '' },
  });
  try {
    const user = await User.create({ orgId: org._id, name: input.name, email: input.email, role: 'owner', passwordHash: await bcrypt.hash(input.password, 10) });
    await startSession(String(user._id), String(org._id));
    await logActivity({ orgId: String(org._id), userId: String(user._id), name: user.name }, { action: 'workspace.created', category: 'workspace', summary: `Created the workspace ${org.name}` });
  } catch (err) {
    await Organization.deleteOne({ _id: org._id });
    throw err;
  }
});
