import SettingsView from '@/components/app/SettingsView';
import { aiUsage, providerConfigured, resolveModel } from '@/lib/ai';
import { PROVIDERS, modelOptions } from '@/lib/ai/models';
import { requirePage } from '@/lib/auth/session';
import { mailConfigured } from '@/lib/mailer';
import { ROLE_META } from '@/lib/rbac';
import { razorpayConfigured } from '@/lib/services/billing';

export const metadata = { title: 'Settings' };

// Everyone manages their own profile and password; workspace, AI and integrations need settings:manage.
export default async function SettingsPage() {
  const auth = await requirePage();
  const manage = auth.can('settings:manage');
  const active = resolveModel(auth.org.ai);

  return (
    <SettingsView
      profile={{ name: auth.user.name, email: auth.user.email, roleLabel: ROLE_META[auth.user.role].label }}
      workspace={
        manage
          ? {
              name: auth.org.name,
              planName: auth.plan.name,
              ai: {
                choice: active ? `${active.provider}:${active.model}` : '',
                options: modelOptions().map((o) => ({ ...o, available: providerConfigured(o.provider) })),
                usage: aiUsage(auth),
              },
              integrations: [
                { name: 'Claude (Anthropic)', ok: providerConfigured('claude'), hint: `Set ${PROVIDERS.claude.envKey}` },
                { name: 'Gemini (Google)', ok: providerConfigured('gemini'), hint: `Set ${PROVIDERS.gemini.envKey}` },
                { name: 'Razorpay payments', ok: razorpayConfigured(), hint: 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET' },
                { name: 'Razorpay webhook', ok: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET), hint: 'Set RAZORPAY_WEBHOOK_SECRET' },
                { name: 'Email (password resets)', ok: mailConfigured(), hint: 'Set SMTP_HOST, SMTP_USER, SMTP_PASS — until then reset links are printed in the server log' },
              ],
            }
          : null
      }
    />
  );
}
