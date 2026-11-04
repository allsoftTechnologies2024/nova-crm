'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ErrorText, When } from '@/components/ui';
import { RoleSelect, UserButtons, type AdminUser } from './UserActions';

type Row = AdminUser & { org: { id: string; name: string; suspended: boolean }; createdAt: string };

export default function UsersTable({ users }: { users: Row[] }) {
  const [error, setError] = useState('');
  return (
    <div className="space-y-4">
      <ErrorText>{error}</ErrorText>
      {/* Phones: one card per user, same controls as the table. */}
      <ul className="space-y-2.5 md:hidden">
        {users.map((u) => (
          <li key={u.id} className={`card space-y-3 p-4 ${u.active ? '' : 'opacity-55'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{u.name}</p>
                <p className="truncate text-xs text-muted">{u.email}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold">{u.active ? <span className="text-success">Active</span> : <span className="text-muted">Deactivated</span>}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <Link href={`/admin/workspaces/${u.org.id}`} className="font-semibold text-fg hover:text-brand">
                {u.org.name}
              </Link>
              {u.org.suspended && <span className="chip bg-rose-50 text-rose-600 ring-rose-200">Suspended</span>}
              <span>
                · joined <When value={u.createdAt} ago />
              </span>
            </div>
            <RoleSelect user={u} onError={setError} />
            <UserButtons user={u} onError={setError} />
          </li>
        ))}
        {users.length === 0 && <li className="card px-5 py-10 text-center text-sm text-muted">No users found.</li>}
      </ul>

      <div className="card scroll-thin hidden overflow-x-auto md:block">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-line">
              {['User', 'Workspace', 'Role', 'Status', 'Joined', ''].map((h) => (
                <th key={h} className="px-5 py-3.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'opacity-55'}>
                <td className="px-5 py-3">
                  <p className="font-bold">
                    {u.name}
                  </p>
                  <p className="text-xs text-muted">{u.email}</p>
                </td>
                <td className="px-5 py-3">
                  <Link href={`/admin/workspaces/${u.org.id}`} className="font-semibold hover:text-brand">
                    {u.org.name}
                  </Link>
                  {u.org.suspended && <span className="chip ml-2 bg-rose-50 text-rose-600 ring-rose-200">Suspended</span>}
                </td>
                <td className="px-5 py-3">
                  <RoleSelect user={u} onError={setError} />
                </td>
                <td className="px-5 py-3 text-xs font-semibold">{u.active ? <span className="text-success">Active</span> : <span className="text-muted">Deactivated</span>}</td>
                <td className="px-5 py-3">
                  <When value={u.createdAt} ago />
                </td>
                <td className="px-5 py-3">
                  <UserButtons user={u} onError={setError} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
