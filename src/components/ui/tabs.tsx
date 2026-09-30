'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
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
  'aria-label'?: string;
}

/** Abas com navegação por setas/Home/End (padrão WAI-ARIA de ativação automática). */
export function Tabs<T extends string>({ value, onChange, items, variant = 'underline', className, 'aria-label': ariaLabel }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    const last = items.length - 1;
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(items[next]!.value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex gap-1 overflow-x-auto',
        variant === 'underline' ? 'border-b border-brand-border px-4' : 'rounded-lg bg-white p-1.5',
        className,
      )}
    >
      {items.map((t, i) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'flex shrink-0 items-center gap-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent',
              variant === 'underline'
                ? cn('-mb-px border-b-2 px-3 py-3', active ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-muted hover:text-brand-darker')
                : cn('rounded-md px-3 py-1.5 text-xs uppercase tracking-wide', active ? 'bg-brand-darker text-white' : 'text-brand-muted hover:bg-slate-100'),
            )}
          >
            {t.icon && <span aria-hidden>{t.icon}</span>}
            {t.label}
            {t.count !== undefined && <span className={cn('text-xs', active ? 'opacity-80' : 'text-brand-muted')}>({t.count})</span>}
          </button>
        );
      })}
    </div>
  );
}
