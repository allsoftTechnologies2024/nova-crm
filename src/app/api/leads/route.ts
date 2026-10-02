import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { parseBody, route } from '@/lib/http';
import { createLeads, leadInputSchema, listLeads } from '@/lib/services/leads';

export const GET = route(async (req) => {
  const auth = await requireAuth('lead:read');
  return { leads: await listLeads(auth, Object.fromEntries(new URL(req.url).searchParams)) };
});

// Accepts one lead, or { leads: [...], via } for a bulk save from AI capture.
const bulk = z.object({ leads: z.array(leadInputSchema).min(1).max(50), via: z.enum(['manual', 'ai']).optional() });

export const POST = route(async (req) => {
  const auth = await requireAuth('lead:create');
  const body = await req.json().catch(() => ({}));
  if (body && Array.isArray(body.leads)) {
    const { leads, via } = bulk.parse(body);
    return { ids: await createLeads(auth, leads, via) };
  }
  return { ids: await createLeads(auth, [leadInputSchema.parse(body)]) };
});
