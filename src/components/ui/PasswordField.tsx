'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

// 0–4 rough strength score: length + character variety.
export function passwordScore(pw: string) {
  if (!pw) return 0;
  let s = pw.length >= 8 ? 1 : 0;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const LEVELS = [
  { label: 'Too short', bar: 'bg-rose-400' },
  { label: 'Weak', bar: 'bg-rose-400' },
  { label: 'Okay', bar: 'bg-amber-400' },
  { label: 'Good', bar: 'bg-success' },
  { label: 'Strong', bar: 'bg-success' },
];

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  showStrength?: boolean;
  placeholder?: string;
}

export default function PasswordField({ label, value, onChange, autoComplete, showStrength, placeholder }: Props) {
  const [show, setShow] = useState(false);
  const score = passwordScore(value);
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <input
          className="input pr-11"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={autoComplete === 'new-password' ? 8 : 1}
          placeholder={placeholder}
          required
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-xl text-muted hover:text-fg"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
      {showStrength && value && (
        <span className="mt-2 flex items-center gap-2">
          <span className="flex flex-1 gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= score ? LEVELS[score].bar : 'bg-surface-2'}`} />
            ))}
          </span>
          <span className="w-16 text-right text-[11px] font-semibold text-muted">{LEVELS[score].label}</span>
        </span>
      )}
    </label>
  );
}
