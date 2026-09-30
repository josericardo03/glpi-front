import { cn } from '@/lib/utils';

const TONES = {
  primary: 'bg-brand-primary',
  dark: 'bg-brand-darker',
  success: 'bg-status-resolvido',
  warning: 'bg-status-pendente',
  danger: 'bg-status-critica',
  accent: 'bg-brand-accent',
} as const;

export type ProgressTone = keyof typeof TONES;

interface ProgressProps {
  value: number;
  max?: number;
  tone?: ProgressTone;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  label?: string;
}

export function Progress({ value, max = 100, tone = 'primary', size = 'sm', className, label }: ProgressProps) {
  const ratio = max > 0 ? value / max : 0;
  const pct = Number.isFinite(ratio) ? Math.max(0, Math.min(100, ratio * 100)) : 0;
  const h = { xs: 'h-1', sm: 'h-1.5', md: 'h-2.5' }[size];
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('w-full overflow-hidden rounded-full bg-slate-200', h, className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', TONES[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Tom automático para barras de carga de trabalho (0..100). */
export function loadTone(pct: number): ProgressTone {
  if (pct >= 85) return 'danger';
  if (pct >= 70) return 'warning';
  return 'primary';
}
