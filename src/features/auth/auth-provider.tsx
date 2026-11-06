'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { httpStatus, SESSION_EXPIRED_EVENT, setAccessToken } from '@/lib/api';
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

const CANAL_AUTH = 'itsm-auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const router = useRouter();
  const queryClient = useQueryClient();

  const encerrarSessao = useCallback(
    (redirect: string) => {
      setAccessToken(null);
      queryClient.clear();
      setUser(null);
      setStatus('unauthenticated');
      router.replace(redirect);
    },
    [queryClient, router],
  );

  // Ao abrir ou recarregar a página não há token em memória: o cookie de refresh gera um novo.
  useEffect(() => {
    let cancelled = false;
    authService
      .restaurar()
      .then(async (existe) => {
        if (cancelled) return;
        if (!existe) {
          setStatus('unauthenticated');
          return;
        }
        const u = await authService.me();
        if (cancelled) return;
        setUser(u);
        setStatus('authenticated');
      })
      .catch((err) => {
        if (cancelled) return;
        // Falha de rede ou 5xx: não há como saber se a sessão vale; segue para o login sem apagar nada.
        if (httpStatus(err) === 401 || httpStatus(err) === 403) setAccessToken(null);
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
    // Sair em uma aba encerra as demais (o token só existe na memória de cada aba).
    const canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CANAL_AUTH) : null;
    if (canal) canal.onmessage = (e: MessageEvent<string>) => e.data === 'logout' && encerrarSessao('/login');
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
      canal?.close();
    };
  }, [encerrarSessao]);

  const login = useCallback(
    async (input: LoginInput) => {
      const token = await authService.login(input);
      setAccessToken(token);
      queryClient.clear();
      try {
        setUser(await authService.me());
        setStatus('authenticated');
      } catch (err) {
        setAccessToken(null);
        throw err;
      }
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    void authService.logout();
    if (typeof BroadcastChannel !== 'undefined') {
      const canal = new BroadcastChannel(CANAL_AUTH);
      canal.postMessage('logout');
      canal.close();
    }
    encerrarSessao('/login');
  }, [encerrarSessao]);

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
