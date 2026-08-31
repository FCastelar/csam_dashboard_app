import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from './cn';

export type BadgeVariant = 'solid' | 'soft' | 'outline';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  solid: 'bg-ink-soft text-paper',
  soft: 'bg-canvas text-ink-soft',
  outline: 'border border-hairline text-ink',
};

/** Pill-shaped at 18px radius — the minimum height creates a capsule tag. */
export function Badge({ className, variant = 'soft', ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-caption font-medium tracking-normal',
        variants[variant],
        className,
      )}
    />
  );
}

type TintedBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  /** Colour pair produced by the helpers in `src/theme/tokens.ts`. */
  tint: CSSProperties;
};

export function TintedBadge({ className, tint, style, ...props }: TintedBadgeProps) {
  return (
    <span
      {...props}
      style={{ ...tint, ...style }}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-pill px-2 py-0.5 text-caption font-medium tracking-normal',
        className,
      )}
    />
  );
}
