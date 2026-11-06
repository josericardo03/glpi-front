import axios from 'axios';
import { api, CABECALHOS_SESSAO, renovarSessao, setAccessToken } from '@/lib/api';
import { byId, lookups } from '@/lib/backend/lookups';
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

/** A senha está certa, mas a conta tem verificação em duas etapas: falta o código do aplicativo. */
export class MfaObrigatorioError extends Error {
  constructor(
    message: string,
    /** `true` quando um código já foi enviado e estava errado. */
    readonly codigoInvalido: boolean,
  ) {
    super(message);
    this.name = 'MfaObrigatorioError';
  }
}

export interface SessaoAtiva {
  id: string;
  criado_em: string;
  ultimo_uso: string;
  endereco_ip: string | null;
  agente: string | null;
  atual: boolean;
}

/** Só no modo mock: sem cookie de servidor, a sessão de demonstração sobrevive ao recarregar pela sessionStorage. */
const MOCK_SESSAO = 'itsm_mock_sessao';

/**
 * /auth/me não traz departamento nem datas; completa com o cadastro quando disponível.
 * As tabelas de apoio só dependem do token, então são buscadas em paralelo com /auth/me.
 */
async function meReal(): Promise<Usuario> {
  const apoio = Promise.all([lookups.usuarios(), lookups.departamentos()]).catch(() => null);
  const u = await data(api.get<ApiAuthUser>('/auth/me'));
  const tabelas = await apoio;
  const row = tabelas?.[0].find((x) => x.id === u.id);
  const base = row && tabelas ? toUsuario(row, byId(tabelas[1])) : authUserToUsuario(u);
  return { ...base, mfaAtivo: u.mfa_ativo ?? false };
}

const cabecalhos = { headers: CABECALHOS_SESSAO };

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
              ...(input.codigoMfa && { codigo_mfa: input.codigoMfa.trim() }),
            }),
          );
          return r.access_token;
        } catch (err) {
          if (axios.isAxiosError(err)) {
            const corpo = err.response?.data as { clientes?: ClienteDoLogin[]; mfa_obrigatorio?: boolean; message?: string } | undefined;
            // 409: a senha confere em mais de um cliente; a API devolve quais, para o usuário escolher.
            if (err.response?.status === 409 && Array.isArray(corpo?.clientes) && corpo.clientes.length) throw new ClienteObrigatorioError(corpo.clientes);
            // 401 com mfa_obrigatorio: a senha está certa, falta (ou está errado) o código do aplicativo.
            if (err.response?.status === 401 && corpo?.mfa_obrigatorio) throw new MfaObrigatorioError(corpo.message ?? 'Informe o código de verificação.', !!input.codigoMfa);
          }
          throw err;
        }
      },
      () => {
        if (!input.email.includes('@') || input.senha.length < 8) throw new Error('Credenciais inválidas.');
        const token = `mock.${btoa(input.email)}.jwt`;
        sessionStorage.setItem(MOCK_SESSAO, token);
        return token;
      },
    ),

  /** Recupera a sessão ao abrir/recarregar a página: o cookie httpOnly vira um novo token de acesso. */
  restaurar: () =>
    request<boolean>(
      async () => (await renovarSessao()) !== null,
      () => {
        const token = sessionStorage.getItem(MOCK_SESSAO);
        if (token) setAccessToken(token);
        return !!token;
      },
    ),

  /** Encerra a sessão no servidor (revoga o refresh token). Falha de rede não impede o logout local. */
  logout: () =>
    request<void>(
      async () => {
        try {
          await api.post('/auth/logout', undefined, cabecalhos);
        } catch {
          // o cookie vence sozinho; o importante é sair da tela
        }
      },
      () => sessionStorage.removeItem(MOCK_SESSAO),
    ),

  me: () => request<Usuario>(meReal, () => db.usuarios[0]!),

  /** Troca a própria senha. As outras sessões caem; esta recebe um token novo. */
  trocarSenha: (senhaAtual: string, novaSenha: string) =>
    request<void>(
      async () => {
        const r = await data(api.post<{ access_token: string }>('/auth/senha', { senha_atual: senhaAtual, nova_senha: novaSenha }));
        setAccessToken(r.access_token);
      },
      () => {
        if (senhaAtual.length < 8) throw new Error('Senha atual incorreta.');
      },
    ),

  esqueciSenha: (email: string) =>
    request<string>(
      async () => (await data(api.post<{ mensagem: string }>('/auth/esqueci-senha', { email: email.trim() }))).mensagem,
      () => 'Se o e-mail estiver cadastrado, enviamos as instruções para redefinir a senha.',
    ),

  redefinirSenha: (token: string, novaSenha: string) =>
    request<void>(
      async () => {
        await api.post('/auth/redefinir-senha', { token, nova_senha: novaSenha });
      },
      () => undefined,
    ),

  mfa: {
    configurar: () =>
      request<{ segredo: string; otpauth_url: string }>(
        () => data(api.post('/auth/mfa/configurar')),
        () => ({ segredo: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', otpauth_url: 'otpauth://totp/Portal%20ITSM:demo?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Portal%20ITSM' }),
      ),
    ativar: (codigo: string) =>
      request<{ codigos_recuperacao: string[] }>(
        () => data(api.post('/auth/mfa/ativar', { codigo })),
        () => ({ codigos_recuperacao: ['aaaaa-11111', 'bbbbb-22222', 'ccccc-33333', 'ddddd-44444'] }),
      ),
    desativar: (senha: string, codigo: string) =>
      request<void>(
        async () => {
          await api.post('/auth/mfa/desativar', { senha, codigo });
        },
        () => undefined,
      ),
  },

  sessoes: {
    listar: () =>
      request<SessaoAtiva[]>(
        () => data(api.get<SessaoAtiva[]>('/auth/sessoes')),
        () => [{ id: 'demo', criado_em: new Date().toISOString(), ultimo_uso: new Date().toISOString(), endereco_ip: '127.0.0.1', agente: 'Navegador de demonstração', atual: true }],
      ),
    revogar: (id: string) =>
      request<void>(
        async () => {
          await api.delete(`/auth/sessoes/${id}`);
        },
        () => undefined,
      ),
    sairDeTodas: () =>
      request<void>(
        async () => {
          await api.post('/auth/logout-todos');
        },
        () => undefined,
      ),
  },

  currentTenant: () =>
    request<Tenant>(
      async () => {
        const t = await data(api.get<ApiCliente>('/tenants/current'));
        return { id: t.id, nome: t.nome_fantasia, dominio: t.razao_social };
      },
      () => ({ id: 1, nome: 'Matriz Corp', dominio: 'matriz.portal-itsm.com.br' }),
    ),
};
