'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
}

function pageList(current: number, last: number): (number | '…')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = new Set([1, 2, current - 1, current, current + 1, last]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1]! > 1 ? (['…', p] as const) : [p]));
}

export function Pagination({ page, pageSize, total, onPageChange, label = 'registros' }: PaginationProps) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn = 'flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm transition-colors';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-brand-muted">
        Exibindo <strong className="text-brand-darker">{from} - {to}</strong> de{' '}
        <strong className="text-brand-darker">{formatNumber(total)}</strong> {label}
      </p>
      <nav className="flex items-center gap-1" aria-label="Paginação">
        <button
          type="button"
          className={cn(btn, 'border-brand-border bg-white hover:bg-slate-50 disabled:opacity-40')}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageList(page, last).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-1 text-brand-muted">…</span>
          ) : (
            <button
              type="button"
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                btn,
                p === page
                  ? 'border-brand-primary bg-brand-primary font-semibold text-white'
                  : 'border-brand-border bg-white text-brand-darker hover:bg-slate-50',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className={cn(btn, 'border-brand-border bg-white hover:bg-slate-50 disabled:opacity-40')}
          disabled={page >= last}
          onClick={() => onPageChange(page + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
