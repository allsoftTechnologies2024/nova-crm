import Link from 'next/link';
import { LoginForm } from '@/components/app/AuthForms';
import AuthShell from '@/components/marketing/AuthShell';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back 👋"
      subtitle="Sign in to pick up where your pipeline left off."
      footer={
        <>
          New to Smart CRM?{' '}
          <Link href="/signup" className="font-semibold text-brand hover:underline">
            Create a free workspace
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
