import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-brand-border bg-brand-surface shadow-card', className)} {...props} />;
}

interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  dark?: boolean;
}

export function CardHeader({ title, description, icon, actions, dark, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-5 py-4',
        dark ? 'rounded-t-lg bg-brand-darker text-white' : 'border-b border-brand-border',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className={cn('shrink-0', dark ? 'text-slate-300' : 'text-brand-primary')}>{icon}</span>}
        <div className="min-w-0">
          <h3 className={cn('truncate text-base font-semibold', dark ? 'text-white' : 'text-brand-darker')}>{title}</h3>
          {description && (
            <p className={cn('mt-0.5 text-xs', dark ? 'text-slate-400' : 'text-brand-muted')}>{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-between gap-4 border-t border-brand-border bg-slate-50/60 px-5 py-3', className)}
      {...props}
    />
  );
}
