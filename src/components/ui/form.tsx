'use client';

import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const control =
  'w-full rounded-md border border-brand-border bg-white text-sm text-brand-darker placeholder:text-brand-muted/70 ' +
  'transition-colors focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-brand-muted aria-[invalid=true]:border-status-critica';

export function Label({ htmlFor, children, required, className }: { htmlFor?: string; children: ReactNode; required?: boolean; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-brand-muted', className)}>
      {children}
      {required && (
        <span aria-hidden className="ml-0.5 text-status-critica">
          *
        </span>
      )}
    </label>
  );
}

interface FieldCtx {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required?: boolean;
}

const FieldContext = createContext<FieldCtx | null>(null);

/** Liga automaticamente dica/erro do `Field` ao controle cujo `id` é o do campo. */
function useFieldAria(id: string | undefined, invalid: boolean | undefined) {
  const ctx = useContext(FieldContext);
  const own = ctx && ctx.id === id ? ctx : null;
  return {
    'aria-invalid': invalid ?? (own?.invalid || undefined),
    'aria-describedby': own?.describedBy,
    'aria-required': own?.required || undefined,
  };
}

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: (id: string) => ReactNode;
}

/** Envolve qualquer controle com label, dica e mensagem de erro acessíveis. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  const describedBy = error || hint ? msgId : undefined;
  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: !!error, required }}>
      <div className={className}>
        {label && (
          <Label htmlFor={id} required={required}>
            {label}
          </Label>
        )}
        {children(id)}
        {error ? (
          <p id={msgId} role="alert" className="mt-1 text-xs text-status-critica">
            {error}
          </p>
        ) : (
          hint && (
            <p id={msgId} className="mt-1 text-xs text-brand-muted">
              {hint}
            </p>
          )
        )}
      </div>
    </FieldContext.Provider>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, leftIcon, invalid, ...props }, ref) {
  const aria = useFieldAria(props.id, invalid);
  if (!leftIcon) return <input ref={ref} {...aria} className={cn(control, 'h-10 px-3', className)} {...props} />;
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted">
        {leftIcon}
      </span>
      <input ref={ref} {...aria} className={cn(control, 'h-10 pl-9 pr-3', className)} {...props} />
    </div>
  );
});

export const SearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function SearchInput({ className, ...props }, ref) {
  return <Input ref={ref} type="search" leftIcon={<Search className="h-4 w-4" />} className={className} {...props} />;
});

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, className, invalid, ...props },
  ref,
) {
  const aria = useFieldAria(props.id, invalid);
  return (
    <div className="relative">
      <select ref={ref} {...aria} className={cn(control, 'h-10 appearance-none pl-3 pr-9', className)} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...props }, ref) {
    const aria = useFieldAria(props.id, invalid);
    return <textarea ref={ref} {...aria} className={cn(control, 'min-h-[96px] resize-y p-3', className)} {...props} />;
  },
);

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, className, ...props }, ref) {
  return (
    <label className={cn('inline-flex cursor-pointer select-none items-center gap-2 text-sm text-brand-darker', className)}>
      <input
        ref={ref}
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-brand-primary accent-brand-primary focus:ring-brand-accent"
        {...props}
      />
      {label}
    </label>
  );
});

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  /** Nome acessível quando não há `label` visível. */
  'aria-label'?: string;
}

export function Switch({ checked, onChange, label, description, disabled, 'aria-label': ariaLabel }: SwitchProps) {
  const id = useId();
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      aria-labelledby={label ? `${id}-label` : undefined}
      aria-describedby={description ? `${id}-desc` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent disabled:opacity-50',
        checked ? 'bg-brand-primary' : 'bg-slate-300',
      )}
    >
      <span aria-hidden className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
  if (!label) return button;
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p id={`${id}-label`} className="text-sm font-medium text-brand-darker">
          {label}
        </p>
        {description && (
          <p id={`${id}-desc`} className="text-xs text-brand-muted">
            {description}
          </p>
        )}
      </div>
      {button}
    </div>
  );
}

interface ToggleGroupProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  'aria-label'?: string;
}

/** Controle segmentado (ex.: Incidente | Requisição, Últimos 30 dias | Trimestre). Navegável por setas. */
export function ToggleGroup<T extends string>({ value, onChange, options, className, 'aria-label': ariaLabel }: ToggleGroupProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('inline-flex rounded-md border border-brand-border bg-slate-100 p-1', className)}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          tabIndex={value === o.value ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
          className={cn(
            'flex-1 whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent',
            value === o.value ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-muted hover:text-brand-darker',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
