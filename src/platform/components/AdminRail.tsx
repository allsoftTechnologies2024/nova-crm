'use client';

import { Building2, ChevronLeft, Cpu, CreditCard, Layers, KeyRound, LayoutDashboard, LogOut, ScrollText, ShieldCheck, UserCog, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client';
import { ADMIN_SIDEBAR_COOKIE } from '@/platform/prefs';

const ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/workspaces', label: 'Workspaces', icon: Building2 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/plans', label: 'Plans', icon: Layers },
  { href: '/admin/ai-models', label: 'AI models', icon: Cpu },
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

// Dark rail so the platform console is never confused with a workspace. Collapsible on desktop.
export default function AdminRail({ defaultOpen }: { defaultOpen: boolean }) {
  const pathname = usePathname();
  const signOut = useSignOut();
  const [open, setOpen] = useState(defaultOpen);

  function toggle() {
    const next = !open;
    setOpen(next);
    document.cookie = `${ADMIN_SIDEBAR_COOKIE}=${next ? 'open' : 'closed'}; path=/admin; max-age=31536000; samesite=lax`;
  }

  const row = (isActive: boolean) =>
    `group relative flex h-12 items-center rounded-2xl transition ${open ? 'w-full gap-3 px-3.5' : 'w-12 justify-center'} ${
      isActive ? 'bg-brand-2 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <>
      <aside
        className={`sticky top-4 z-30 m-4 mr-0 hidden h-[calc(100vh-2rem)] shrink-0 flex-col rounded-[30px] bg-fg py-5 transition-[width] duration-300 lg:flex ${
          open ? 'w-60 items-stretch px-4' : 'w-[76px] items-center px-0'
        }`}
      >
        <button
          onClick={toggle}
          className="absolute -right-3 top-9 z-10 grid size-7 place-items-center rounded-full bg-surface text-fg ring-1 ring-line transition hover:scale-110"
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={open}
        >
          <ChevronLeft className={`size-4 transition-transform duration-300 ${open ? '' : 'rotate-180'}`} strokeWidth={2.6} />
        </button>

        <div className={`flex items-center gap-3 ${open ? 'px-1' : ''}`}>
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-2 text-white" title="Platform admin">
            <ShieldCheck className="size-5" />
          </span>
          {open && (
            <span className="min-w-0 animate-fade-up text-white">
              <span className="block text-base font-bold leading-tight">Platform</span>
              <span className="block truncate text-xs text-white/55">Admin console</span>
            </span>
          )}
        </div>
        <span className={`my-5 h-px bg-white/15 ${open ? 'w-full' : 'w-8'}`} />

        <nav className={`flex flex-1 flex-col gap-2 ${open ? '' : 'items-center'}`}>
          {ITEMS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-label={label} aria-current={active(pathname, href) ? 'page' : undefined} className={row(active(pathname, href))}>
              <Icon className="size-5 shrink-0" strokeWidth={2.2} />
              {open ? <span className="truncate text-sm font-semibold">{label}</span> : <span className={TIP}>{label}</span>}
            </Link>
          ))}
        </nav>
        <button onClick={signOut} aria-label="Sign out" className={row(false)}>
          <LogOut className="size-5 shrink-0" />
          {open ? <span className="text-sm font-semibold">Sign out</span> : <span className={TIP}>Sign out</span>}
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
