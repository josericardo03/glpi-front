import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const TONES = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  dark: 'bg-brand-darker text-white ring-brand-darker',
  primary: 'bg-blue-50 text-brand-primary ring-blue-200',
  novo: 'bg-blue-50 text-blue-700 ring-blue-200',
  atendimento: 'bg-violet-50 text-violet-700 ring-violet-200',
  pendente: 'bg-amber-50 text-amber-700 ring-amber-200',
  resolvido: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  concluido: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  warning: 'bg-orange-50 text-orange-700 ring-orange-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
} as const;

export type BadgeTone = keyof typeof TONES;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

export function Badge({ tone = 'neutral', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        TONES[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
