import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import { Progress, type ProgressTone } from './progress';

export interface BarSeries {
  key: string;
  label: string;
  className: string;
}

interface StackedBarChartProps<T extends Record<string, number | string>> {
  data: T[];
  labelKey: keyof T;
  series: BarSeries[];
  height?: number;
  highlightIndex?: number;
}

/** Gráfico de barras (empilhadas) em CSS puro — zero dependências e SSR-friendly. */
export function StackedBarChart<T extends Record<string, number | string>>({
  data,
  labelKey,
  series,
  height = 220,
  highlightIndex,
}: StackedBarChartProps<T>) {
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const totals = data.map((d) => series.reduce((s, x) => s + num(d[x.key]), 0));
  const max = Math.max(1, ...totals);

  return (
    <div>
      <div
        role="img"
        aria-label={data.map((d, i) => `${String(d[labelKey])}: ${totals[i]}`).join('; ')}
        className="relative flex items-end gap-3 border-b border-brand-border px-2"
        style={{ height }}
      >
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-t border-dashed border-slate-100" />
          ))}
        </div>
        {data.map((d, i) => (
          <div
            key={String(d[labelKey])}
            className={cn('group relative flex flex-1 flex-col-reverse overflow-hidden rounded-t', highlightIndex !== undefined && highlightIndex !== i && 'opacity-60')}
            style={{ height: `${(totals[i]! / max) * 100}%` }}
            title={series.map((s) => `${s.label}: ${d[s.key]}`).join(' · ')}
          >
            {series.map((s) => (
              <div key={s.key} className={cn('w-full transition-all', s.className)} style={{ height: `${(num(d[s.key]) / (totals[i] || 1)) * 100}%` }} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3 px-2">
        {data.map((d) => (
          <span key={String(d[labelKey])} className="flex-1 text-center text-xs font-medium text-brand-muted">
            {String(d[labelKey])}
          </span>
        ))}
      </div>
      <ChartLegend series={series} />
    </div>
  );
}

export function ChartLegend({ series }: { series: Pick<BarSeries, 'label' | 'className'>[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-4">
      {series.map((s) => (
        <span key={s.label} className="flex items-center gap-1.5 text-xs text-brand-muted">
          <span className={cn('h-2.5 w-2.5 rounded-full', s.className)} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

interface RankListProps {
  items: { label: string; value: number; suffix?: string }[];
  numbered?: boolean;
  tone?: ProgressTone;
  max?: number;
}

/** Lista ranqueada com barra horizontal (Categorias mais comuns, Encerramentos por técnico...). */
export function RankList({ items, numbered, tone = 'dark', max }: RankListProps) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-4">
      {items.map((it, i) => (
        <li key={it.label} className="flex items-center gap-3">
          {numbered && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-brand-darker">{i + 1}</span>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-medium text-brand-darker">{it.label}</span>
              <span className="shrink-0 text-xs font-semibold text-brand-muted">
                {formatNumber(it.value)}
                {it.suffix}
              </span>
            </div>
            <Progress value={it.value} max={top} tone={tone} size="xs" />
          </div>
        </li>
      ))}
    </ul>
  );
}

interface DonutProps {
  segments: { label: string; value: number; color: string }[];
  centerLabel?: string;
  size?: number;
}

/** Donut SVG leve para distribuição por status. */
export function DonutChart({ segments, centerLabel = 'Total', size = 160 }: DonutProps) {
  const total = segments.reduce((s, x) => s + (Number.isFinite(x.value) ? x.value : 0), 0);
  const r = 60;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 160 160" className="-rotate-90" role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join('; ')}>
          <circle cx="80" cy="80" r={r} fill="none" stroke="#E2E8F0" strokeWidth="18" />
          {total > 0 && segments.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle key={s.label} cx="80" cy="80" r={r} fill="none" stroke={s.color} strokeWidth="18" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-brand-darker">{formatNumber(total)}</span>
          <span className="text-xs text-brand-muted">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-brand-darker">
              <span className="h-3 w-3 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="font-semibold text-brand-darker">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
