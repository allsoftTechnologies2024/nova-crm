import AdminAccount from '@/platform/components/AdminAccount';
import { requirePlatformAdminPage } from '@/platform/auth/session';

export const metadata = { title: 'My account' };

export default async function AdminAccountPage() {
  const me = await requirePlatformAdminPage();
  return <AdminAccount name={me.name} email={me.email} />;
}
