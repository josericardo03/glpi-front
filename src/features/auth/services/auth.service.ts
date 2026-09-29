import { api } from '@/lib/api';
import { authUserToUsuario } from '@/lib/backend/usuario.mapper';
import type { ApiAuthUser, ApiCliente, ApiLoginResponse } from '@/lib/backend/types';
import { data, request } from '@/lib/http';
import * as db from '@/mocks/db';
import type { AuthResponse, LoginInput, Tenant, Usuario } from '@/types';

export const authService = {
  login: (input: LoginInput) =>
    request<AuthResponse>(
      async () => {
        const r = await data(api.post<ApiLoginResponse>('/auth/login', { email: input.email.trim(), password: input.senha }));
        return { accessToken: r.access_token, usuario: authUserToUsuario(r.user) };
      },
      () => {
        if (!input.email.includes('@') || input.senha.length < 8) throw new Error('Credenciais inválidas.');
        return { accessToken: `mock.${btoa(input.email)}.jwt`, usuario: db.usuarios[0]! };
      },
    ),

  me: () =>
    request<Usuario>(
      async () => authUserToUsuario(await data(api.get<ApiAuthUser>('/auth/me'))),
      () => db.usuarios[0]!,
    ),

  currentTenant: () =>
    request<Tenant>(
      async () => {
        const t = await data(api.get<ApiCliente>('/tenants/current'));
        return { id: t.id, nome: t.nome_fantasia, dominio: t.razao_social };
      },
      () => ({ id: 1, nome: 'Matriz Corp', dominio: 'matriz.portal-itsm.com.br' }),
    ),
};
