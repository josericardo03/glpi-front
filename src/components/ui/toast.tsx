'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const TONES = {
  success: 'border-l-status-resolvido',
  error: 'border-l-status-critica',
  info: 'border-l-brand-accent',
};
const ICON_TONES = { success: 'text-status-resolvido', error: 'text-status-critica', info: 'text-brand-accent' };
const DURATION: Record<ToastTone, number> = { success: 4000, info: 6000, error: 8000 };

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(DURATION[item.tone]);

  useEffect(() => {
    if (paused) return;
    const start = Date.now();
    const t = setTimeout(() => onDismiss(item.id), remaining.current);
    return () => {
      clearTimeout(t);
      remaining.current -= Date.now() - start;
    };
  }, [paused, item.id, onDismiss]);

  const Icon = ICONS[item.tone];
  return (
    <div
      role={item.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn('pointer-events-auto flex animate-slide-up items-start gap-3 rounded-md border border-l-4 border-brand-border bg-white p-3 shadow-pop', TONES[item.tone])}
    >
      <Icon aria-hidden className={cn('mt-0.5 h-5 w-5 shrink-0', ICON_TONES[item.tone])} />
      <p className="flex-1 text-sm text-brand-darker">{item.message}</p>
      <button type="button" onClick={() => onDismiss(item.id)} className="text-brand-muted hover:text-brand-darker" aria-label="Fechar notificação">
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = ++seq.current;
    setItems((all) => [...all.filter((t) => t.message !== message).slice(-3), { id, tone, message }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}
