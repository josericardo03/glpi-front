import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './feedback';

const TONES = {
  default: { card: 'bg-brand-surface border-brand-border', value: 'text-brand-darker', icon: 'bg-slate-100 text-brand-darker' },
  primary: { card: 'bg-brand-surface border-brand-primary ring-1 ring-brand-primary', value: 'text-brand-darker', icon: 'bg-blue-50 text-brand-primary' },
  danger: { card: 'bg-red-50 border-red-200', value: 'text-status-critica', icon: 'bg-red-100 text-status-critica' },
  warning: { card: 'bg-brand-surface border-brand-border', value: 'text-status-pendente', icon: 'bg-amber-50 text-status-pendente' },
  success: { card: 'bg-brand-surface border-brand-border', value: 'text-brand-darker', icon: 'bg-emerald-50 text-status-resolvido' },
  dark: { card: 'bg-brand-darker border-brand-dark', value: 'text-white', icon: 'bg-brand-dark text-brand-accent' },
} as const;

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: keyof typeof TONES;
  /** Variação percentual; positiva = verde, negativa = vermelha (inverta com `invertTrend`). */
  trend?: number;
  trendLabel?: string;
  invertTrend?: boolean;
  footer?: ReactNode;
  loading?: boolean;
  className?: string;
}

export function StatCard({ label, value, icon, tone = 'default', trend, trendLabel, invertTrend, footer, loading, className }: StatCardProps) {
  const t = TONES[tone];
  const good = trend !== undefined && (invertTrend ? trend <= 0 : trend >= 0);
  return (
    <div className={cn('flex flex-col rounded-lg border p-4 shadow-card', t.card, className)}>
      <div className="flex items-start justify-between gap-3">
        <p className={cn('text-[11px] font-semibold uppercase tracking-wide', tone === 'dark' ? 'text-slate-400' : 'text-brand-muted')}>
          {label}
        </p>
        {icon && <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', t.icon)}>{icon}</span>}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <p className={cn('mt-1 text-3xl font-bold tracking-tight', t.value)}>{value}</p>
      )}
      {trend !== undefined && !loading && (
        <p className={cn('mt-1 flex items-center gap-1 text-xs font-medium', good ? 'text-emerald-600' : 'text-status-critica')}>
          {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {trend > 0 ? '+' : ''}
          {trend.toFixed(1).replace('.', ',')}% {trendLabel}
        </p>
      )}
      {footer && !loading && <div className="mt-2 text-xs text-brand-muted">{footer}</div>}
    </div>
  );
}
