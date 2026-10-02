'use client';

import { Building2, CreditCard, KeyRound, LayoutDashboard, LogOut, ScrollText, ShieldCheck, UserCog, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/client';

const ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/workspaces', label: 'Workspaces', icon: Building2 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
  { href: '/admin/admins', label: 'Platform admins', icon: UserCog },
  { href: '/admin/account', label: 'My account', icon: KeyRound },
];
const active = (p: string, href: string) => (href === '/admin' ? p === '/admin' : p.startsWith(href));
export const adminSection = (p: string) => [...ITEMS].reverse().find((i) => active(p, i.href))?.label ?? 'Overview';

const TIP =
  'pointer-events-none absolute left-full z-50 ml-4 whitespace-nowrap rounded-xl bg-fg px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100';

function useSignOut() {
  const router = useRouter();
  return async () => {
    await api('/api/admin/auth/logout', { method: 'POST', body: {} });
    router.replace('/admin/login');
    router.refresh();
  };
}

// Dark rail so the platform console is never confused with a workspace.
export default function AdminRail() {
  const pathname = usePathname();
  const signOut = useSignOut();
  return (
    <>
      <aside className="sticky top-4 z-30 m-4 mr-0 hidden h-[calc(100vh-2rem)] w-[76px] shrink-0 flex-col items-center rounded-[30px] bg-fg py-5 lg:flex">
        <span className="grid size-11 place-items-center rounded-2xl bg-brand-2 text-white" title="Platform admin">
          <ShieldCheck className="size-5" />
        </span>
        <span className="my-5 h-px w-8 bg-white/15" />
        <nav className="flex flex-1 flex-col items-center gap-3">
          {ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`group relative grid size-12 place-items-center rounded-2xl transition ${active(pathname, href) ? 'bg-brand-2 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
            >
              <Icon className="size-5" strokeWidth={2.2} />
              <span className={TIP}>{label}</span>
            </Link>
          ))}
        </nav>
        <button onClick={signOut} aria-label="Sign out" className="group relative grid size-12 place-items-center rounded-2xl text-white/60 transition hover:bg-white/10 hover:text-white">
          <LogOut className="size-5" />
          <span className={TIP}>Sign out</span>
        </button>
      </aside>

      <nav className="scroll-thin fixed inset-x-3 bottom-3 z-40 flex justify-between gap-1 overflow-x-auto rounded-[26px] bg-fg px-2 py-2 lg:hidden">
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-label={label} className={`grid size-11 shrink-0 place-items-center rounded-2xl ${active(pathname, href) ? 'bg-brand-2 text-white' : 'text-white/60'}`}>
            <Icon className="size-5" />
          </Link>
        ))}
      </nav>
    </>
  );
}

export function AdminHeader({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const signOut = useSignOut();
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-3 border-b border-line bg-[#f7f6f4]/85 px-4 pb-4 pt-5 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 lg:pt-7">
      <div className="mr-auto">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-2">
          <ShieldCheck className="size-3.5" /> Platform admin
        </p>
        <p className="text-2xl font-bold tracking-tight">{adminSection(pathname)}</p>
      </div>
      <div className="hidden text-right leading-tight sm:block">
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs text-muted">{email}</p>
      </div>
      <button className="btn-ghost" onClick={signOut}>
        <LogOut className="size-4" /> Sign out
      </button>
    </header>
  );
}
