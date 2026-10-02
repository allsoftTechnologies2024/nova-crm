import { requireAuth } from '@/lib/auth/session';
import { route } from '@/lib/http';
import { listActivity } from '@/lib/services/activity';

// Paged workspace activity. Members without activity:view_all only get their own rows.
export const GET = route(async (req) => {
  const auth = await requireAuth();
  return listActivity(auth, Object.fromEntries(new URL(req.url).searchParams));
});
