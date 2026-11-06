import axios from 'axios';
import { api } from '@/lib/api';
import { byId, currentTenantId, lookups } from '@/lib/backend/lookups';
import { authUserToUsuario, toUsuario } from '@/lib/backend/usuario.mapper';
import type { ApiAuthUser, ApiCliente, ApiLoginResponse } from '@/lib/backend/types';
import { data, request } from '@/lib/http';
import * as db from '@/mocks/db';
import type { LoginInput, Tenant, Usuario } from '@/types';

export interface ClienteDoLogin {
  id: number;
  nome: string;
}

/** O e-mail pertence a mais de um cliente e a senha confere em todos os listados. */
export class ClienteObrigatorioError extends Error {
  constructor(readonly clientes: ClienteDoLogin[]) {
    super('Este e-mail pertence a mais de um cliente. Escolha em qual deseja entrar.');
    this.name = 'ClienteObrigatorioError';
  }
}

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
        try {
          const r = await data(
            api.post<ApiLoginResponse>('/auth/login', {
              email: input.email.trim(),
              password: input.senha,
              ...(input.idCliente && { id_cliente: input.idCliente }),
            }),
          );
          return r.access_token;
        } catch (err) {
          // 409: a senha confere em mais de um cliente; a API devolve quais, para o usuário escolher.
          const clientes = axios.isAxiosError(err) && err.response?.status === 409 ? (err.response.data as { clientes?: ClienteDoLogin[] })?.clientes : undefined;
          if (Array.isArray(clientes) && clientes.length) throw new ClienteObrigatorioError(clientes);
          throw err;
        }
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

  /**
   * Não há endpoint de troca de senha: valida a senha atual tentando autenticar com ela.
   * Envia o `id_cliente`: sem ele, um e-mail presente em mais de um tenant é rejeitado como ambíguo
   * e a senha correta apareceria como "senha atual incorreta".
   */
  verificarSenha: (email: string, senha: string) =>
    request<boolean>(
      async () => {
        try {
          await api.post('/auth/login', { email, password: senha, id_cliente: currentTenantId() });
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
