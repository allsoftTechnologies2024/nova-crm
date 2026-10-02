import { requireAuthWhileLocked } from '@/lib/auth/session';
import { route } from '@/lib/http';
import { cancelAutopay } from '@/lib/services/billing';

// Turns Autopay off. Paid time already granted stays.
export const POST = route(async () => {
  const auth = await requireAuthWhileLocked('billing:manage');
  await cancelAutopay(auth.org.id, { name: auth.user.name, userId: auth.user.id });
});
