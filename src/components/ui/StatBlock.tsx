import type { ReactNode } from 'react';
import { cn } from './cn';
import { toneColor, type Tone } from '../../theme/tokens';

type StatBlockProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizes = {
  sm: 'text-heading-sm',
  md: 'text-heading',
  lg: 'text-heading-lg',
};

/*
 * The block relies on typographic scale alone — a 12px uppercase label over a
 * tightly tracked number — with no card chrome of its own.
 */
export function StatBlock({ label, value, hint, tone, size = 'sm', className }: StatBlockProps) {
  return (
    <div className={cn('motion-nested rounded-nested bg-surface-alt px-4 py-3', className)}>
      <div className="flex items-center gap-1 text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">
        {label}
      </div>
      <div
        className={cn('mt-1 break-words font-semibold text-ink', sizes[size])}
        style={tone ? { color: toneColor(tone) } : undefined}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-caption text-mid-gray">{hint}</div>}
    </div>
  );
}
