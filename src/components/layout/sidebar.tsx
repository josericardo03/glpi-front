'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useEffect, useState } from 'react';
import { LogOut, Plus, UserCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-provider';
import { isActive, NAV_SECTIONS } from './nav-config';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent',
        active ? 'bg-brand-dark font-semibold text-white' : 'text-slate-400 hover:bg-brand-dark/60 hover:text-slate-100',
      )}
    >
      {active && <span aria-hidden className="absolute inset-y-1 left-0 w-1 rounded-r bg-brand-accent" />}
      {children}
    </Link>
  );
}

/** No mobile a sidebar é um drawer: fora da tela fica `inert` (sem foco/leitor de tela). */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return desktop;
}

export const Sidebar = memo(function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { hasRole, logout, user } = useAuth();
  const desktop = useIsDesktop();
  const hidden = !desktop && !open;

  useEffect(() => {
    if (!open || desktop) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, desktop, onClose]);

  return (
    <>
      <div
        className={cn('fixed inset-0 z-30 bg-brand-darker/60 lg:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
        aria-hidden
      />
      <aside
        inert={hidden || undefined}
        aria-label="Menu lateral"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-darker transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between px-5 pb-6 pt-5">
          <Link href="/dashboard" className="block">
            <p className="text-2xl font-bold tracking-tight text-white">Portal ITSM</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500">Gestão de Serviços</p>
          </Link>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:text-white lg:hidden" aria-label="Fechar menu">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3" aria-label="Navegação principal">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((i) => !i.roles || hasRole(...i.roles));
            if (!items.length) return null;
            return (
              <div key={section.title ?? 'main'}>
                {section.title && (
                  <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{section.title}</p>
                )}
                <div className="space-y-0.5">
                  {items.map(({ href, label, icon: Icon }) => {
                    const active = isActive(pathname, href);
                    return (
                      <NavLink key={href} href={href} active={active}>
                        <Icon aria-hidden className={cn('h-[18px] w-[18px] shrink-0', active && 'text-brand-accent')} />
                        {label}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-brand-dark px-3 pb-4 pt-4">
          <Link href="/chamados/novo" className={buttonVariants({ size: 'lg', className: 'mb-3 w-full' })}>
            <Plus aria-hidden className="h-4 w-4" /> Novo Chamado
          </Link>
          <NavLink href="/perfil" active={pathname === '/perfil'}>
            <UserCircle2 aria-hidden className="h-[18px] w-[18px]" />
            <span className="truncate">Minha Conta{user ? ` · ${user.nome.split(' ')[0]}` : ''}</span>
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-brand-dark/60 hover:text-red-300"
          >
            <LogOut aria-hidden className="h-[18px] w-[18px]" /> Sair
          </button>
        </div>
      </aside>
    </>
  );
});
