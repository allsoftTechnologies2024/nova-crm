import AdminsView from '@/platform/components/AdminsView';
import { requirePlatformAdminPage } from '@/platform/auth/session';
import { listAdmins } from '@/platform/services/admins';

export const metadata = { title: 'Platform admins' };

export default async function AdminsPage() {
  const me = await requirePlatformAdminPage();
  return <AdminsView admins={await listAdmins()} meId={me.id} />;
}
