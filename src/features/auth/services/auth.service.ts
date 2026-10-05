import axios from 'axios';
import { api } from '@/lib/api';
import { byId, lookups } from '@/lib/backend/lookups';
import { authUserToUsuario, toUsuario } from '@/lib/backend/usuario.mapper';
import type { ApiAuthUser, ApiCliente, ApiLoginResponse } from '@/lib/backend/types';
import { data, request } from '@/lib/http';
import * as db from '@/mocks/db';
import type { LoginInput, Tenant, Usuario } from '@/types';

/**
 * /auth/me não traz departamento nem datas; completa com o cadastro quando disponível.
 * As tabelas de apoio só dependem do token, então são buscadas em paralelo com /auth/me.
 */
async function meReal(): Promise<Usuario> {
  const apoio = Promise.all([lookups.usuarios(), lookups.departamentos()]).catch(() => null);
  const u = await data(api.get<ApiAuthUser>('/auth/me'));
  const tabelas = await apoio;
  const row = tabelas?.[0].find((x) => x.id === u.id);
  return row && tabelas ? toUsuario(row, byId(tabelas[1])) : authUserToUsuario(u);
}

export const authService = {
  login: (input: LoginInput) =>
    request<string>(
      async () => {
        const r = await data(api.post<ApiLoginResponse>('/auth/login', { email: input.email.trim(), password: input.senha }));
        return r.access_token;
      },
      () => {
        if (!input.email.includes('@') || input.senha.length < 8) throw new Error('Credenciais inválidas.');
        return `mock.${btoa(input.email)}.jwt`;
      },
    ),

  me: () =>
    request<Usuario>(
      meReal,
      () => db.usuarios[0]!,
    ),

  /** Não há endpoint de troca de senha: valida a senha atual tentando autenticar com ela. */
  verificarSenha: (email: string, senha: string) =>
    request<boolean>(
      async () => {
        try {
          await api.post('/auth/login', { email, password: senha });
          return true;
        } catch (err) {
          if (axios.isAxiosError(err) && err.response?.status === 401) return false;
          throw err;
        }
      },
      () => senha.length >= 8,
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
