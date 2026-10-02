import { ForgotForm } from '@/components/app/AuthForms';
import AuthShell from '@/components/marketing/AuthShell';
import { mailConfigured } from '@/lib/mailer';

export const metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your work email and we'll send you a link to set a new one.">
      <ForgotForm devHint={!mailConfigured() && process.env.NODE_ENV !== 'production'} />
    </AuthShell>
  );
}
