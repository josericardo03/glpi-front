'use client';

import { memo, type ReactNode } from 'react';
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

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[] | undefined;
  rowKey: (row: T) => string | number;
  loading?: boolean;
  skeletonRows?: number;
  emptyMessage?: ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  footer?: ReactNode;
  className?: string;
  selection?: {
    selected: Set<string | number>;
    onToggle: (key: string | number) => void;
    onToggleAll: (keys: (string | number)[]) => void;
  };
}

const alignCls = { left: 'text-left', right: 'text-right', center: 'text-center' };

function DataTableInner<T>({
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
  selection,
}: DataTableProps<T>) {
  const keys = data?.map(rowKey) ?? [];
  const allSelected = !!selection && keys.length > 0 && keys.every((k) => selection.selected.has(k));

  return (
    <div className={cn('overflow-hidden rounded-lg border border-brand-border bg-brand-surface shadow-card', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-brand-darker text-left text-[11px] font-semibold uppercase tracking-wider text-slate-200">
              {selection && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos"
                    className="h-4 w-4 accent-brand-accent"
                    checked={allSelected}
                    onChange={() => selection.onToggleAll(keys)}
                  />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} className={cn('px-4 py-3', alignCls[c.align ?? 'left'], c.headerClassName)}>
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
                      className={cn(
                        'transition-colors hover:bg-slate-50',
                        onRowClick && 'cursor-pointer',
                        selection?.selected.has(k) && 'bg-blue-50/60',
                        rowClassName?.(row),
                      )}
                    >
                      {selection && (
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Selecionar ${k}`}
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
          <div className="flex flex-col items-center gap-2 py-14 text-sm text-brand-muted">
            <Inbox className="h-8 w-8 text-slate-300" />
            {emptyMessage}
          </div>
        )}
      </div>
      {footer && <div className="border-t border-brand-border bg-slate-50/60 px-5 py-3">{footer}</div>}
    </div>
  );
}

export const DataTable = memo(DataTableInner) as typeof DataTableInner;

/** Célula padrão "título + subtítulo". */
export function CellStack({ title, subtitle, className }: { title: ReactNode; subtitle?: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="truncate font-semibold text-brand-darker">{title}</p>
      {subtitle && <p className="truncate text-xs text-brand-muted">{subtitle}</p>}
    </div>
  );
}
