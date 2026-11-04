import { ResetForm } from '@/components/app/AuthForms';
import AuthShell from '@/components/marketing/AuthShell';
import { NO_INDEX } from '@/lib/seo';

export const metadata = { title: 'Reset password', robots: NO_INDEX };

export default async function ResetPasswordPage({ searchParams }: PageProps<'/reset-password'>) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password" subtitle="Pick something strong. You'll be signed in right after, and signed out everywhere else.">
      <ResetForm token={typeof token === 'string' ? token : ''} />
    </AuthShell>
  );
}
