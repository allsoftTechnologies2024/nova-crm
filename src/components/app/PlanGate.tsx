'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// Pages a locked workspace can still open: Billing to subscribe, Settings for profile + password.
const OPEN_WHEN_LOCKED = ['/app/billing', '/app/settings'];

// Replaces the page with a choose-a-plan screen once the trial has ended and nothing is paid for.
// The API enforces the same lock (requireAuth → 402); this is the friendly face of it.
export default function PlanGate({ locked, canBill, children }: { locked: boolean; canBill: boolean; children: ReactNode }) {
  const pathname = usePathname();
  if (!locked || OPEN_WHEN_LOCKED.some((p) => pathname.startsWith(p))) return children;
  return (
    <div className="grid min-h-[60vh] place-items-center py-10">
      <div className="card max-w-md p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-2 text-white">
          <Lock className="size-6" />
        </span>
        <h2 className="mt-5 text-2xl font-bold tracking-tight">Your free trial has ended</h2>
        <p className="mt-2 text-sm text-muted">
          {canBill
            ? 'Your leads and history are safe. Choose a plan to unlock your workspace and pick up where you left off.'
            : 'Your leads and history are safe. Ask your workspace owner to choose a plan to unlock it.'}
        </p>
        {canBill ? (
          <Link href="/app/billing" className="btn-primary mt-6 w-full py-3">
            Choose a plan
          </Link>
        ) : (
          <Link href="/app/settings" className="btn-ghost mt-6 w-full py-3">
            Account settings
          </Link>
        )}
      </div>
    </div>
  );
}
