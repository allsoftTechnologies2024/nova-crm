import { z } from 'zod';
import { requirePlatformAdmin } from '@/platform/auth/session';
import { parseBody, route } from '@/lib/http';
import { deleteOrg, orgUpdateSchema, updateOrg } from '@/platform/services/workspaces';

type P = { id: string };

export const PATCH = route<P>(async (req, { params }) => {
  const actor = await requirePlatformAdmin();
  await updateOrg(actor, (await params).id, await parseBody(req, orgUpdateSchema));
});

export const DELETE = route<P>(async (req, { params }) => {
  const actor = await requirePlatformAdmin();
  const { confirmName } = await parseBody(req, z.object({ confirmName: z.string() }));
  await deleteOrg(actor, (await params).id, confirmName);
});
