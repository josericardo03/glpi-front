import { api, TOKEN_KEY } from '@/lib/api';
import { data } from '@/lib/http';
import { queryClient } from '@/lib/query-client';
import type { ApiCategoria, ApiDepartamento, ApiGrupo, ApiUsuario } from './types';

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

const fetchLookup = <T>(queryKey: readonly string[], url: string) =>
  queryClient.fetchQuery({ queryKey, queryFn: () => data(api.get<T[]>(url)), staleTime: 60_000 });

export const lookups = {
  usuarios: () => fetchLookup<ApiUsuario>(lookupKeys.usuarios, '/usuarios'),
  categorias: () => fetchLookup<ApiCategoria>(lookupKeys.categorias, '/categorias'),
  grupos: () => fetchLookup<ApiGrupo>(lookupKeys.grupos, '/grupos-suporte'),
  departamentos: () => fetchLookup<ApiDepartamento>(lookupKeys.departamentos, '/departamentos'),
};

export const invalidateLookups = () => queryClient.invalidateQueries({ queryKey: lookupKeys.all });

export function byId<T extends { id: number }>(rows: T[]) {
  return new Map(rows.map((r) => [r.id, r]));
}

function jwtPayload(): { sub: number; id_cliente: number } {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  const payload = token?.split('.')[1];
  if (!payload) throw new Error('Sessão expirada. Faça login novamente.');
  try {
    const raw = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { sub: unknown; id_cliente: unknown };
    const sub = Number(raw.sub);
    const idCliente = Number(raw.id_cliente);
    if (!Number.isFinite(sub) || !Number.isFinite(idCliente)) throw new Error();
    return { sub, id_cliente: idCliente };
  } catch {
    throw new Error('Sessão inválida. Faça login novamente.');
  }
}

/** `id_cliente` do usuário logado (necessário em GET /chamados/:idCliente/:id). */
export const currentTenantId = () => jwtPayload().id_cliente;
export const currentUserId = () => jwtPayload().sub;

/** Converte caminhos relativos do backend (ex.: /uploads/...) em URL absoluta. */
export function assetUrl(path: string | null) {
  if (!path || /^(https?:|data:image\/)/i.test(path)) return path;
  return new URL(path, api.defaults.baseURL).href;
}
