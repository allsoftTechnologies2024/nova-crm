import { requirePlatformAdminPage } from '@/platform/auth/session';
import PlansManager from '@/platform/components/PlansManager';
import { plansOverview } from '@/platform/services/plans';

export const metadata = { title: 'Plans' };

export default async function PlansPage() {
  await requirePlatformAdminPage();
  const { plans, settings } = await plansOverview();
  return <PlansManager plans={plans} settings={settings} />;
}
