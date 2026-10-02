import TeamView from '@/components/app/TeamView';
import { requirePage } from '@/lib/auth/session';
import { ROLES, ROLE_META, ROLE_PERMISSIONS, assignableRoles } from '@/lib/rbac';
import { listMembers } from '@/lib/services/team';

export const metadata = { title: 'Team' };

export default async function TeamPage() {
  const auth = await requirePage('team:view');
  const members = await listMembers(auth);
  return (
    <TeamView
      members={members}
      me={auth.user.id}
      myRole={auth.user.role}
      canManage={auth.can('team:manage')}
      assignable={assignableRoles(auth.user.role)}
      seats={{ used: members.filter((m) => m.active).length, limit: Number.isFinite(auth.plan.limits.seats) ? auth.plan.limits.seats : null }}
      matrix={ROLES.map((r) => ({ role: r, ...ROLE_META[r], permissions: [...ROLE_PERMISSIONS[r]] }))}
    />
  );
}
