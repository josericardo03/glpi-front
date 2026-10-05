'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import type { KbArtigoInput, KbCategoria, KbCategoriaInput } from '@/types';
import { filtrarArtigos, kbService, type ArtigosFiltros, type EscopoGestao } from './kb.service';

export const kbKeys = {
  all: ['kb'] as const,
  categorias: ['kb', 'categorias'] as const,
  artigos: ['kb', 'artigos'] as const,
  artigo: (id: number) => ['kb', 'artigo', id] as const,
  gestao: (escopo: EscopoGestao) => ['kb', 'gestao', escopo] as const,
};

export const useKbCategorias = () => useQuery({ queryKey: kbKeys.categorias, queryFn: kbService.categorias, staleTime: 5 * 60_000 });

/** Base única de artigos publicados; as listas derivadas não disparam novas requisições. */
export const useKbBase = () => useQuery({ queryKey: kbKeys.artigos, queryFn: kbService.artigos, staleTime: 60_000 });

export function useKbArtigos(f: ArtigosFiltros) {
  const base = useKbBase();
  const { search, categoriaId, ordem, limit } = f;
  const lista = useMemo(() => (base.data ? filtrarArtigos(base.data, { search, categoriaId, ordem, limit }) : undefined), [base.data, search, categoriaId, ordem, limit]);
  return { ...base, data: lista };
}

export const useKbArtigo = (id: number) => useQuery({ queryKey: kbKeys.artigo(id), queryFn: () => kbService.artigo(id), enabled: Number.isInteger(id) && id > 0 });

export const useKbGestao = (escopo: EscopoGestao, enabled = true) =>
  useQuery({ queryKey: kbKeys.gestao(escopo), queryFn: () => kbService.gestao(escopo), enabled, staleTime: 30_000 });

/** Contabiliza uma visualização por artigo e sessão da aba (evita duplicar no StrictMode e em re-montagens). */
const visualizados = new Set<number>();

export function useRegistrarVisualizacao(id: number, publicado: boolean) {
  useEffect(() => {
    if (!publicado || visualizados.has(id)) return;
    visualizados.add(id);
    kbService.visualizar(id).catch(() => visualizados.delete(id));
  }, [id, publicado]);
}

export const useCriarCategoriaKb = (onSuccess?: (c: KbCategoria) => void) =>
  useApiMutation({
    mutationFn: (input: KbCategoriaInput) => kbService.criarCategoria(input),
    invalidate: [kbKeys.all],
    successMessage: (c) => `Categoria "${c.nome}" criada.`,
    onSuccess,
  });

const mensagemSalvo = (r: { publicado: boolean }) => (r.publicado ? 'Artigo publicado na base de conhecimento.' : 'Artigo salvo. Ele aparece na base quando for publicado.');

export const useCriarArtigoKb = (onSuccess?: (r: { id: number; publicado: boolean }) => void) =>
  useApiMutation({
    mutationFn: (input: KbArtigoInput) => kbService.criarArtigo(input),
    invalidate: [kbKeys.all],
    successMessage: mensagemSalvo,
    onSuccess,
  });

export const useAtualizarArtigoKb = (id: number, onSuccess?: (r: { id: number; publicado: boolean }) => void) =>
  useApiMutation({
    mutationFn: (input: KbArtigoInput) => kbService.atualizarArtigo(id, input),
    invalidate: [kbKeys.all],
    successMessage: mensagemSalvo,
    onSuccess,
  });

export const useKbFeedback = (id: number) =>
  useApiMutation({
    mutationFn: (util: boolean) => kbService.feedback(id, util),
    invalidate: [kbKeys.artigo(id), kbKeys.artigos],
    successMessage: (novo) => (novo ? 'Obrigado pelo seu feedback!' : 'Você já havia avaliado este artigo.'),
  });
