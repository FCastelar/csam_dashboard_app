import type { ReactNode } from 'react';
import { cn } from './cn';

type NoticeProps = {
  icon?: ReactNode;
  children: ReactNode;
  /** `error` is the only place the ember red appears. */
  variant?: 'neutral' | 'error';
  className?: string;
};

export function Notice({ icon, children, variant = 'neutral', className }: NoticeProps) {
  const isError = variant === 'error';
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-nested border p-3 text-body',
        isError ? 'border-ember/30 bg-ember/5 text-ember' : 'border-hairline bg-surface-alt text-mid-gray',
        className,
      )}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className={isError ? undefined : 'text-ink'}>{children}</div>
    </div>
  );
}
