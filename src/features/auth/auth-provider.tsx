'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { SESSION_EXPIRED_EVENT, TOKEN_KEY } from '@/lib/api';
import { PERFIL_RANK, perfilPrincipal } from '@/lib/backend/usuario.mapper';
import type { LoginInput, Papel, Usuario } from '@/types';
import { authService } from './services/auth.service';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: Usuario | null;
  status: Status;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Papel[]) => boolean;
  updateUser: (user: Usuario) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const router = useRouter();
  const queryClient = useQueryClient();

  const encerrarSessao = useCallback(
    (redirect: string) => {
      localStorage.removeItem(TOKEN_KEY);
      queryClient.clear();
      setUser(null);
      setStatus('unauthenticated');
      router.replace(redirect);
    },
    [queryClient, router],
  );

  useEffect(() => {
    let cancelled = false;
    if (!localStorage.getItem(TOKEN_KEY)) {
      setStatus('unauthenticated');
      return;
    }
    authService
      .me()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem(TOKEN_KEY);
        setStatus('unauthenticated');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => {
      if (window.location.pathname.startsWith('/login')) return;
      const next = window.location.pathname + window.location.search;
      encerrarSessao(`/login?next=${encodeURIComponent(next)}`);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && !e.newValue) encerrarSessao('/login');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
      window.removeEventListener('storage', onStorage);
    };
  }, [encerrarSessao]);

  const login = useCallback(
    async (input: LoginInput) => {
      const token = await authService.login(input);
      localStorage.setItem(TOKEN_KEY, token);
      queryClient.clear();
      try {
        setUser(await authService.me());
        setStatus('authenticated');
      } catch (err) {
        localStorage.removeItem(TOKEN_KEY);
        throw err;
      }
    },
    [queryClient],
  );

  const logout = useCallback(() => encerrarSessao('/login'), [encerrarSessao]);

  const hasRole = useCallback(
    (...roles: Papel[]) => {
      if (!user) return false;
      const rank = PERFIL_RANK[perfilPrincipal(user.papeis)];
      return roles.some((r) => rank >= PERFIL_RANK[r]);
    },
    [user],
  );

  const value = useMemo(() => ({ user, status, login, logout, hasRole, updateUser: setUser }), [user, status, login, logout, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

/** Aceita apenas caminhos internos, evitando open redirect via `?next=`. */
export function safeRedirect(next: string | null, fallback = '/dashboard') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
