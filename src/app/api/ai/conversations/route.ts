import { requireAuth } from '@/lib/auth/session';
import { route } from '@/lib/http';
import { listConversations } from '@/lib/services/conversations';

export const GET = route(async () => {
  const auth = await requireAuth('ai:use');
  return { conversations: await listConversations(auth) };
});
