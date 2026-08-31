import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from './cn';

/*
 * The soft gray fill differentiates the input from the card beneath it; focus
 * replaces the fill with a 1px ring.
 */
const fieldClasses =
  'h-9 w-full rounded-pill border border-transparent bg-canvas px-3 text-body text-ink outline-none transition-colors placeholder:text-mid-gray focus:border-hairline focus:bg-paper disabled:cursor-not-allowed disabled:opacity-60';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClasses, className)} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldClasses, 'pr-8', className)} />;
}

export function SearchField({
  icon,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  return (
    <div className="relative flex items-center">
      {icon && <span className="pointer-events-none absolute left-3 flex items-center text-mid-gray">{icon}</span>}
      <input {...props} className={cn(fieldClasses, icon && 'pl-9', className)} />
    </div>
  );
}

/** Compact label + control pair used across the toolbar. */
export function FieldShell({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex h-9 items-center gap-2 rounded-pill bg-canvas px-3 text-body text-ink', className)}>
      <span className="whitespace-nowrap text-caption font-medium uppercase text-mid-gray">{label}</span>
      {children}
    </label>
  );
}
