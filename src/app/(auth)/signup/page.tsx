import Link from 'next/link';
import { SignupForm } from '@/components/app/AuthForms';
import AuthShell from '@/components/marketing/AuthShell';

export const metadata = { title: 'Create your workspace' };

export default function SignupPage() {
  return (
    <AuthShell
      title="Start selling with AI"
      subtitle="Create your workspace in under a minute. You'll be the owner and can invite your team."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
