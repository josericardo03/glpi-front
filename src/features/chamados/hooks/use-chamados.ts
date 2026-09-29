'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import type { AtualizarStatusInput, ChamadoFiltros, ChamadoInput, MotivoPausa } from '@/types';
import { chamadosService } from '../services/chamados.service';

export const chamadosKeys = {
  all: ['chamados'] as const,
  list: (f: ChamadoFiltros) => ['chamados', 'list', f] as const,
  triagem: (f: ChamadoFiltros) => ['chamados', 'triagem', f] as const,
  detail: (id: number) => ['chamados', 'detail', id] as const,
};

export const useChamados = (f: ChamadoFiltros) =>
  useQuery({ queryKey: chamadosKeys.list(f), queryFn: () => chamadosService.list(f), placeholderData: keepPreviousData });

export const useTriagem = (f: ChamadoFiltros) =>
  useQuery({ queryKey: chamadosKeys.triagem(f), queryFn: () => chamadosService.triagem(f), placeholderData: keepPreviousData });

export const useChamado = (id: number) =>
  useQuery({ queryKey: chamadosKeys.detail(id), queryFn: () => chamadosService.get(id), enabled: Number.isFinite(id) });

export function useCreateChamado() {
  return useApiMutation({
    mutationFn: async ({ input, arquivos }: { input: ChamadoInput; arquivos: File[] }) => {
      const chamado = await chamadosService.create(input);
      await Promise.all(arquivos.map((f) => chamadosService.uploadAnexo(chamado.id, f)));
      return chamado;
    },
    invalidate: [chamadosKeys.all],
    successMessage: (c) => `Chamado #${c.id} aberto com sucesso.`,
  });
}

export function useAtualizarStatus() {
  return useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: AtualizarStatusInput }) => chamadosService.atualizarStatus(id, input),
    invalidate: [chamadosKeys.all],
    successMessage: (_, { id }) => `Chamado #${id} atualizado.`,
  });
}

export function useComentar(id: number) {
  return useApiMutation({
    mutationFn: (body: { conteudo: string; interno: boolean }) => chamadosService.comentar(id, body),
    invalidate: [chamadosKeys.detail(id)],
    successMessage: 'Comentário enviado.',
  });
}

export function usePausar(id: number) {
  return useApiMutation({
    mutationFn: (body: { motivo: MotivoPausa }) => chamadosService.pausar(id, body),
    invalidate: [chamadosKeys.all],
    successMessage: 'SLA pausado e chamado pendenciado.',
  });
}

export function useWorklog(id: number) {
  return useApiMutation({
    mutationFn: (body: { descricao: string; minutos: number }) => chamadosService.registrarWorklog(id, body),
    invalidate: [chamadosKeys.detail(id)],
    successMessage: 'Worklog registrado.',
  });
}

export function useUploadAnexo(id: number) {
  return useApiMutation({
    mutationFn: (file: File) => chamadosService.uploadAnexo(id, file),
    invalidate: [chamadosKeys.detail(id)],
    successMessage: 'Anexo enviado.',
  });
}
