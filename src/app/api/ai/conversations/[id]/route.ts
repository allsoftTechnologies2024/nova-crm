import { requireAuth } from '@/lib/auth/session';
import { route } from '@/lib/http';
import { deleteConversation, getConversation } from '@/lib/services/conversations';

type P = { id: string };

export const GET = route<P>(async (_req, { params }) => {
  const auth = await requireAuth('ai:use');
  return { conversation: await getConversation(auth, (await params).id) };
});

export const DELETE = route<P>(async (_req, { params }) => {
  const auth = await requireAuth('ai:use');
  await deleteConversation(auth, (await params).id);
});
