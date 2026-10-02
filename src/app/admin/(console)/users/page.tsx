import { Search } from 'lucide-react';
import UsersTable from '@/platform/components/UsersTable';
import { listUsers } from '@/platform/services/users';

export const metadata = { title: 'Users' };

export default async function UsersPage({ searchParams }: PageProps<'/admin/users'>) {
  const { q } = await searchParams;
  const query = typeof q === 'string' ? q : '';
  const users = await listUsers(query);
  return (
    <div className="space-y-5">
      <form className="flex max-w-md items-center gap-2 rounded-2xl bg-surface px-4 py-2.5 shadow-soft">
        <Search className="size-4 text-muted" />
        <input name="q" defaultValue={query} placeholder="Search name or email across all workspaces" className="w-full bg-transparent text-sm outline-none placeholder:text-muted" />
      </form>
      <UsersTable users={users} />
    </div>
  );
}
