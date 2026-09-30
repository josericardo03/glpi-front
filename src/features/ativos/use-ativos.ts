'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import type { AtivoInput, Especificacao, Manutencao } from '@/types';
import { ativosService } from './ativos.service';

export const ativosKeys = {
  all: ['ativos'] as const,
  list: ['ativos', 'list'] as const,
  detail: (id: number) => ['ativos', 'detail', id] as const,
};

export const useAtivos = () => useQuery({ queryKey: ativosKeys.list, queryFn: ativosService.list, staleTime: 30_000 });

export const useAtivo = (id: number) =>
  useQuery({ queryKey: ativosKeys.detail(id), queryFn: () => ativosService.get(id), enabled: Number.isInteger(id) && id > 0 });

export const useCreateAtivo = () =>
  useApiMutation({ mutationFn: (i: AtivoInput) => ativosService.create(i), invalidate: [ativosKeys.all], successMessage: (_, i) => `Ativo ${i.codigo.trim().toUpperCase()} cadastrado.` });

export const useAddEspecificacao = (id: number) =>
  useApiMutation({
    mutationFn: (b: Omit<Especificacao, 'id'>) => ativosService.addEspecificacao(id, b),
    invalidate: [ativosKeys.detail(id)],
    successMessage: 'Especificação adicionada.',
  });

export const useAddManutencao = (id: number) =>
  useApiMutation({
    mutationFn: (b: Omit<Manutencao, 'id'>) => ativosService.addManutencao(id, b),
    invalidate: [ativosKeys.detail(id)],
    successMessage: 'Manutenção registrada.',
  });
