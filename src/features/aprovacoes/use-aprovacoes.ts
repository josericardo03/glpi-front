'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import type { AprovacaoInput, DecisaoInput } from '@/types';
import { aprovacoesService } from './aprovacoes.service';

export const aprovacoesKeys = {
  all: ['aprovacoes'] as const,
  pendentes: ['aprovacoes', 'pendentes'] as const,
  mudancas: ['mudancas'] as const,
};

export const useAprovacoesPendentes = () => useQuery({ queryKey: aprovacoesKeys.pendentes, queryFn: aprovacoesService.pendentes });

export const useMudancas = (enabled = true) =>
  useQuery({ queryKey: aprovacoesKeys.mudancas, queryFn: aprovacoesService.mudancas, enabled, staleTime: 60_000 });

export const useCriarAprovacao = (onSuccess?: () => void) =>
  useApiMutation({
    mutationFn: (input: AprovacaoInput) => aprovacoesService.criar(input),
    invalidate: [aprovacoesKeys.all, ['notificacoes']],
    successMessage: 'Solicitação de aprovação enviada.',
    onSuccess,
  });

export const useDecidirAprovacao = (onSuccess?: () => void) =>
  useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: DecisaoInput }) => aprovacoesService.decidir(id, input),
    invalidate: [aprovacoesKeys.all, ['chamados'], ['notificacoes']],
    successMessage: (_, { id, input }) => `Solicitação #${id} ${input.decisao === 'APROVADA' ? 'aprovada' : 'rejeitada'}.`,
    onSuccess,
  });
