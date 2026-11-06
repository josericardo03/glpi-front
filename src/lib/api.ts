import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

/** Disparado quando a sessão não pode mais ser renovada; o AuthProvider encerra a sessão. */
export const SESSION_EXPIRED_EVENT = 'itsm:session-expired';

/** No servidor, sem URL fixa, o navegador chama /api no mesmo endereço do site. */
function apiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured;
  if (typeof window !== 'undefined') return `${window.location.origin}/api`;
  return 'http://127.0.0.1:3000/api';
}

/**
 * O token de acesso (curto) vive só na memória da página: não fica em localStorage, então um XSS não o
 * leva embora para usar depois. Quem mantém a sessão é o refresh token, em cookie httpOnly que o
 * JavaScript não consegue ler. Ao recarregar a página, o token de acesso é obtido de novo pelo cookie.
 */
let accessToken: string | null = null;
export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

/** Enviado nas rotas que usam o cookie: outro site não consegue colocá-lo sem passar pelo CORS (defesa contra CSRF). */
const CABECALHO_AJAX = { 'X-Requested-With': 'XMLHttpRequest' };

export const api = axios.create({
  baseURL: apiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export interface SessaoRenovada {
  access_token: string;
  expires_in: number;
}

let renovacao: Promise<SessaoRenovada | null> | null = null;

/**
 * Troca o cookie de refresh por um novo token de acesso. Várias chamadas ao mesmo tempo (várias requisições
 * recebendo 401 juntas) compartilham uma única renovação. Devolve `null` quando não há sessão.
 */
export function renovarSessao(): Promise<SessaoRenovada | null> {
  renovacao ??= axios
    .post<SessaoRenovada>(`${api.defaults.baseURL}/auth/refresh`, undefined, { withCredentials: true, headers: CABECALHO_AJAX, timeout: 20_000 })
    .then((r) => {
      setAccessToken(r.data.access_token);
      return r.data;
    })
    .catch((erro: unknown) => {
      // Só 401/403 significam "sem sessão". Falha de rede não pode derrubar o usuário: o erro sobe.
      if (axios.isAxiosError(erro) && (erro.response?.status === 401 || erro.response?.status === 403 || erro.response?.status === 400)) {
        setAccessToken(null);
        return null;
      }
      throw erro;
    })
    .finally(() => {
      renovacao = null;
    });
  return renovacao;
}

export const CABECALHOS_SESSAO = CABECALHO_AJAX;

/** Rotas em que um 401 tem outro significado (credencial errada, sem sessão) e não deve disparar renovação. */
const ROTAS_DE_AUTENTICACAO = /\/auth\/(login|refresh|logout|esqueci-senha|redefinir-senha)$/;

type ConfigComTentativa = InternalAxiosRequestConfig & { _renovada?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as ConfigComTentativa | undefined;
    const naoEhRotaDeAuth = !!config?.url && !ROTAS_DE_AUTENTICACAO.test(config.url);
    if (error.response?.status === 401 && config && naoEhRotaDeAuth && typeof window !== 'undefined') {
      if (!config._renovada) {
        config._renovada = true;
        try {
          const sessao = await renovarSessao();
          if (sessao) {
            config.headers.Authorization = `Bearer ${sessao.access_token}`;
            return api.request(config);
          }
        } catch {
          // falha de rede ao renovar: devolve o erro original
          return Promise.reject(error);
        }
      }
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

export const HTTP_MESSAGES: Record<number, string> = {
  400: 'Requisição inválida.',
  401: 'Sessão expirada. Faça login novamente.',
  403: 'Você não tem permissão para executar esta ação.',
  404: 'Recurso não encontrado.',
  409: 'Conflito: o registro já existe ou foi alterado por outro usuário.',
  413: 'Arquivo acima do limite de 20 MB.',
  422: 'Dados inválidos. Verifique os campos do formulário.',
  429: 'Muitas tentativas em sequência. Aguarde um minuto e tente novamente.',
  500: 'Erro interno no servidor.',
  503: 'Serviço indisponível: o banco de dados está fora do ar. Tente novamente em instantes.',
};

export const httpStatus = (error: unknown) => (axios.isAxiosError(error) ? error.response?.status : undefined);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 429 && !(error.response?.data as { message?: string } | undefined)?.message) return HTTP_MESSAGES[429]!;
    if (status === 503) return HTTP_MESSAGES[503]!;
    const data = error.response?.data as { message?: string | string[] } | undefined;
    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    return msg || HTTP_MESSAGES[error.response?.status ?? 0] || 'Falha de comunicação com o servidor.';
  }
  return error instanceof Error ? error.message : 'Erro inesperado.';
}
