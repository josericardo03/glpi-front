import { notFound } from 'next/navigation';

/** Converte o segmento `[id]` em inteiro positivo; qualquer outro valor resulta em 404. */
export function parseRouteId(raw: string): number {
  const id = /^\d{1,15}$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  return id;
}
