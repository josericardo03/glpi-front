import type { AxiosResponse } from 'axios';
import type { Paginated } from '@/types';

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== 'false';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Executa a chamada real à API NestJS ou, com NEXT_PUBLIC_USE_MOCKS=true,
 * resolve a partir do banco mock em memória com latência simulada.
 */
export async function request<T>(
  real: () => Promise<AxiosResponse<T>>,
  mock: () => T | Promise<T>,
): Promise<T> {
  if (USE_MOCKS) {
    await delay(200 + Math.random() * 200);
    return structuredClone(await mock());
  }
  const { data } = await real();
  return data;
}

export function paginate<T>(items: T[], page = 1, pageSize = 10): Paginated<T> {
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
