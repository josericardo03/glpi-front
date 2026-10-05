'use client';

import { Field, Input } from '@/components/ui';
import { formatMinutes } from '@/lib/format';

interface DurationInputProps {
  label: string;
  value: number;
  onChange: (min: number) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

/** Duração em horas + minutos, armazenada em minutos. */
export function DurationInput({ label, value, onChange, error, disabled, required }: DurationInputProps) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  const inteiro = (v: string) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0);
  const set = (hours: number, mins: number) => onChange(Math.max(0, hours) * 60 + Math.min(59, Math.max(0, mins)));
  return (
    <Field label={label} required={required} hint={`Total: ${formatMinutes(value)} (${value} min)`} error={error}>
      {(id) => (
        <div className="flex items-center gap-2">
          <Input id={id} type="number" min={0} step={1} value={h} disabled={disabled} onChange={(e) => set(inteiro(e.target.value), m)} className="text-center font-semibold" />
          <span className="text-xs font-semibold text-brand-muted">h</span>
          <Input
            type="number"
            min={0}
            max={59}
            step={1}
            value={m}
            disabled={disabled}
            invalid={!!error}
            aria-label={`${label} (minutos)`}
            onChange={(e) => set(h, inteiro(e.target.value))}
            className="text-center font-semibold"
          />
          <span className="text-xs font-semibold text-brand-muted">min</span>
        </div>
      )}
    </Field>
  );
}
