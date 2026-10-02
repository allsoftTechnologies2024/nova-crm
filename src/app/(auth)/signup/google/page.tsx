import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { GoogleWorkspaceForm } from '@/components/app/AuthForms';
import AuthShell from '@/components/marketing/AuthShell';
import { GOOGLE_SIGNUP_COOKIE, verifyPendingSignup } from '@/lib/auth/google';
import { getPlan, getSettings } from '@/lib/services/plans';

export const metadata = { title: 'Name your workspace' };

// After "Continue with Google" for someone without an account: ask only for the workspace name.
export default async function GoogleSignupPage() {
  const identity = await verifyPendingSignup((await cookies()).get(GOOGLE_SIGNUP_COOKIE)?.value);
  if (!identity) redirect('/signup');
  const { trial } = await getSettings();
  const trialDays = trial.enabled && (await getPlan(trial.planKey))?.active ? trial.days : null;
  return (
    <AuthShell title="Name your workspace" subtitle="One last step. You'll be the owner and can invite your team.">
      <GoogleWorkspaceForm name={identity.name} email={identity.email} trialDays={trialDays} />
    </AuthShell>
  );
}
