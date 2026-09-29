'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import type { AtivoFiltros, AtivoInput, Especificacao, Manutencao } from '@/types';
import { ativosService } from './ativos.service';

export const ativosKeys = {
  all: ['ativos'] as const,
  list: (f: AtivoFiltros) => ['ativos', 'list', f] as const,
  detail: (id: number) => ['ativos', 'detail', id] as const,
};

export const useAtivos = (f: AtivoFiltros) =>
  useQuery({ queryKey: ativosKeys.list(f), queryFn: () => ativosService.list(f), placeholderData: keepPreviousData });

export const useAtivo = (id: number) => useQuery({ queryKey: ativosKeys.detail(id), queryFn: () => ativosService.get(id) });

export const useCreateAtivo = () =>
  useApiMutation({ mutationFn: (i: AtivoInput) => ativosService.create(i), invalidate: [ativosKeys.all], successMessage: (a) => `Ativo ${a.codigo} cadastrado.` });

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
