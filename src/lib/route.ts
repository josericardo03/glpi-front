import { notFound } from 'next/navigation';

/** Converte o segmento `[id]` em inteiro positivo; qualquer outro valor resulta em 404. */
export function parseRouteId(raw: string): number {
  const id = /^\d{1,15}$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  return id;
}

/** Parâmetro de busca `?id=` opcional; valores inválidos viram `null` em vez de 404. */
export function idDaBusca(raw: string | string[] | undefined): number | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const id = v && /^\d{1,15}$/.test(v) ? Number(v) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
