import axios from 'axios';
import { api } from '@/lib/api';
import { byId, lookups } from '@/lib/backend/lookups';
import { authUserToUsuario, toUsuario } from '@/lib/backend/usuario.mapper';
import type { ApiAuthUser, ApiCliente, ApiLoginResponse } from '@/lib/backend/types';
import { data, request } from '@/lib/http';
import * as db from '@/mocks/db';
import type { LoginInput, Tenant, Usuario } from '@/types';

/** /auth/me não traz departamento nem datas; completa com o cadastro quando disponível. */
async function perfilCompleto(u: ApiAuthUser): Promise<Usuario> {
  try {
    const [usuarios, departamentos] = await Promise.all([lookups.usuarios(), lookups.departamentos()]);
    const row = usuarios.find((x) => x.id === u.id);
    return row ? toUsuario(row, byId(departamentos)) : authUserToUsuario(u);
  } catch {
    return authUserToUsuario(u);
  }
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
      async () => perfilCompleto(await data(api.get<ApiAuthUser>('/auth/me'))),
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
