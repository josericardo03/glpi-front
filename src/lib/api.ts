import axios, { AxiosError } from 'axios';

export const TOKEN_KEY = 'itsm_token';
/** Disparado quando a API responde 401 numa rota autenticada; o AuthProvider encerra a sessão. */
export const SESSION_EXPIRED_EVENT = 'itsm:session-expired';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isLogin = error.config?.url?.endsWith('/auth/login');
    if (error.response?.status === 401 && !isLogin && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

const HTTP_MESSAGES: Record<number, string> = {
  400: 'Requisição inválida.',
  401: 'Sessão expirada. Faça login novamente.',
  403: 'Você não tem permissão para executar esta ação.',
  404: 'Recurso não encontrado.',
  409: 'Conflito: o registro já existe ou foi alterado por outro usuário.',
  422: 'Dados inválidos. Verifique os campos do formulário.',
  500: 'Erro interno no servidor.',
};

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    return msg || HTTP_MESSAGES[error.response?.status ?? 0] || 'Falha de comunicação com o servidor.';
  }
  return error instanceof Error ? error.message : 'Erro inesperado.';
}
