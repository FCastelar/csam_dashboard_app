import type { HTMLAttributes } from 'react';
import { cn } from './cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Removes the default 20px padding so tables can bleed to the card edge. */
  flush?: boolean;
  as?: 'div' | 'section' | 'header' | 'article';
};

/*
 * Cards sit visually raised but remain flat: a 1px hairline plus a
 * barely-perceptible elevation layer, never a dramatic drop shadow.
 */
export function Card({ className, flush, as: Tag = 'div', ...props }: CardProps) {
  return (
    <Tag
      {...props}
      className={cn(
        'motion-card rounded-card border border-hairline bg-paper text-ink shadow-card',
        !flush && 'p-5',
        className,
      )}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn('flex flex-wrap items-center justify-between gap-3', className)} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 {...props} className={cn('text-subheading font-semibold text-ink', className)} />;
}

/** Section heading that carries the account accent. */
export function AccentTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 {...props} className={cn('text-subheading font-semibold text-accent', className)} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={cn('text-body text-mid-gray', className)} />;
}

/** Tonal block inside a card — one radius step down, no border. */
export function NestedCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn('motion-nested rounded-nested bg-surface-alt p-3 text-body text-ink', className)} />
  );
}
