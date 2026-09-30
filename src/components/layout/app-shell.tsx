'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState, Spinner } from '@/components/ui/feedback';
import { BrandingApplier } from '@/features/admin/components/branding-applier';
import { useAuth } from '@/features/auth/auth-provider';
import { requiredRoles } from './nav-config';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const { status, hasRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  useEffect(() => setMenuOpen(false), [pathname]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const openMenu = useCallback(() => setMenuOpen(true), []);

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const roles = requiredRoles(pathname);
  const permitido = !roles || hasRole(...roles);

  return (
    <div className="min-h-screen">
      <BrandingApplier />
      <Sidebar open={menuOpen} onClose={closeMenu} />
      <div className="lg:pl-64">
        <Topbar onMenu={openMenu} />
        <main className="mx-auto max-w-[1440px] p-4 md:p-6 lg:p-8">
          {permitido ? (
            children
          ) : (
            <EmptyState
              icon={<ShieldAlert className="h-12 w-12" />}
              title="Acesso restrito"
              description="Seu perfil não tem permissão para acessar esta página. Caso precise, solicite acesso ao administrador."
              action={
                <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>
                  Voltar ao dashboard
                </Link>
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}
