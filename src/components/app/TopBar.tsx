'use client';

import { Search, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sectionOf } from './Sidebar';

interface Props {
  orgName: string;
  user: { name: string; roleLabel: string };
  ai: { used: number; limit: number } | null;
}

// "Primary / Dashboard" style header with lead search, AI credit pill and the user.
export default function TopBar({ orgName, user, ai }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [searching, setSearching] = useState(false); // phones: search row toggled from the header icon

  // Hairline + soft shadow once content scrolls under the sticky header.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSearching(false);
    router.push(`/app/leads?view=list${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`);
  }

  const searchInput = (autoFocus = false) => (
    <>
      <Search className="size-4 shrink-0 text-fg" strokeWidth={2.4} />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search leads"
        enterKeyHint="search"
        autoFocus={autoFocus}
        className="w-full bg-transparent text-base outline-none placeholder:text-muted sm:text-sm"
        aria-label="Search leads"
      />
    </>
  );

  return (
    <header
      className={`sticky top-0 z-20 -mx-4 mb-5 border-b bg-[#f7f6f4]/85 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-md transition-[border-color,box-shadow] sm:-mx-6 sm:mb-6 sm:px-6 sm:pb-4 sm:pt-5 lg:-mx-8 lg:px-8 lg:pt-7 ${
        scrolled ? 'border-line shadow-[0_8px_24px_-18px_rgb(0_0_0/0.25)]' : 'border-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        <Link href="/app" aria-label="Smart CRM home" className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand text-base font-bold text-white shadow-float lg:hidden">
          S
        </Link>
        <div className="mr-auto min-w-0">
          <p className="truncate text-[11px] font-medium text-muted sm:text-xs">{orgName}</p>
          <p className="truncate text-xl font-bold leading-tight tracking-tight sm:text-2xl">{sectionOf(pathname)}</p>
        </div>
        <button
          onClick={() => setSearching((v) => !v)}
          className={`grid size-10 place-items-center rounded-full transition sm:hidden ${searching ? 'bg-brand text-white' : 'bg-surface-2 text-fg'}`}
          aria-label={searching ? 'Close search' : 'Search leads'}
          aria-expanded={searching}
        >
          {searching ? <X className="size-[18px]" /> : <Search className="size-[18px]" strokeWidth={2.4} />}
        </button>
        <form onSubmit={submit} className="hidden w-64 items-center gap-2 rounded-2xl bg-surface-2 px-3.5 py-2.5 sm:flex">
          {searchInput()}
        </form>
        {ai && (
          <Link href="/app/copilot" className="flex h-10 items-center gap-1.5 rounded-full bg-brand/10 px-3 text-xs font-semibold tabular-nums text-brand-dark sm:rounded-2xl" title="AI actions used this month">
            <Sparkles className="size-3.5" />
            {ai.used}
            <span className="hidden sm:inline">/{ai.limit.toLocaleString('en-IN')}</span>
          </Link>
        )}
        <Link href="/app/settings" className="flex items-center gap-2.5" aria-label="Your profile">
          <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-brand-3 to-brand text-sm font-bold text-white ring-4 ring-surface-2 sm:size-11">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden leading-tight xl:block">
            <span className="block text-sm font-semibold">{user.name}</span>
            <span className="block text-xs text-muted">{user.roleLabel}</span>
          </span>
        </Link>
      </div>
      {searching && (
        <form onSubmit={submit} className="mt-3 flex animate-fade-up items-center gap-2 rounded-2xl bg-surface-2 px-3.5 py-3 sm:hidden">
          {searchInput(true)}
        </form>
      )}
    </header>
  );
}
