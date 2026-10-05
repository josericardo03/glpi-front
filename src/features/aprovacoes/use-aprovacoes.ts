'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import type { AprovacaoInput, DecisaoInput, FiltroStatusAprovacao } from '@/types';
import { aprovacoesService } from './aprovacoes.service';

export const aprovacoesKeys = {
  all: ['aprovacoes'] as const,
  list: (filtro: FiltroStatusAprovacao) => ['aprovacoes', filtro] as const,
};

export const useAprovacoes = (filtro: FiltroStatusAprovacao) =>
  useQuery({ queryKey: aprovacoesKeys.list(filtro), queryFn: () => aprovacoesService.list(filtro), placeholderData: keepPreviousData });

export const useCriarAprovacao = (onSuccess?: () => void) =>
  useApiMutation({
    mutationFn: (input: AprovacaoInput) => aprovacoesService.criar(input),
    invalidate: [aprovacoesKeys.all, ['notificacoes']],
    successMessage: 'Solicitação de aprovação enviada.',
    onSuccess,
  });

/** Decidir a aprovação de uma mudança também muda o status dela (AGENDADA ou CANCELADA). */
export const useDecidirAprovacao = (onSuccess?: () => void) =>
  useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: DecisaoInput }) => aprovacoesService.decidir(id, input),
    invalidate: [aprovacoesKeys.all, ['chamados'], ['mudancas'], ['notificacoes']],
    successMessage: (_, { id, input }) => `Solicitação #${id} ${input.decisao === 'APROVADA' ? 'aprovada' : 'rejeitada'}.`,
    onSuccess,
  });
