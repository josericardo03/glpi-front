'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { kbService, type ArtigosFiltros } from './kb.service';

export const kbKeys = {
  categorias: ['kb', 'categorias'] as const,
  artigos: (f: ArtigosFiltros) => ['kb', 'artigos', f] as const,
  artigo: (id: number) => ['kb', 'artigo', id] as const,
};

export const useKbCategorias = () => useQuery({ queryKey: kbKeys.categorias, queryFn: kbService.categorias, staleTime: 10 * 60_000 });

export const useKbArtigos = (f: ArtigosFiltros) =>
  useQuery({ queryKey: kbKeys.artigos(f), queryFn: () => kbService.artigos(f), placeholderData: keepPreviousData, staleTime: 5 * 60_000 });

export const useKbArtigo = (id: number) => useQuery({ queryKey: kbKeys.artigo(id), queryFn: () => kbService.artigo(id), staleTime: 5 * 60_000 });

export function useKbFeedback(id: number) {
  const qc = useQueryClient();
  return useApiMutation({
    mutationFn: (util: boolean) => kbService.feedback(id, util),
    successMessage: 'Obrigado pelo seu feedback!',
    onSuccess: (artigo) => qc.setQueryData(kbKeys.artigo(id), artigo),
  });
}
