import { ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { When } from '@/components/ui';
import { PLANS } from '@/lib/plans';
import { listOrgs } from '@/platform/services/workspaces';

export const metadata = { title: 'Workspaces' };

export default async function WorkspacesPage({ searchParams }: PageProps<'/admin/workspaces'>) {
  const { q } = await searchParams;
  const query = typeof q === 'string' ? q : '';
  const orgs = await listOrgs(query);

  return (
    <div className="space-y-5">
      <form className="flex max-w-md items-center gap-2 rounded-2xl bg-surface px-4 py-2.5 shadow-soft">
        <Search className="size-4 text-muted" />
        <input name="q" defaultValue={query} placeholder="Search workspace, owner or member email" className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
      </form>

      <div className="card scroll-thin overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-line">
              {['Workspace', 'Plan', 'Members', 'Leads', 'AI this month', 'Status', 'Created', ''].map((h) => (
                <th key={h} className="px-5 py-3.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orgs.map((o) => (
              <tr key={o.id} className="transition hover:bg-brand/[0.03]">
                <td className="px-5 py-3.5">
                  <Link href={`/admin/workspaces/${o.id}`} className="font-bold hover:text-brand">
                    {o.name}
                  </Link>
                  <p className="text-xs text-muted">{o.owner}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className="chip bg-brand/10 text-brand ring-brand/20">{PLANS[o.plan].name}</span>
                  {o.planExpiresAt && o.plan !== 'free' && (
                    <p className="mt-1 text-xs text-muted">until {new Date(o.planExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  )}
                </td>
                <td className="px-5 py-3.5 tabular-nums">{o.users}</td>
                <td className="px-5 py-3.5 tabular-nums">{o.leads.toLocaleString('en-IN')}</td>
                <td className="px-5 py-3.5 tabular-nums">{o.aiUsed}</td>
                <td className="px-5 py-3.5">
                  {o.suspended ? <span className="chip bg-rose-50 text-rose-600 ring-rose-200">Suspended</span> : <span className="chip bg-success/10 text-success ring-success/20">Active</span>}
                </td>
                <td className="px-5 py-3.5">
                  <When value={o.createdAt} ago />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/admin/workspaces/${o.id}`} className="inline-grid size-8 place-items-center rounded-xl text-muted ring-1 ring-line hover:text-brand" aria-label={`Manage ${o.name}`}>
                    <ChevronRight className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-muted">
                  No workspaces match “{query}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
