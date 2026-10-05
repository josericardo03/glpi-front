'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import type { MudancaInput, MudancaUpdate, ProblemaInput, ProblemaUpdate } from '@/types';
import { mudancasService, problemasService } from './itil.service';

export const itilKeys = {
  problemas: ['problemas'] as const,
  problema: (id: number) => ['problemas', id] as const,
  mudancas: ['mudancas'] as const,
  mudanca: (id: number) => ['mudancas', id] as const,
};

/** O detalhe do chamado mostra problemas e mudanças vinculados (título e status). */
const CHAMADOS = ['chamados'] as const;

export const useProblemas = () => useQuery({ queryKey: itilKeys.problemas, queryFn: problemasService.list });
export const useProblema = (id: number | null) =>
  useQuery({ queryKey: itilKeys.problema(id ?? 0), queryFn: () => problemasService.get(id!), enabled: id !== null });
export const useMudancas = (enabled = true) => useQuery({ queryKey: itilKeys.mudancas, queryFn: mudancasService.list, enabled, staleTime: 30_000 });
export const useMudanca = (id: number | null) =>
  useQuery({ queryKey: itilKeys.mudanca(id ?? 0), queryFn: () => mudancasService.get(id!), enabled: id !== null });

export const useCriarProblema = (onSuccess?: () => void) =>
  useApiMutation({ mutationFn: (p: ProblemaInput) => problemasService.create(p), invalidate: [itilKeys.problemas, CHAMADOS], successMessage: 'Problema registrado.', onSuccess });

export const useAtualizarProblema = (id: number, onSuccess?: () => void) =>
  useApiMutation({
    mutationFn: (p: ProblemaUpdate) => problemasService.update(id, p),
    invalidate: [itilKeys.problemas, CHAMADOS],
    successMessage: 'Problema atualizado.',
    onSuccess,
  });

export const useCriarMudanca = (onSuccess?: () => void) =>
  useApiMutation({
    mutationFn: (m: MudancaInput) => mudancasService.create(m),
    invalidate: [itilKeys.mudancas, CHAMADOS, ['aprovacoes']],
    successMessage: 'Mudança registrada como rascunho.',
    onSuccess,
  });

export const useAtualizarMudanca = (id: number, onSuccess?: () => void) =>
  useApiMutation({
    mutationFn: (m: MudancaUpdate) => mudancasService.update(id, m),
    invalidate: [itilKeys.mudancas, CHAMADOS],
    successMessage: 'Mudança atualizada.',
    onSuccess,
  });
