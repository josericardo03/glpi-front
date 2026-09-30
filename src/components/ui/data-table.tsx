'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './feedback';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T, K extends string | number> {
  columns: Column<T>[];
  data: T[] | undefined;
  rowKey: (row: T) => K;
  loading?: boolean;
  skeletonRows?: number;
  emptyMessage?: ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  footer?: ReactNode;
  className?: string;
  /** Rótulo acessível da tabela. */
  caption?: string;
  selection?: {
    selected: Set<K>;
    onToggle: (key: K) => void;
    onToggleAll: (keys: K[]) => void;
  };
}

const alignCls = { left: 'text-left', right: 'text-right', center: 'text-center' };

/** Ignora teclas vindas de controles internos (checkbox, menu, links) para não disparar a navegação da linha. */
const fromInteractive = (e: KeyboardEvent) => e.target !== e.currentTarget;

export function DataTable<T, K extends string | number = string | number>({
  columns,
  data,
  rowKey,
  loading,
  skeletonRows = 5,
  emptyMessage = 'Nenhum registro encontrado.',
  onRowClick,
  rowClassName,
  footer,
  className,
  caption,
  selection,
}: DataTableProps<T, K>) {
  const keys = data?.map(rowKey) ?? [];
  const selectedCount = selection ? keys.filter((k) => selection.selected.has(k)).length : 0;
  const allSelected = keys.length > 0 && selectedCount === keys.length;

  return (
    <div className={cn('overflow-hidden rounded-lg border border-brand-border bg-brand-surface shadow-card', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm" aria-busy={loading || undefined}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="bg-brand-darker text-left text-[11px] font-semibold uppercase tracking-wider text-slate-200">
              {selection && (
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos desta página"
                    className="h-4 w-4 accent-brand-accent"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedCount > 0 && !allSelected;
                    }}
                    onChange={() => selection.onToggleAll(keys)}
                  />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('px-4 py-3', alignCls[c.align ?? 'left'], c.headerClassName)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {loading
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <tr key={i}>
                    {selection && <td className="px-4 py-4" />}
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-4">
                        <Skeleton className="h-4 w-full max-w-[160px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : data?.map((row) => {
                  const k = rowKey(row);
                  return (
                    <tr
                      key={k}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      onKeyDown={
                        onRowClick
                          ? (e) => {
                              if (fromInteractive(e) || (e.key !== 'Enter' && e.key !== ' ')) return;
                              e.preventDefault();
                              onRowClick(row);
                            }
                          : undefined
                      }
                      tabIndex={onRowClick ? 0 : undefined}
                      className={cn(
                        'transition-colors hover:bg-slate-50',
                        onRowClick && 'cursor-pointer focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-accent',
                        selection?.selected.has(k) && 'bg-blue-50/60',
                        rowClassName?.(row),
                      )}
                    >
                      {selection && (
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Selecionar registro ${k}`}
                            className="h-4 w-4 accent-brand-primary"
                            checked={selection.selected.has(k)}
                            onChange={() => selection.onToggle(k)}
                          />
                        </td>
                      )}
                      {columns.map((c) => (
                        <td key={c.key} className={cn('px-4 py-3.5 align-middle text-brand-darker', alignCls[c.align ?? 'left'], c.className)}>
                          {c.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!loading && data?.length === 0 && (
          <div role="status" className="flex flex-col items-center gap-2 py-14 text-sm text-brand-muted">
            <Inbox aria-hidden className="h-8 w-8 text-slate-300" />
            {emptyMessage}
          </div>
        )}
      </div>
      {footer && <div className="border-t border-brand-border bg-slate-50/60 px-5 py-3">{footer}</div>}
    </div>
  );
}

/** Célula padrão "título + subtítulo". */
export function CellStack({ title, subtitle, className }: { title: ReactNode; subtitle?: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="truncate font-semibold text-brand-darker">{title}</p>
      {subtitle && <p className="truncate text-xs text-brand-muted">{subtitle}</p>}
    </div>
  );
}
