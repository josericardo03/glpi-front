'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import type { Ativo, AtivoFiltros, AtivoInput, Especificacao, ManutencaoInput } from '@/types';
import { ativosService } from './ativos.service';

export const ativosKeys = {
  all: ['ativos'] as const,
  list: ['ativos', 'list'] as const,
  pagina: (f: AtivoFiltros) => ['ativos', 'pagina', f] as const,
  resumo: ['ativos', 'resumo'] as const,
  detail: (id: number) => ['ativos', 'detail', id] as const,
};

export const useAtivos = () => useQuery({ queryKey: ativosKeys.list, queryFn: ativosService.list, staleTime: 30_000 });

/** Uma página do inventário, filtrada no servidor; mantém a anterior na tela enquanto carrega a próxima. */
export const useAtivosPagina = (f: AtivoFiltros) =>
  useQuery({ queryKey: ativosKeys.pagina(f), queryFn: () => ativosService.pagina(f), placeholderData: keepPreviousData, staleTime: 15_000 });

export const useAtivosResumo = () => useQuery({ queryKey: ativosKeys.resumo, queryFn: ativosService.resumo, staleTime: 30_000 });

export const useAtivo = (id: number) =>
  useQuery({ queryKey: ativosKeys.detail(id), queryFn: () => ativosService.get(id), enabled: Number.isInteger(id) && id > 0 });

export const useCreateAtivo = () =>
  useApiMutation({ mutationFn: (i: AtivoInput) => ativosService.create(i), invalidate: [ativosKeys.all], successMessage: (_, i) => `Ativo ${i.codigo.trim().toUpperCase()} cadastrado.` });

export const useUpdateAtivo = () =>
  useApiMutation({
    mutationFn: (i: { id: number; antes: Ativo; input: AtivoInput }) => ativosService.update(i.id, i.antes, i.input),
    invalidate: [ativosKeys.all],
    successMessage: 'Ativo atualizado.',
  });

export const useAddEspecificacao = (id: number) =>
  useApiMutation({
    mutationFn: (b: Omit<Especificacao, 'id'>) => ativosService.addEspecificacao(id, b),
    invalidate: [ativosKeys.detail(id)],
    successMessage: 'Especificação adicionada.',
  });

export const useAddManutencao = (id: number) =>
  useApiMutation({
    mutationFn: (b: ManutencaoInput) => ativosService.addManutencao(id, b),
    invalidate: [ativosKeys.detail(id)],
    successMessage: 'Manutenção registrada.',
  });
