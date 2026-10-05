import { api, TOKEN_KEY } from '@/lib/api';
import { data, getAll, TETO_PAGINA } from '@/lib/http';
import { queryClient } from '@/lib/query-client';
import type { ApiCategoria, ApiDepartamento, ApiGrupo, ApiUsuario, PerfilApi } from './types';

/**
 * A API devolve apenas IDs nas listagens; estas tabelas de apoio são buscadas uma vez,
 * mantidas no cache do React Query e usadas para resolver nomes no cliente.
 */
export const lookupKeys = {
  all: ['lookup'] as const,
  usuarios: ['lookup', 'usuarios'] as const,
  categorias: ['lookup', 'categorias'] as const,
  grupos: ['lookup', 'grupos'] as const,
  departamentos: ['lookup', 'departamentos'] as const,
};

const fetchLookup = <T>(queryKey: readonly string[], url: string, tetoPagina?: number) =>
  queryClient.fetchQuery({ queryKey, queryFn: () => (tetoPagina ? getAll<T>(url, tetoPagina) : data(api.get<T[]>(url))), staleTime: 60_000 });

export const lookups = {
  usuarios: () => fetchLookup<ApiUsuario>(lookupKeys.usuarios, '/usuarios', TETO_PAGINA.usuarios),
  categorias: () => fetchLookup<ApiCategoria>(lookupKeys.categorias, '/categorias'),
  grupos: () => fetchLookup<ApiGrupo>(lookupKeys.grupos, '/grupos-suporte'),
  departamentos: () => fetchLookup<ApiDepartamento>(lookupKeys.departamentos, '/departamentos'),
};

export const invalidateLookups = () => queryClient.invalidateQueries({ queryKey: lookupKeys.all });

export function byId<T extends { id: number }>(rows: T[]) {
  return new Map(rows.map((r) => [r.id, r]));
}

function jwtPayload(): { sub: number; id_cliente: number; perfil: PerfilApi } {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  const payload = token?.split('.')[1];
  if (!payload) throw new Error('Sessão expirada. Faça login novamente.');
  try {
    const raw = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { sub: unknown; id_cliente: unknown; perfil: unknown };
    const sub = Number(raw.sub);
    const idCliente = Number(raw.id_cliente);
    if (!Number.isFinite(sub) || !Number.isFinite(idCliente)) throw new Error();
    const perfil = typeof raw.perfil === 'string' && raw.perfil in NIVEL_PERFIL ? (raw.perfil as PerfilApi) : 'SOLICITANTE';
    return { sub, id_cliente: idCliente, perfil };
  } catch {
    throw new Error('Sessão inválida. Faça login novamente.');
  }
}

/** `id_cliente` do usuário logado (necessário em GET /chamados/:idCliente/:id). */
export const currentTenantId = () => jwtPayload().id_cliente;
export const currentUserId = () => jwtPayload().sub;

const NIVEL_PERFIL: Record<PerfilApi, number> = { SOLICITANTE: 0, TECNICO: 1, GESTOR: 2, ADMIN: 3 };

/** Evita chamar rotas que a API restringe por perfil (ex.: /integracoes só para ADMIN). */
export const perfilAtualAtinge = (minimo: PerfilApi) => NIVEL_PERFIL[jwtPayload().perfil] >= NIVEL_PERFIL[minimo];

/** Converte caminhos relativos do backend (ex.: /uploads/...) em URL absoluta. */
export function assetUrl(path: string | null) {
  if (!path || /^(https?:|data:image\/)/i.test(path)) return path;
  return new URL(path, api.defaults.baseURL).href;
}

/** Inverso de `assetUrl`: arquivos servidos pelo próprio backend voltam a ser gravados como caminho relativo. */
export function assetPath(url: string | null) {
  if (!url) return url;
  const origin = new URL(api.defaults.baseURL!).origin;
  return url.startsWith(`${origin}/`) ? url.slice(origin.length) : url;
}
