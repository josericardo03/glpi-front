'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!nodes.length) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (bodyRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? panelRef.current)?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden className="absolute inset-0 animate-fade-in bg-brand-darker/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn('relative flex max-h-[90vh] w-full animate-slide-up flex-col rounded-lg bg-white shadow-pop focus:outline-none', SIZES[size])}
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-border px-6 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-brand-darker">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-sm text-brand-muted">
                {description}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-brand-muted hover:bg-slate-100" aria-label="Fechar">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <div ref={bodyRef} className="overflow-y-auto px-6 py-5">
          {children}
        </div>
        {footer && <div className="flex justify-end gap-2 border-t border-brand-border bg-slate-50/60 px-6 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
