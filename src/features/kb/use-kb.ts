'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import type { KbArtigo } from '@/types';
import { filtrarArtigos, kbService, type ArtigosFiltros } from './kb.service';

export const kbKeys = {
  all: ['kb'] as const,
  categorias: ['kb', 'categorias'] as const,
  artigos: ['kb', 'artigos'] as const,
};

export const useKbCategorias = () => useQuery({ queryKey: kbKeys.categorias, queryFn: kbService.categorias, staleTime: 5 * 60_000 });

/** Base única de artigos; as listas derivadas não disparam novas requisições. */
export const useKbBase = () => useQuery({ queryKey: kbKeys.artigos, queryFn: kbService.artigos, staleTime: 60_000 });

export function useKbArtigos(f: ArtigosFiltros) {
  const base = useKbBase();
  const { search, categoriaId, ordem, limit } = f;
  const lista = useMemo(() => (base.data ? filtrarArtigos(base.data, { search, categoriaId, ordem, limit }) : undefined), [base.data, search, categoriaId, ordem, limit]);
  return { ...base, data: lista };
}

export function useKbArtigo(id: number) {
  const base = useKbBase();
  return { ...base, data: base.data?.find((a) => a.id === id) };
}

/** Contabiliza uma visualização por artigo e sessão da aba (evita duplicar no StrictMode e em re-montagens). */
const visualizados = new Set<number>();

export function useRegistrarVisualizacao(id: number, pronto: boolean) {
  useEffect(() => {
    if (!pronto || visualizados.has(id)) return;
    visualizados.add(id);
    kbService.visualizar(id).catch(() => visualizados.delete(id));
  }, [id, pronto]);
}

export function useKbFeedback(id: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (util: boolean) => kbService.feedback(id, util),
    successMessage: (novo) => (novo ? 'Obrigado pelo seu feedback!' : 'Você já havia avaliado este artigo.'),
    onSuccess: (novo, util) =>
      qc.setQueryData<KbArtigo[]>(kbKeys.artigos, (lista) =>
        lista?.map((a) =>
          a.id !== id
            ? a
            : {
                ...a,
                meuVoto: util ? 'UTIL' : 'NAO_UTIL',
                votosUteis: a.votosUteis + (novo && util ? 1 : 0),
                votosNaoUteis: a.votosNaoUteis + (novo && !util ? 1 : 0),
              },
        ),
      ),
  });
}
