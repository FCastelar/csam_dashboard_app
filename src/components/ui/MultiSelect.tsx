import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './cn';

type MultiSelectProps = {
  items: ReadonlyArray<readonly [string, string]>;
  value: string[];
  onChange: (value: string[]) => void;
  label: string;
  /** Shown when nothing is picked, meaning "no filter". */
  allLabel?: string;
  className?: string;
};

/**
 * Checkbox dropdown for picking several options at once. An empty selection
 * reads as "All", so clearing the list is the same as removing the filter.
 */
export function MultiSelect({ items, value, onChange, label, allLabel = 'All', className }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [isOpen]);

  const selected = items.filter(([key]) => value.includes(key));
  const summary = !selected.length
    ? allLabel
    : selected.length === 1
      ? selected[0][1]
      : `${selected.length} selected`;

  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-pill border border-transparent bg-canvas px-3 text-body text-ink outline-none transition-colors focus:border-hairline focus:bg-paper"
      >
        <span className="truncate">{summary}</span>
        <ChevronDown size={14} strokeWidth={1.5} className="shrink-0 text-mid-gray" />
      </button>
      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute right-0 z-30 mt-1 max-h-72 w-full min-w-[11rem] overflow-auto rounded-nested border border-hairline bg-paper p-1 shadow-card"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value.length}
            onClick={() => onChange([])}
            className="flex w-full items-center gap-2 rounded-pill px-3 py-1.5 text-left text-body text-ink transition-colors hover:bg-canvas"
          >
            <span className="flex w-4 shrink-0 justify-center">{!value.length && <Check size={14} strokeWidth={2} />}</span>
            {allLabel}
          </button>
          {items.map(([key, itemLabel]) => (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={value.includes(key)}
              onClick={() => toggle(key)}
              className="flex w-full items-center gap-2 rounded-pill px-3 py-1.5 text-left text-body text-ink transition-colors hover:bg-canvas"
            >
              <span className="flex w-4 shrink-0 justify-center">{value.includes(key) && <Check size={14} strokeWidth={2} />}</span>
              <span className="truncate">{itemLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
