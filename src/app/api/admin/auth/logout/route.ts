import { endAdminSession } from '@/platform/auth/session';
import { route } from '@/lib/http';

export const POST = route(async () => {
  await endAdminSession();
});
