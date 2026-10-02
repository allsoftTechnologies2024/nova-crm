import { requireAuth } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { deleteLead, getLead, leadInputSchema, updateLead } from '@/lib/services/leads';

type P = { id: string };

export const GET = route<P>(async (_req, { params }) => {
  const auth = await requireAuth('lead:read');
  return { lead: await getLead(auth, (await params).id) };
});

export const PATCH = route<P>(async (req, { params }) => {
  const auth = await requireAuth('lead:update');
  return { lead: await updateLead(auth, (await params).id, await parseBody(req, leadInputSchema)) };
});

export const DELETE = route<P>(async (_req, { params }) => {
  const auth = await requireAuth('lead:delete');
  await deleteLead(auth, (await params).id);
});
