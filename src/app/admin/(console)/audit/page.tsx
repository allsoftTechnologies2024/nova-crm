import { When } from '@/components/ui';
import { recentLogs } from '@/platform/services/audit';

export const metadata = { title: 'Audit log' };

const ACTION_LABEL: Record<string, string> = {
  'org.update': 'Workspace updated',
  'org.delete': 'Workspace deleted',
  'user.update': 'User updated',
  'user.password_reset': 'Password reset',
  'user.impersonate': 'Signed in as user',
};

export default async function AuditPage() {
  const logs = await recentLogs(200);
  const label = (action: string) => (
    <span className={`chip ${action.includes('delete') ? 'bg-rose-50 text-rose-600 ring-rose-200' : 'bg-brand/10 text-brand ring-brand/20'}`}>{ACTION_LABEL[action] ?? action}</span>
  );
  return (
    <>
    {/* Phones: one card per entry. */}
    <ul className="space-y-2.5 md:hidden">
      {logs.map((l) => (
        <li key={l.id} className="card p-4">
          <div className="flex flex-wrap items-center gap-2">
            {label(l.action)}
            <span className="ml-auto">
              <When value={l.at} />
            </span>
          </div>
          <p className="mt-2 text-sm">{l.summary}</p>
          <p className="mt-1 text-xs text-muted">by {l.actor}</p>
        </li>
      ))}
      {logs.length === 0 && <li className="card px-5 py-10 text-center text-sm text-muted">No admin actions yet. Every override, suspension, password reset and sign-in-as is recorded here.</li>}
    </ul>
    <div className="card scroll-thin hidden overflow-x-auto md:block">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="text-left text-xs text-muted">
          <tr className="border-b border-line">
            {['When', 'Admin', 'Action', 'Details'].map((h) => (
              <th key={h} className="px-5 py-3.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="whitespace-nowrap px-5 py-3">
                <When value={l.at} />
              </td>
              <td className="px-5 py-3 text-muted">{l.actor}</td>
              <td className="px-5 py-3">{label(l.action)}</td>
              <td className="px-5 py-3">{l.summary}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={4} className="px-5 py-10 text-center text-muted">
                No admin actions yet. Every override, suspension, password reset and sign-in-as is recorded here.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    </>
  );
}
