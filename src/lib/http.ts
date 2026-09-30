import type { AxiosResponse } from 'axios';
import type { Paginated } from '@/types';

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
