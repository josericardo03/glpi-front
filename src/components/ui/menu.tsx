'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface MenuProps {
  items: MenuItem[];
  trigger?: ReactNode;
  align?: 'left' | 'right';
  /** Nome acessível do botão (obrigatório quando o gatilho é só um ícone). */
  label?: string;
}

/** Menu de ações renderizado em portal (não é cortado por `overflow` de tabelas) e navegável por teclado. */
export function Menu({ items, trigger, align = 'right', label = 'Mais ações' }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: align === 'right' ? r.right : r.left });
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false);
    };
    const onViewportChange = () => close(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open, close]);

  useEffect(() => {
    if (open && pos) menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [open, pos]);

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const nodes = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])];
    const i = nodes.indexOf(document.activeElement as HTMLButtonElement);
    const focus = (n: number) => nodes[(n + nodes.length) % nodes.length]?.focus();
    if (e.key === 'ArrowDown') focus(i + 1);
    else if (e.key === 'ArrowUp') focus(i - 1);
    else if (e.key === 'Home') focus(0);
    else if (e.key === 'End') focus(nodes.length - 1);
    else if (e.key === 'Escape' || e.key === 'Tab') close(e.key === 'Escape');
    else return;
    if (e.key !== 'Tab') e.preventDefault();
  }

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={trigger ? undefined : label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="rounded-md p-1.5 text-brand-muted hover:bg-slate-100 hover:text-brand-darker focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
      >
        {trigger ?? <MoreVertical aria-hidden className="h-4 w-4" />}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKeyDown}
            onClick={(e) => e.stopPropagation()}
            style={{ top: pos.top, left: pos.left }}
            className={cn(
              'fixed z-50 min-w-[180px] animate-fade-in rounded-md border border-brand-border bg-white py-1 shadow-pop',
              align === 'right' && '-translate-x-full',
            )}
          >
            {items.map((it) => (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={it.disabled}
                onClick={() => {
                  close();
                  it.onClick();
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 focus:bg-slate-100 focus:outline-none disabled:opacity-40',
                  it.danger ? 'text-status-critica' : 'text-brand-darker',
                )}
              >
                {it.icon && <span aria-hidden>{it.icon}</span>}
                {it.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
