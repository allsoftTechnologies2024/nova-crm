import { cookies } from 'next/headers';
import PlanGate from '@/components/app/PlanGate';
import SupportBanner from '@/components/app/SupportBanner';
import Sidebar, { type NavKey } from '@/components/app/Sidebar';
import TopBar from '@/components/app/TopBar';
import { aiUsage } from '@/lib/ai';
import { requirePage } from '@/lib/auth/session';
import { SIDEBAR_COOKIE } from '@/lib/client';
import { ROLE_META } from '@/lib/rbac';

export default async function AppLayout({ children }: LayoutProps<'/app'>) {
  const auth = await requirePage();
  const nav: NavKey[] = ['dashboard', 'leads'];
  if (auth.can('ai:use')) nav.push('copilot');
  if (auth.can('team:view')) nav.push('team');
  nav.push('activity'); // everyone sees their own activity; managers+ see the whole team
  if (auth.can('billing:manage')) nav.push('billing');
  nav.push('settings'); // everyone has profile + password; workspace sections are gated inside

  const sidebarOpen = (await cookies()).get(SIDEBAR_COOKIE)?.value === 'open';
  const user = { name: auth.user.name, roleLabel: ROLE_META[auth.user.role].label };
  const canCreate = auth.can('lead:create');
  // Trial over and nothing paid: lock every page except Billing/Settings (support sessions see the real app).
  const locked = auth.planStatus.locked && !auth.impersonatedBy;

  return (
    <>
      {auth.impersonatedBy && <SupportBanner name={auth.user.name} email={auth.user.email} />}
      {/* Full-screen app with a floating, collapsible black sidebar. */}
      <div className="flex min-h-screen bg-[#f7f6f4]">
        <Sidebar nav={nav} orgName={auth.org.name} defaultOpen={sidebarOpen} user={user} quickAdd={{ lead: canCreate, ai: canCreate && auth.can('ai:use') }} />
        <main className="pb-tabbar min-w-0 flex-1 px-4 sm:px-6 lg:px-8 lg:pb-8">
          <TopBar orgName={auth.org.name} user={user} ai={auth.can('ai:use') ? aiUsage(auth) : null} />
          <PlanGate locked={locked} canBill={auth.can('billing:manage')}>
            {children}
          </PlanGate>
        </main>
      </div>
    </>
  );
}
