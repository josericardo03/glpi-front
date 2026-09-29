import type { ReactNode } from 'react';
import { AlertTriangle, Info, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-slate-200/80', className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand-primary', className)} />;
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      {icon && <div className="mb-1 text-slate-300">{icon}</div>}
      <p className="font-semibold text-brand-darker">{title}</p>
      {description && <p className="max-w-sm text-sm text-brand-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

const CALLOUT = {
  info: { cls: 'border-blue-200 bg-blue-50 text-blue-900', icon: Info, iconCls: 'text-brand-primary' },
  warning: { cls: 'border-amber-200 bg-amber-50 text-amber-900', icon: AlertTriangle, iconCls: 'text-status-pendente' },
  danger: { cls: 'border-red-200 bg-red-50 text-red-900', icon: XCircle, iconCls: 'text-status-critica' },
  success: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: CheckCircle2, iconCls: 'text-status-resolvido' },
  dark: { cls: 'border-brand-dark bg-brand-darker text-slate-200', icon: Info, iconCls: 'text-brand-accent' },
} as const;

interface CalloutProps {
  tone?: keyof typeof CALLOUT;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Callout({ tone = 'info', title, children, icon, action, className }: CalloutProps) {
  const cfg = CALLOUT[tone];
  const Icon = cfg.icon;
  return (
    <div className={cn('flex gap-3 rounded-lg border p-4', cfg.cls, className)}>
      <span className={cn('mt-0.5 shrink-0', cfg.iconCls)}>{icon ?? <Icon className="h-5 w-5" />}</span>
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className={cn('font-semibold', tone === 'dark' && 'text-white')}>{title}</p>}
        {children && <div className="mt-0.5 opacity-90">{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Callout
      tone="danger"
      title="Não foi possível carregar os dados"
      action={
        onRetry && (
          <button onClick={onRetry} className="text-sm font-semibold text-red-700 underline">
            Tentar novamente
          </button>
        )
      }
    >
      {message}
    </Callout>
  );
}
