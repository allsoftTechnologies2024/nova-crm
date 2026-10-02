import 'server-only';
import type { z } from 'zod';
import { connectDB } from '@/lib/db';
import { badRequest, notFound } from '@/lib/http';
import { cancelAutopay, createPaymentLink, manualPaymentSchema, paymentLinkSchema, recordManualPayment } from '@/lib/services/billing';
import { getPlan } from '@/lib/services/plans';
import { Organization } from '@/models/Organization';
import { User } from '@/models/User';
import type { AdminContext } from '../auth/session';
import { audit } from './audit';
import { oid } from './_shared';

export { manualPaymentSchema, paymentLinkSchema };

// Platform-side billing actions for one workspace (all audited).

async function orgAndOwner(id: string) {
  await connectDB();
  const org = await Organization.findById(oid(id, 'Workspace'), { name: 1 }).lean();
  if (!org) throw notFound('Workspace not found.');
  const owner = await User.findOne({ orgId: org._id, role: 'owner', active: true }, { name: 1, email: 1 }).lean();
  return { org, owner };
}

export async function sendPaymentLink(actor: AdminContext, orgId: string, input: z.infer<typeof paymentLinkSchema>) {
  const { org, owner } = await orgAndOwner(orgId);
  if (!owner) throw badRequest('This workspace has no active owner to send the link to.');
  const link = await createPaymentLink(orgId, { name: owner.name, email: owner.email }, input, actor.email);
  const planName = (await getPlan(input.plan))?.name ?? input.plan;
  await audit(actor, 'billing.payment_link', 'org', orgId, `${org.name}: payment link for ${planName} (${input.period}) · ₹${(link.amount / 100).toLocaleString('en-IN')}${input.notify ? ` emailed to ${owner.email}` : ''}`);
  return link;
}

export async function addManualPayment(actor: AdminContext, orgId: string, input: z.infer<typeof manualPaymentSchema>) {
  const { org } = await orgAndOwner(orgId);
  await recordManualPayment(orgId, input, actor.email);
  const planName = (await getPlan(input.plan))?.name ?? input.plan;
  await audit(
    actor,
    'billing.manual_payment',
    'org',
    orgId,
    `${org.name}: recorded offline payment ₹${(input.amount / 100).toLocaleString('en-IN')} for ${planName} (${input.period})${input.reference ? ` · ref ${input.reference}` : ''}`
  );
}

export async function adminCancelAutopay(actor: AdminContext, orgId: string) {
  const { org } = await orgAndOwner(orgId);
  await cancelAutopay(orgId, { name: 'Platform support', userId: null });
  await audit(actor, 'billing.autopay_cancel', 'org', orgId, `${org.name}: turned off Autopay`);
}
