import { requirePlatformAdminPage } from '@/platform/auth/session';
import AiModelsManager from '@/platform/components/AiModelsManager';
import { aiCatalog } from '@/platform/services/ai';

export const metadata = { title: 'AI models' };

export default async function AiModelsPage() {
  await requirePlatformAdminPage();
  return <AiModelsManager {...await aiCatalog()} />;
}
