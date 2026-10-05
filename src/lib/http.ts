import type { AxiosResponse } from 'axios';
import type { Paginated } from '@/types';
import { api } from './api';

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Executa a chamada real à API NestJS ou, com NEXT_PUBLIC_USE_MOCKS=true,
 * resolve a partir do banco mock em memória com latência simulada.
 */
export async function request<T>(real: () => Promise<T>, mock: () => T | Promise<T>): Promise<T> {
  if (USE_MOCKS) {
    await delay(200 + Math.random() * 200);
    return structuredClone(await mock());
  }
  return real();
}

export const data = <T>(p: Promise<AxiosResponse<T>>) => p.then((r) => r.data);

/**
 * Teto de `limite` de cada listagem paginada. A API reduz valores acima do teto sem avisar,
 * então pedir mais que isso faria uma página cheia parecer a última.
 */
export const TETO_PAGINA = {
  chamados: 200,
  triagem: 200,
  usuarios: 200,
  ativos: 200,
  artigos: 100,
  aprovacoes: 100,
  problemas: 100,
  mudancas: 100,
  notificacoes: 50,
  auditoria: 200,
} as const;

const MAX_PAGINAS = 50;

/**
 * Telas que filtram e paginam no cliente precisam da lista inteira, então percorremos
 * `pagina`/`limite` até vir uma página incompleta. O teto de páginas evita laço infinito.
 */
export async function getAll<T>(url: string, limite: number, params?: Record<string, unknown>, maxPaginas = MAX_PAGINAS): Promise<T[]> {
  const itens: T[] = [];
  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const lote = await data(api.get<T[]>(url, { params: { ...params, pagina, limite } }));
    itens.push(...lote);
    if (lote.length < limite) break;
  }
  return itens;
}

/** Página fora do intervalo (ex.: lista encolheu após uma mutação) é ajustada para a última existente. */
export function paginate<T>(items: T[], requestedPage = 1, pageSize = 10): Paginated<T> {
  const last = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), last);
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

export function matches(value: string | undefined | null, term?: string) {
  if (!term) return true;
  return (value ?? '').toLowerCase().includes(term.toLowerCase());
}
