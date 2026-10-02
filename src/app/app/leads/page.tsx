import LeadsView from '@/components/leads/LeadsView';
import { requirePage } from '@/lib/auth/session';
import { listLeads } from '@/lib/services/leads';
import { assigneeOptions } from '@/lib/services/team';

export const metadata = { title: 'Leads' };

export default async function LeadsPage({ searchParams }: PageProps<'/app/leads'>) {
  const auth = await requirePage('lead:read');
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const view = one(sp.view) === 'list' ? 'list' : 'board';
  const filters = { q: one(sp.q), priority: one(sp.priority), status: view === 'list' ? one(sp.status) : undefined };

  const [leads, assignees] = await Promise.all([
    listLeads(auth, { ...filters, status: filters.status as never, priority: filters.priority as never, limit: 500 }).catch(() => []),
    auth.can('lead:assign') ? assigneeOptions(auth) : Promise.resolve([]),
  ]);

  return (
    <LeadsView
      leads={leads}
      view={view}
      filters={filters}
      add={one(sp.add) === 'ai' ? 'ai' : one(sp.add) === 'new' ? 'new' : ''}
      assignees={assignees}
      perms={{
        create: auth.can('lead:create'),
        update: auth.can('lead:update'),
        assign: auth.can('lead:assign'),
        ai: auth.can('ai:use'),
        readAll: auth.can('lead:read_all'),
      }}
    />
  );
}
