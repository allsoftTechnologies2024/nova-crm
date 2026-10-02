import Link from 'next/link';
import { GoogleButton, SignupForm } from '@/components/app/AuthForms';
import { googleConfigured } from '@/lib/auth/google';
import AuthShell from '@/components/marketing/AuthShell';
import { getPlan, getSettings } from '@/lib/services/plans';

export const metadata = { title: 'Create your workspace' };

// Trial length for the "N-day free trial" note under the form (null if the trial is off or its plan is disabled).
async function trialDays() {
  const { trial } = await getSettings();
  return trial.enabled && (await getPlan(trial.planKey))?.active ? trial.days : null;
}

export default async function SignupPage() {
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
      {googleConfigured() && <GoogleButton />}
      <SignupForm trialDays={await trialDays()} />
    </AuthShell>
  );
}
