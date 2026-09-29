'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { TOKEN_KEY } from '@/lib/api';
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

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setStatus('unauthenticated');
      return;
    }
    authService
      .me()
      .then((u) => {
        setUser(u);
        setStatus('authenticated');
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setStatus('unauthenticated');
      });
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const { accessToken, usuario } = await authService.login(input);
    localStorage.setItem(TOKEN_KEY, accessToken);
    setUser(usuario);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    queryClient.clear();
    setUser(null);
    setStatus('unauthenticated');
    router.replace('/login');
  }, [queryClient, router]);

  const hasRole = useCallback((...roles: Papel[]) => !!user && roles.some((r) => user.papeis.includes(r)), [user]);

  const value = useMemo(() => ({ user, status, login, logout, hasRole, updateUser: setUser }), [user, status, login, logout, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
