import { requirePlatformAdmin } from '@/platform/auth/session';
import { deletePlan, planUpdateSchema, updatePlan } from '@/platform/services/plans';
import { parseBody, route } from '@/lib/http';

type P = { key: string };

export const PATCH = route<P>(async (req, { params }) => {
  const actor = await requirePlatformAdmin();
  await updatePlan(actor, (await params).key, await parseBody(req, planUpdateSchema));
});

export const DELETE = route<P>(async (_req, { params }) => {
  const actor = await requirePlatformAdmin();
  await deletePlan(actor, (await params).key);
});
