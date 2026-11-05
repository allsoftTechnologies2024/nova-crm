'use client';

import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { formatWhen, timeAgo } from '@/lib/client';
import { PRIORITY_META, STATUS_META, type LeadPriority, type LeadStatus } from '@/lib/lead-meta';

// Same artwork as public/brand/*.svg, inlined so the wordmark can follow the surrounding text colour.
function MarkShapes({ inverted = false }: { inverted?: boolean }) {
  return (
    <>
      <rect width="64" height="64" rx="16" fill={inverted ? '#ffffff' : '#151515'} />
      <path d="M30 14.5A8.75 8.75 0 0 0 30 32A8.75 8.75 0 0 1 30 49.5H20.5" fill="none" stroke={inverted ? '#151515' : '#ffffff'} strokeWidth="9" strokeLinecap="round" />
      <circle cx="43" cy="14.5" r="5.5" fill="#f26b2f" />
    </>
  );
}

export function BrandMark({ inverted = false, className = 'size-8' }: { inverted?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <MarkShapes inverted={inverted} />
    </svg>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 232 64" className={`h-8 w-auto ${className}`} role="img" aria-label="Smalo">
      <MarkShapes />
      <g transform="translate(80 20.5) scale(1.08)" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3.5H9A5.25 5.25 0 0 0 9 14A5.25 5.25 0 0 1 9 24.5H4" />
        <path d="M27 24.5V3.5M27 10.5A7 7 0 0 1 41 10.5V24.5M41 10.5A7 7 0 0 1 55 10.5V24.5" />
        <circle cx="78.5" cy="14" r="10.5" />
        <path d="M89 3.5V24.5" />
        <path d="M102 -10V24.5" />
        <circle cx="125.5" cy="14" r="10.5" />
      </g>
    </svg>
  );
}

export function StatusChip({ status }: { status: LeadStatus }) {
  const m = STATUS_META[status];
  return <span className={`chip ${m.tone}`}>{m.label}</span>;
}

export function PriorityDot({ priority, label = false }: { priority: LeadPriority; label?: boolean }) {
  const m = PRIORITY_META[priority];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" title={`${m.label} priority`}>
      <span className={`size-2 rounded-full ${m.dot}`} />
      {label && m.label}
    </span>
  );
}

// Circular 0–100 AI score.
export function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 70 ? '#3fae6a' : score >= 40 ? '#f0a531' : '#c4321f';
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }} title={`AI score ${score}/100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-line)" strokeWidth={4} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span className="absolute text-[11px] font-bold tabular-nums">{score}</span>
    </span>
  );
}

// Centered dialog on desktop; slides up as a bottom sheet on phones.
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    // Stop the page behind the sheet from scrolling.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-[#151515]/35 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        className={`max-h-[92dvh] w-full animate-sheet-up overflow-y-auto overscroll-contain rounded-t-[28px] bg-surface px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 shadow-frame scroll-thin sm:max-h-[90vh] sm:animate-fade-up sm:rounded-[28px] sm:p-6 ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <span className="sheet-handle" aria-hidden />
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted hover:text-fg sm:size-8 sm:rounded-xl" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="sr-only">{title}</h1>
        {subtitle && <p className="text-sm font-medium text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="grid w-full auto-cols-fr grid-flow-col gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">{actions}</div>}
    </div>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-2xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">{children}</p>;
}

export function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = !Number.isFinite(limit);
  const pct = unlimited ? 4 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs font-semibold">
        <span>{label}</span>
        <span className="tabular-nums text-muted">
          {used.toLocaleString('en-IN')} / {unlimited ? '∞' : limit.toLocaleString('en-IN')}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full ${pct > 85 ? 'bg-brand-2' : 'bg-success'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Local-time rendering of a date (the server's timezone may differ from the user's).
export function When({ value, overdueTone = false, ago = false }: { value: string; overdueTone?: boolean; ago?: boolean }) {
  const late = overdueTone && new Date(value) < new Date();
  return (
    <span suppressHydrationWarning className={`text-xs tabular-nums ${late ? 'font-semibold text-rose-500' : 'text-muted'}`}>
      {ago ? timeAgo(value) : formatWhen(value)}
    </span>
  );
}
