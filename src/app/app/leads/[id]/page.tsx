import { notFound } from 'next/navigation';
import LeadDetail from '@/components/leads/LeadDetail';
import { requirePage } from '@/lib/auth/session';
import { HttpError } from '@/lib/http';
import { getLead } from '@/lib/services/leads';
import { assigneeOptions } from '@/lib/services/team';

export const metadata = { title: 'Lead' };

export default async function LeadPage({ params }: PageProps<'/app/leads/[id]'>) {
  const auth = await requirePage('lead:read');
  const { id } = await params;
  const lead = await getLead(auth, id).catch((err) => {
    if (err instanceof HttpError && err.status === 404) notFound();
    throw err;
  });
  const assignees = auth.can('lead:assign') ? await assigneeOptions(auth) : [];

  return (
    <LeadDetail
      key={lead.updatedAt}
      lead={lead}
      assignees={assignees}
      perms={{ update: auth.can('lead:update'), delete: auth.can('lead:delete'), assign: auth.can('lead:assign'), ai: auth.can('ai:use') }}
    />
  );
}
