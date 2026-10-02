import { cookies } from 'next/headers';
import AdminRail, { AdminHeader } from '@/platform/components/AdminRail';
import { ADMIN_SIDEBAR_COOKIE } from '@/platform/prefs';
import { requirePlatformAdminPage } from '@/platform/auth/session';

export const metadata = { title: { default: 'Platform admin', template: '%s · Platform admin' } };

// Platform console. Uses its own admin account + cookie (see /admin/login); workspace logins never get in.
export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const admin = await requirePlatformAdminPage();
  const railOpen = (await cookies()).get(ADMIN_SIDEBAR_COOKIE)?.value === 'open';
  return (
    <div className="flex min-h-screen bg-[#f7f6f4]">
      <AdminRail defaultOpen={railOpen} />
      <main className="min-w-0 flex-1 px-4 pb-28 sm:px-6 lg:px-8 lg:pb-8">
        <AdminHeader name={admin.name} email={admin.email} />
        {children}
      </main>
    </div>
  );
}
