import type { ReactNode } from 'react';

// "@handle" speech bubble; colour comes from the bg-* class passed in.
export default function Bubble({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`bubble ${className}`}>{children}</span>;
}
