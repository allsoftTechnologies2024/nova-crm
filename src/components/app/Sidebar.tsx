'use client';

import { ChevronLeft, ChevronRight, CreditCard, Ellipsis, History, Home, LayoutGrid, LogOut, Plus, Settings, Sparkles, Users, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from '@/components/ui';
import { SIDEBAR_COOKIE, api } from '@/lib/client';

const ITEMS = [
  { key: 'dashboard', href: '/app', label: 'Dashboard', short: 'Home', icon: Home },
  { key: 'leads', href: '/app/leads', label: 'Leads', short: 'Leads', icon: LayoutGrid },
  { key: 'copilot', href: '/app/copilot', label: 'AI Copilot', short: 'Copilot', icon: Sparkles },
  { key: 'team', href: '/app/team', label: 'Team', short: 'Team', icon: Users },
  { key: 'activity', href: '/app/activity', label: 'Activity', short: 'Activity', icon: History },
  { key: 'billing', href: '/app/billing', label: 'Billing', short: 'Billing', icon: CreditCard },
  { key: 'settings', href: '/app/settings', label: 'Settings', short: 'Settings', icon: Settings },
] as const;
export type NavKey = (typeof ITEMS)[number]['key'];

export const isActive = (pathname: string, href: string) => (href === '/app' ? pathname === '/app' : pathname.startsWith(href));
export const sectionOf = (pathname: string) => [...ITEMS].reverse().find((i) => isActive(pathname, i.href))?.label ?? 'Dashboard';

// Hover label, shown only while the rail is collapsed.
const TIP =
  'pointer-events-none absolute left-full z-50 ml-4 whitespace-nowrap rounded-xl bg-fg px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100';

interface Props {
  nav: NavKey[];
  orgName: string;
  defaultOpen: boolean;
  user: { name: string; roleLabel: string };
  quickAdd: { lead: boolean; ai: boolean };
}

// Floating black rail (desktop, collapsible) / native-style tab bar (mobile). Items are filtered by role on the server.
export default function Sidebar({ nav, orgName, defaultOpen, user, quickAdd }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [sheet, setSheet] = useState<'' | 'more' | 'add'>('');
  const items = ITEMS.filter((i) => nav.includes(i.key));

  function toggle() {
    const next = !open;
    setOpen(next);
    // Cookie (not localStorage) so the server renders the right width on the next load — no flash.
    document.cookie = `${SIDEBAR_COOKIE}=${next ? 'open' : 'closed'}; path=/; max-age=31536000; samesite=lax`;
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  const row = (active: boolean) =>
    `group relative flex h-12 items-center rounded-2xl transition ${open ? 'w-full gap-3 px-3.5' : 'w-12 justify-center'} ${
      active ? 'bg-brand-2 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <>
      <aside
        className={`sticky top-4 z-30 m-4 mr-0 hidden h-[calc(100vh-2rem)] shrink-0 flex-col rounded-[30px] bg-brand py-5 transition-[width] duration-300 lg:flex ${
          open ? 'w-60 items-stretch px-4' : 'w-[76px] items-center px-0'
        }`}
      >
        <button
          onClick={toggle}
          className="absolute -right-3 top-9 z-10 grid size-7 place-items-center rounded-full bg-surface text-brand shadow-soft ring-1 ring-line transition hover:scale-110"
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={open}
        >
          <ChevronLeft className={`size-4 transition-transform duration-300 ${open ? '' : 'rotate-180'}`} strokeWidth={2.6} />
        </button>

        <Link href="/app" className={`flex items-center gap-3 ${open ? 'px-1' : ''}`} aria-label="Smart CRM home">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15 text-lg font-bold text-white ring-1 ring-white/25">S</span>
          {open && (
            <span className="min-w-0 animate-fade-up text-white">
              <span className="block text-base font-bold leading-tight">Smart CRM</span>
              <span className="block truncate text-xs text-white/65">{orgName}</span>
            </span>
          )}
        </Link>
        <span className={`my-5 h-px bg-white/20 ${open ? 'w-full' : 'w-8'}`} />

        <nav className={`flex flex-1 flex-col gap-2 ${open ? '' : 'items-center'}`}>
          {items.map(({ key, href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link key={key} href={href} aria-label={label} aria-current={active ? 'page' : undefined} className={row(active)}>
                <Icon className="size-5 shrink-0" strokeWidth={2.2} />
                {open ? <span className="truncate text-sm font-semibold">{label}</span> : <span className={TIP}>{label}</span>}
              </Link>
            );
          })}
        </nav>

        <button onClick={logout} className={row(false)} aria-label="Sign out">
          <LogOut className="size-5 shrink-0" strokeWidth={2.2} />
          {open ? <span className="text-sm font-semibold">Sign out</span> : <span className={TIP}>Sign out</span>}
        </button>
      </aside>

      <MobileTabBar items={items} pathname={pathname} quickAdd={quickAdd} sheet={sheet} setSheet={setSheet} />

      <Modal open={sheet === 'more'} onClose={() => setSheet('')} title="More">
        <div className="mb-4 flex items-center gap-3 rounded-3xl bg-surface-2 p-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-2 text-lg font-bold text-white">{user.name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="truncate font-bold">{user.name}</p>
            <p className="truncate text-xs text-muted">
              {user.roleLabel} · {orgName}
            </p>
          </div>
        </div>
        <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface-2">
          {items.map(({ key, href, label, icon: Icon }) => (
            <li key={key}>
              <Link href={href} onClick={() => setSheet('')} className="press flex items-center gap-3.5 px-4 py-3.5">
                <span className={`grid size-9 place-items-center rounded-xl ${isActive(pathname, href) ? 'bg-brand text-white' : 'bg-surface text-brand'}`}>
                  <Icon className="size-[18px]" />
                </span>
                <span className="flex-1 font-semibold">{label}</span>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
        <button onClick={logout} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-3xl bg-rose-50 py-3.5 font-semibold text-rose-600">
          <LogOut className="size-[18px]" /> Sign out
        </button>
      </Modal>

      <Modal open={sheet === 'add'} onClose={() => setSheet('')} title="Add leads">
        <div className="grid gap-3">
          {quickAdd.ai && (
            <Link href="/app/leads?add=ai" onClick={() => setSheet('')} className="press panel-brand flex items-center gap-4 p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <Wand2 className="size-6" />
              </span>
              <span>
                <span className="block font-bold">AI capture</span>
                <span className="block text-sm text-white/75">Paste notes, dictate, or snap a business card</span>
              </span>
            </Link>
          )}
          <Link href="/app/leads?add=new" onClick={() => setSheet('')} className="press flex items-center gap-4 rounded-3xl bg-surface-2 p-4">
            <span className="icon-tile size-12 shrink-0">
              <Plus className="size-6" />
            </span>
            <span>
              <span className="block font-bold">New lead</span>
              <span className="block text-sm text-muted">Fill in the details yourself</span>
            </span>
          </Link>
        </div>
      </Modal>
    </>
  );
}

type Item = (typeof ITEMS)[number];

// Bottom tab bar: Home · Leads · (+) · one more section · More. Everything else lives in the "More" sheet.
function MobileTabBar({
  items,
  pathname,
  quickAdd,
  sheet,
  setSheet,
}: {
  items: Item[];
  pathname: string;
  quickAdd: Props['quickAdd'];
  sheet: string;
  setSheet: (s: '' | 'more' | 'add') => void;
}) {
  const left: Item[] = items.filter((i) => i.key === 'dashboard' || i.key === 'leads');
  const rest = items.filter((i) => !left.includes(i));
  const right = rest.slice(0, 1);
  const moreActive = rest.slice(1).some((i) => isActive(pathname, i.href));

  const tab = (active: boolean) => `press flex flex-1 flex-col items-center gap-1 pt-2 text-[10px] font-semibold ${active ? 'text-brand' : 'text-muted'}`;
  const pill = (active: boolean) => `grid h-8 w-14 place-items-center rounded-full transition ${active ? 'bg-brand/12' : ''}`;
  const link = ({ key, href, short, icon: Icon }: Item) => {
    const active = isActive(pathname, href) && !sheet;
    return (
      <Link key={key} href={href} aria-current={active ? 'page' : undefined} className={tab(active)}>
        <span className={pill(active)}>
          <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} />
        </span>
        {short}
      </Link>
    );
  };

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-surface/90 shadow-[0_-10px_30px_-20px_rgb(0_0_0/0.25)] backdrop-blur-xl lg:hidden" aria-label="Main">
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-1">
        {left.map(link)}
        {(quickAdd.lead || quickAdd.ai) && (
          <div className="flex flex-1 justify-center">
            <button
              onClick={() => setSheet('add')}
              aria-label="Add leads"
              className="-mt-5 grid size-14 place-items-center rounded-[20px] bg-brand text-white ring-[5px] ring-[#f7f6f4] transition active:scale-95"
            >
              <Plus className="size-7" strokeWidth={2.4} />
            </button>
          </div>
        )}
        {right.map(link)}
        <button onClick={() => setSheet('more')} className={tab(sheet === 'more' || moreActive)} aria-label="More">
          <span className={pill(sheet === 'more' || moreActive)}>
            <Ellipsis className="size-[22px]" />
          </span>
          More
        </button>
      </div>
    </nav>
  );
}
