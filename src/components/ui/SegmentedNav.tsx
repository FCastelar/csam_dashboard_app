import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from './cn';

type SegmentedNavProps<T extends string> = {
  items: ReadonlyArray<readonly [T, string]>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
};

type Indicator = { left: number; width: number };

/**
 * Pill-shaped segmented control. The active state is a single absolutely
 * positioned pill that slides between buttons, so the movement reads as one
 * object travelling rather than two elements swapping colour.
 */
export function SegmentedNav<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: SegmentedNavProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef(new Map<T, HTMLButtonElement>());
  const [indicator, setIndicator] = useState<Indicator | null>(null);

  // Measured in a layout effect so the pill never paints at a stale position.
  useLayoutEffect(() => {
    const button = buttonRefs.current.get(value);
    const list = listRef.current;
    if (!button || !list) return;
    setIndicator({
      left: button.offsetLeft - list.clientLeft,
      width: button.offsetWidth,
    });
  }, [value, items]);

  // Font loading and container resizes shift the buttons after first paint.
  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const button = buttonRefs.current.get(value);
      if (!button) return;
      setIndicator({ left: button.offsetLeft - list.clientLeft, width: button.offsetWidth });
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [value]);

  return (
    <nav
      ref={listRef}
      aria-label={label}
      className={cn('relative inline-flex flex-wrap items-center gap-1 rounded-pill bg-canvas p-1', className)}
    >
      {indicator && (
        <span
          aria-hidden="true"
          className="tab-indicator absolute top-1 h-8 rounded-pill bg-accent"
          style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width, left: 0 }}
        />
      )}
      {items.map(([key, text]) => {
        const isActive = key === value;
        return (
          <button
            key={key}
            ref={(node) => {
              if (node) buttonRefs.current.set(key, node);
              else buttonRefs.current.delete(key);
            }}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(key)}
            className={cn(
              'relative z-10 h-8 rounded-pill px-4 text-body font-medium transition-colors duration-200',
              isActive ? 'text-accent-contrast' : 'text-mid-gray hover:text-ink',
            )}
          >
            {text}
          </button>
        );
      })}
    </nav>
  );
}
