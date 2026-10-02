'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption<V extends string = string> {
  value: V;
  label: ReactNode;
  /** Plain text used for type-ahead and the trigger's title (defaults to label when it's a string). */
  text?: string;
  hint?: ReactNode;
  icon?: ReactNode; // e.g. a status dot
  disabled?: boolean;
  group?: string;
}

interface Props<V extends string> {
  value: V;
  onChange: (value: V) => void;
  options: SelectOption<V>[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string; // applied to the trigger (e.g. width)
  'aria-label'?: string;
}

const textOf = (o: SelectOption) => o.text ?? (typeof o.label === 'string' ? o.label : String(o.value));

// Accessible custom dropdown (listbox pattern). The menu renders in a portal with fixed positioning,
// so it is never clipped by scrolling cards or modals, and flips upward near the bottom of the screen.
export default function Select<V extends string>({ value, onChange, options, placeholder = 'Select…', disabled, size = 'md', className = '', ...rest }: Props<V>) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; up: boolean; maxH: number; sheet: boolean } | null>(null);
  const typed = useRef({ text: '', at: 0 });

  const selected = options.find((o) => o.value === value);
  const enabled = (i: number) => i >= 0 && i < options.length && !options[i].disabled;

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 220 && above > below;
    // Phones get a bottom-sheet picker instead of a tiny anchored menu.
    const sheet = window.innerWidth < 640;
    setPos({ left: r.left, top: up ? r.top - 6 : r.bottom + 6, width: Math.max(r.width, 200), up, maxH: Math.min(320, up ? above : below), sheet });
  }, []);

  function openMenu() {
    if (disabled) return;
    place();
    const idx = options.findIndex((o) => o.value === value);
    setActive(enabled(idx) ? idx : options.findIndex((o) => !o.disabled));
    setOpen(true);
  }

  function close(focusTrigger = true) {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }

  function choose(i: number) {
    if (!enabled(i)) return;
    if (options[i].value !== value) onChange(options[i].value);
    close();
  }

  function move(from: number, step: 1 | -1) {
    for (let i = from + step; i >= 0 && i < options.length; i += step) if (enabled(i)) return i;
    return from;
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((a) => move(a, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((a) => move(a, -1));
        break;
      case 'Home':
        e.preventDefault();
        setActive(move(-1, 1));
        break;
      case 'End':
        e.preventDefault();
        setActive(move(options.length, -1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(active);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default:
        // Type-ahead: jump to the first option starting with the typed letters.
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const now = Date.now();
          typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : '') + e.key.toLowerCase(), at: now };
          const i = options.findIndex((o) => !o.disabled && textOf(o).toLowerCase().startsWith(typed.current.text));
          if (i >= 0) setActive(i);
        }
    }
  }

  // Close on outside click; keep the menu attached while scrolling/resizing.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !listRef.current?.contains(t) && !sheetRef.current?.contains(t)) close(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  // Keep the active option in view.
  useLayoutEffect(() => {
    if (open && active >= 0) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const sizing = size === 'sm' ? 'py-2 pl-3 pr-8 text-sm sm:py-1.5 sm:text-xs' : 'py-3 pl-3.5 pr-10 text-base sm:py-2.5 sm:text-sm';

  const list = (className: string, style?: React.CSSProperties) => (
    <ul ref={listRef} id={`${id}-list`} role="listbox" tabIndex={-1} onKeyDown={onKeyDown} style={style} className={`scroll-thin overflow-y-auto ${className}`}>
      {options.map((o, i) => {
        const showGroup = o.group && o.group !== options[i - 1]?.group;
        const isSel = o.value === value;
        return (
          <li key={o.value} role="presentation">
            {showGroup && <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted">{o.group}</p>}
            <div
              id={`${id}-opt-${i}`}
              data-index={i}
              role="option"
              aria-selected={isSel}
              aria-disabled={o.disabled || undefined}
              onMouseEnter={() => enabled(i) && setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-3 text-base transition sm:py-2 sm:text-sm ${
                o.disabled ? 'cursor-not-allowed opacity-45' : i === active ? 'bg-brand/10 text-brand-dark' : 'text-fg'
              } ${isSel ? 'font-semibold' : ''}`}
            >
              {o.icon}
              <span className="min-w-0 flex-1">
                <span className="block truncate">{o.label}</span>
                {o.hint && <span className="block truncate text-xs font-normal text-muted">{o.hint}</span>}
              </span>
              {isSel && <Check className="size-4 shrink-0 text-brand" strokeWidth={2.6} />}
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
        aria-label={rest['aria-label']}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
        title={selected ? textOf(selected) : undefined}
        className={`relative flex ${/(^|\s)w-/.test(className) ? '' : 'w-full'} items-center gap-2 rounded-2xl border bg-surface-2 text-left font-medium text-fg outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${sizing} ${
          open ? 'border-brand/40 bg-surface ring-4 ring-brand/10' : 'border-transparent hover:bg-brand/5 focus-visible:border-brand/40 focus-visible:ring-4 focus-visible:ring-brand/10'
        } ${className}`}
      >
        {selected?.icon}
        <span className={`min-w-0 flex-1 truncate ${selected ? '' : 'text-muted/70'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`pointer-events-none absolute right-3 size-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open &&
        pos &&
        createPortal(
          pos.sheet ? (
            <div className="fixed inset-0 z-[70] flex animate-fade-in items-end bg-[#151515]/35 backdrop-blur-sm">
              <div ref={sheetRef} className="w-full animate-sheet-up rounded-t-[28px] bg-surface px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 shadow-frame">
                <span className="sheet-handle" aria-hidden />
                {rest['aria-label'] && <p className="px-3 pb-2 text-sm font-bold">{rest['aria-label']}</p>}
                {list('max-h-[60dvh] overscroll-contain')}
              </div>
            </div>
          ) : (
            list(
              'fixed z-[70] max-w-[min(420px,calc(100vw-24px))] animate-fade-up rounded-2xl bg-surface p-1.5 shadow-frame ring-1 ring-line',
              { left: pos.left, top: pos.top, minWidth: pos.width, maxHeight: pos.maxH, transform: pos.up ? 'translateY(-100%)' : undefined }
            )
          ),
          document.body
        )}
    </>
  );
}
