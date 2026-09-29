import { api } from '@/lib/api';
import { request } from '@/lib/http';
import * as db from '@/mocks/db';
import type { AuthResponse, LoginInput, Tenant, Usuario } from '@/types';

export const authService = {
  login: (input: LoginInput) =>
    request<AuthResponse>(
      () => api.post('/auth/login', input),
      () => {
        if (!input.email.includes('@') || input.senha.length < 4) throw new Error('Credenciais inválidas.');
        return { accessToken: `mock.${btoa(input.email)}.jwt`, usuario: db.usuarios[0]! };
      },
    ),

  me: () => request<Usuario>(() => api.get('/auth/me'), () => db.usuarios[0]!),

  currentTenant: () =>
    request<Tenant>(() => api.get('/tenants/current'), () => ({ id: 1, nome: 'Matriz Corp', dominio: 'matriz.portal-itsm.com.br' })),
};
