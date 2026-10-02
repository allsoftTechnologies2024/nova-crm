import { notFound } from 'next/navigation';
import OrgDetail from '@/platform/components/OrgDetail';
import { providerConfigured } from '@/lib/ai';
import { modelOptions } from '@/lib/ai/models';
import { HttpError } from '@/lib/http';
import { allPlans, getSettings } from '@/lib/services/plans';
import { getOrgDetail } from '@/platform/services/workspaces';

export const metadata = { title: 'Workspace' };

export default async function WorkspaceAdminPage({ params }: PageProps<'/admin/workspaces/[id]'>) {
  const { id } = await params;
  const org = await getOrgDetail(id).catch((err) => {
    if (err instanceof HttpError && err.status === 404) notFound();
    throw err;
  });
  const [plans, settings] = await Promise.all([allPlans(), getSettings()]);
  return <OrgDetail org={org} plans={plans} trial={settings.trial} models={modelOptions().map((o) => ({ ...o, available: providerConfigured(o.provider) }))} />;
}
