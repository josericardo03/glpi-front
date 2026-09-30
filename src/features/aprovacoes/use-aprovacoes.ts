'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import type { DecisaoInput } from '@/types';
import { aprovacoesService } from './aprovacoes.service';

export const aprovacoesKeys = {
  all: ['aprovacoes'] as const,
  pendentes: ['aprovacoes', 'pendentes'] as const,
};

export const useAprovacoesPendentes = () => useQuery({ queryKey: aprovacoesKeys.pendentes, queryFn: aprovacoesService.pendentes });

export const useDecidirAprovacao = (onSuccess?: () => void) =>
  useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: DecisaoInput }) => aprovacoesService.decidir(id, input),
    invalidate: [aprovacoesKeys.all, ['chamados'], ['notificacoes']],
    successMessage: (_, { id, input }) => `Solicitação #${id} ${input.decisao === 'APROVADA' ? 'aprovada' : 'rejeitada'}.`,
    onSuccess,
  });
