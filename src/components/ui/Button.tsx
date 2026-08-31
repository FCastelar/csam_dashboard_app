import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'accent';
export type ButtonSize = 'sm' | 'md';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  // The dark-on-light inversion is the only chromatic interaction in the system.
  primary: 'bg-ink text-paper hover:bg-ink-soft',
  secondary: 'bg-canvas text-ink hover:bg-accent/10 hover:text-accent',
  outline: 'border border-hairline bg-transparent text-ink hover:border-accent hover:text-accent',
  ghost: 'bg-transparent text-mid-gray hover:bg-accent/10 hover:text-accent',
  destructive: 'bg-transparent text-ember hover:bg-ember/10',
  accent: 'bg-accent text-accent-contrast hover:opacity-90',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-caption tracking-normal',
  md: 'h-9 px-4 text-body',
};

/* 18px radius on a ~36px height produces perfect pill geometry. */
export function Button({ className, variant = 'secondary', size = 'md', type, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      type={type ?? 'button'}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-pill font-medium',
        'transition-all duration-200 ease-swift active:scale-[0.97]',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      )}
    />
  );
}

export function IconButton({ className, variant = 'ghost', size = 'md', type, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      type={type ?? 'button'}
      className={cn(
        'inline-flex items-center justify-center rounded-pill',
        'transition-all duration-200 ease-swift active:scale-[0.94]',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        variants[variant],
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        className,
      )}
    />
  );
}
