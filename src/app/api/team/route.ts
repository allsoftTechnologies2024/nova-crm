import { requireAuth } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { addMember, listMembers, newMemberSchema } from '@/lib/services/team';

export const GET = route(async () => {
  const auth = await requireAuth('team:view');
  return { members: await listMembers(auth) };
});

export const POST = route(async (req) => {
  const auth = await requireAuth('team:manage');
  return { id: await addMember(auth, await parseBody(req, newMemberSchema)) };
});
