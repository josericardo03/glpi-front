'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { ativosKeys } from '@/features/ativos/use-ativos';
import { mapaService } from './mapa.service';

export const mapaKeys = {
  all: ['mapa'] as const,
  softwares: ['mapa', 'softwares'] as const,
  ligacoes: ['mapa', 'ligacoes'] as const,
  impacto: (id: number) => ['mapa', 'impacto', id] as const,
};

export const useSoftwares = () => useQuery({ queryKey: mapaKeys.softwares, queryFn: mapaService.softwares, staleTime: 30_000 });

export const useLigacoes = () => useQuery({ queryKey: mapaKeys.ligacoes, queryFn: mapaService.ligacoes, staleTime: 15_000 });

export const useImpacto = (id: number | null) =>
  useQuery({
    queryKey: mapaKeys.impacto(id ?? 0),
    queryFn: () => mapaService.impacto(id!),
    enabled: id != null && id > 0,
  });

export const useCadastrarSoftware = () =>
  useApiMutation({
    mutationFn: (input: { nome: string; codigo: string }) => mapaService.cadastrar(input),
    invalidate: [mapaKeys.softwares, ativosKeys.all],
    successMessage: (_, input) => `${input.nome.trim()} cadastrado.`,
  });

export const useLigar = () =>
  useApiMutation({
    mutationFn: (input: { origem: number; destino: number }) => mapaService.ligar(input.origem, input.destino),
    invalidate: [mapaKeys.all],
    successMessage: 'Dependência cadastrada.',
  });

export const useDesligar = () =>
  useApiMutation({
    mutationFn: (input: { origem: number; destino: number }) => mapaService.desligar(input.origem, input.destino),
    invalidate: [mapaKeys.all],
    successMessage: 'Dependência removida.',
  });
