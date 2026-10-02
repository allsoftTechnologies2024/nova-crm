import { requireAuth } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { memberUpdateSchema, updateMember } from '@/lib/services/team';

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const auth = await requireAuth('team:manage');
  await updateMember(auth, (await params).id, await parseBody(req, memberUpdateSchema));
});
