import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from './cn';

export function TableScroll({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn('-mx-5 overflow-x-auto px-5', className)} />;
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table {...props} className={cn('min-w-full border-collapse text-left text-body', className)} />;
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} className={cn('border-b border-hairline', className)} />;
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} className={className} />;
}

type RowProps = HTMLAttributes<HTMLTableRowElement> & {
  /** Completed rows recede tonally instead of being tinted. */
  muted?: boolean;
};

export function TR({ className, muted, ...props }: RowProps) {
  return (
    <tr
      {...props}
      className={cn(
        'motion-row border-b border-hairline last:border-0 align-top',
        muted && 'bg-canvas text-mid-gray',
        className,
      )}
    />
  );
}

/** Column labels are 12px uppercase with the caption tracking. */
export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...props}
      className={cn(
        'whitespace-nowrap px-3 py-2 text-caption font-medium uppercase tracking-[0.6px] text-mid-gray',
        className,
      )}
    />
  );
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={cn('px-3 py-2 text-body text-ink', className)} />;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-6 text-center text-body text-mid-gray">
        {children}
      </td>
    </tr>
  );
}
