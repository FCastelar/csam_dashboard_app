import { useEffect, useState, type ReactNode } from 'react';
import { ChartLine, Table2 } from 'lucide-react';
import { cn } from './cn';

type ChartPanelProps = {
  /** Stable key used to remember the preferred view across reloads. */
  storageKey: string;
  table: ReactNode;
  chart: ReactNode;
  defaultView?: 'table' | 'chart';
  className?: string;
};

const storagePrefix = 'caf-dashboard-view-';

/**
 * Wraps a time series in a table/chart switch. The table is never replaced —
 * both views render the same data and the choice is remembered per panel.
 */
export function ChartPanel({ storageKey, table, chart, defaultView = 'table', className }: ChartPanelProps) {
  const [view, setView] = useState<'table' | 'chart'>(defaultView);

  useEffect(() => {
    const saved = window.localStorage.getItem(storagePrefix + storageKey);
    if (saved === 'table' || saved === 'chart') setView(saved);
  }, [storageKey]);

  const choose = (next: 'table' | 'chart') => {
    setView(next);
    window.localStorage.setItem(storagePrefix + storageKey, next);
  };

  const options = [
    { key: 'table' as const, label: 'Table view', icon: Table2 },
    { key: 'chart' as const, label: 'Chart view', icon: ChartLine },
  ];

  return (
    <div className={className}>
      <div className="flex justify-end" data-print="hide">
        <div className="inline-flex items-center gap-1 rounded-pill bg-canvas p-1">
          {options.map(({ key, label, icon: Icon }) => {
            const isActive = view === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => choose(key)}
                aria-pressed={isActive}
                aria-label={label}
                title={label}
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-pill transition-all duration-200 ease-swift active:scale-95',
                  isActive ? 'bg-accent text-accent-contrast' : 'text-mid-gray hover:text-accent',
                )}
              >
                <Icon size={14} strokeWidth={1.5} />
              </button>
            );
          })}
        </div>
      </div>

      {/* `key` restarts the fade so switching views reads as a deliberate change. */}
      <div key={view} className="animate-fade-in">
        {view === 'table' ? table : chart}
      </div>
    </div>
  );
}
