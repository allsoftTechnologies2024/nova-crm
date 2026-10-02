import Link from 'next/link';
import { GoogleButton, LoginForm } from '@/components/app/AuthForms';
import { ErrorText } from '@/components/ui';
import { googleConfigured } from '@/lib/auth/google';
import AuthShell from '@/components/marketing/AuthShell';

export const metadata = { title: 'Sign in' };

// Messages for /login?error=… set by the Google sign-in callback.
const GOOGLE_ERRORS: Record<string, string> = {
  google_off: 'Google sign-in is not set up on this server yet.',
  google_cancelled: 'Google sign-in was cancelled.',
  google_state: 'Your Google sign-in timed out. Please try again.',
  google_failed: "We couldn't verify your Google account. Please try again.",
  inactive: 'Your access has been turned off. Ask your workspace admin.',
  suspended: 'This workspace has been suspended. Contact support.',
};

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const error = (await searchParams).error;
  const message = typeof error === 'string' ? GOOGLE_ERRORS[error] : undefined;
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
      {message && (
        <div className="mb-5">
          <ErrorText>{message}</ErrorText>
        </div>
      )}
      {googleConfigured() && <GoogleButton />}
      <LoginForm />
    </AuthShell>
  );
}
