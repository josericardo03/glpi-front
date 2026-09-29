'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  items: TabItem<T>[];
  variant?: 'underline' | 'pills';
  className?: string;
}

export function Tabs<T extends string>({ value, onChange, items, variant = 'underline', className }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1 overflow-x-auto',
        variant === 'underline' ? 'border-b border-brand-border px-4' : 'rounded-lg bg-white p-1.5',
        className,
      )}
    >
      {items.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              'flex shrink-0 items-center gap-2 text-sm font-medium transition-colors',
              variant === 'underline'
                ? cn('-mb-px border-b-2 px-3 py-3', active ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-muted hover:text-brand-darker')
                : cn('rounded-md px-3 py-1.5 text-xs uppercase tracking-wide', active ? 'bg-brand-darker text-white' : 'text-brand-muted hover:bg-slate-100'),
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && <span className={cn('text-xs', active ? 'opacity-80' : 'text-brand-muted')}>({t.count})</span>}
          </button>
        );
      })}
    </div>
  );
}
