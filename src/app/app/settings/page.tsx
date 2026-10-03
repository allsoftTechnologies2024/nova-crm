import SettingsView from '@/components/app/SettingsView';
import { aiUsage, modelChoices, resolveForOrg } from '@/lib/ai';
import { requirePage } from '@/lib/auth/session';
import { ROLE_META } from '@/lib/rbac';

export const metadata = { title: 'Settings' };

// Everyone manages their own profile and password; workspace and AI need settings:manage.
export default async function SettingsPage() {
  const auth = await requirePage();
  const manage = auth.can('settings:manage');
  const [active, choices] = await Promise.all([resolveForOrg(auth.org), modelChoices(auth.org.aiPolicy)]);
  const status = auth.planStatus;

  return (
    <SettingsView
      profile={{ name: auth.user.name, email: auth.user.email, roleLabel: ROLE_META[auth.user.role].label }}
      workspace={
        manage
          ? {
              name: auth.org.name,
              plan: {
                name: auth.plan.name,
                note: status.locked
                  ? 'Trial ended — choose a plan to continue'
                  : status.onTrial
                    ? `Free trial · ${status.daysLeft ?? 0} day${status.daysLeft === 1 ? '' : 's'} left`
                    : status.expiresAt && !status.expired
                      ? `Paid until ${new Date(status.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}`
                      : '',
                canManage: auth.can('billing:manage'),
              },
              ai: {
                choice: active?.key ?? '',
                // Only models the platform allows for this workspace.
                options: choices.map((c) => ({ provider: c.provider, model: c.model, label: c.label, available: c.configured })),
                locked: auth.org.aiPolicy.locked,
                usage: aiUsage(auth),
              },
            }
          : null
      }
    />
  );
}
