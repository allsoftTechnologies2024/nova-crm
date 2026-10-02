import 'server-only';
import { startSession } from '@/lib/auth/session';
import { logActivity } from '@/lib/services/activity';
import { initialPlanFor } from '@/lib/services/plans';
import { Organization } from '@/models/Organization';
import { User } from '@/models/User';

// Creates a workspace with its owner (free trial if enabled) and signs them in. Used by email sign-up and
// by Google sign-up. Callers check that the email is free first.
export async function createWorkspace(input: { name: string; company: string; email: string; passwordHash?: string; googleId?: string }) {
  const org = await Organization.create({
    name: input.company,
    ...(await initialPlanFor()), // free trial if enabled in the platform console, else the fallback plan
    ai: { provider: process.env.ANTHROPIC_API_KEY ? 'claude' : 'gemini', model: '' },
  });
  try {
    const user = await User.create({
      orgId: org._id,
      name: input.name,
      email: input.email,
      role: 'owner',
      ...(input.passwordHash ? { passwordHash: input.passwordHash } : {}),
      ...(input.googleId ? { googleId: input.googleId } : {}),
    });
    await startSession(String(user._id), String(org._id));
    await logActivity({ orgId: String(org._id), userId: String(user._id), name: user.name }, { action: 'workspace.created', category: 'workspace', summary: `Created the workspace ${org.name}` });
  } catch (err) {
    await Organization.deleteOne({ _id: org._id });
    throw err;
  }
}
