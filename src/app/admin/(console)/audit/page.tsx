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
  return (
    <div className="card scroll-thin overflow-x-auto">
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
              <td className="px-5 py-3">
                <span className={`chip ${l.action.includes('delete') ? 'bg-rose-50 text-rose-600 ring-rose-200' : 'bg-brand/10 text-brand ring-brand/20'}`}>{ACTION_LABEL[l.action] ?? l.action}</span>
              </td>
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
  );
}
