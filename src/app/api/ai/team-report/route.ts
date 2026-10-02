import { generateTeamReport, periodSchema } from '@/lib/ai/team-report';
import { requireAuth } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';

// One AI credit per report; the result is saved and shown until regenerated.
export const POST = route(async (req) => {
  const auth = await requireAuth('activity:view_all', 'ai:use');
  const { period, now } = await parseBody(req, periodSchema);
  return { report: await generateTeamReport(auth, period, now) };
});
