'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Bell, HelpCircle, Menu, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-provider';
import { PAPEL_LABEL, perfilPrincipal } from '@/lib/backend/usuario.mapper';
import { useUnreadCount } from '@/features/notificacoes/use-notificacoes';
import { TOP_LINKS } from './nav-config';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const unread = useUnreadCount();
  const [term, setTerm] = useState('');

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (term.trim()) router.push(`/chamados?search=${encodeURIComponent(term.trim())}`);
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-brand-border bg-white/95 px-4 backdrop-blur md:px-6">
      <button type="button" onClick={onMenu} className="rounded-md p-2 text-brand-darker hover:bg-slate-100 lg:hidden" aria-label="Abrir menu">
        <Menu className="h-5 w-5" />
      </button>

      <form onSubmit={onSearch} className="relative hidden w-full max-w-xs md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
        <input
          aria-label="Buscar chamados"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          type="search"
          placeholder="Buscar chamados..."
          className="h-9 w-full rounded-full border border-brand-border bg-slate-50 pl-9 pr-4 text-sm placeholder:text-brand-muted focus:border-brand-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
        />
      </form>

      <nav className="hidden items-center gap-1 xl:flex" aria-label="Atalhos">
        {TOP_LINKS.filter((l) => !l.roles || hasRole(...l.roles)).map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'border-b-2 px-3 py-5 text-sm font-medium transition-colors',
                active ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-muted hover:text-brand-darker',
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <Link href="/notificacoes" className="relative rounded-full p-2 text-brand-darker hover:bg-slate-100" aria-label={`Notificações (${unread} não lidas)`}>
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-critica px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </Link>
        <Link href="/kb" className="rounded-full p-2 text-brand-darker hover:bg-slate-100" aria-label="Ajuda">
          <HelpCircle className="h-5 w-5" />
        </Link>
        <Link href="/perfil" className="ml-1 hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100 sm:flex">
          {user && <Avatar name={user.nome} src={user.avatarUrl} />}
          {user && (
            <span className="hidden text-left leading-tight lg:block">
              <span className="block text-sm font-semibold text-brand-darker">{user.nome}</span>
              <span className="block text-[11px] text-brand-muted">{PAPEL_LABEL[perfilPrincipal(user.papeis)]}</span>
            </span>
          )}
        </Link>
        <Link href="/chamados/novo" className={buttonVariants({ size: 'sm', className: 'ml-2 hidden md:inline-flex' })}>
          <Plus className="h-4 w-4" /> Criar Ticket
        </Link>
      </div>
    </header>
  );
}
