'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { ativosKeys } from '@/features/ativos/use-ativos';
import { mapaService } from './mapa.service';

export const mapaKeys = {
  all: ['mapa'] as const,
  softwares: ['mapa', 'softwares'] as const,
  mapas: ['mapa', 'mapas'] as const,
  ligacoes: (idMapa: number) => ['mapa', 'ligacoes', idMapa] as const,
  impacto: (id: number, idMapa: number) => ['mapa', 'impacto', idMapa, id] as const,
};

export const useSoftwares = () => useQuery({ queryKey: mapaKeys.softwares, queryFn: mapaService.softwares, staleTime: 30_000 });

export const useMapas = () => useQuery({ queryKey: mapaKeys.mapas, queryFn: mapaService.mapas, staleTime: 15_000 });

export const useLigacoes = (idMapa: number | null) =>
  useQuery({
    queryKey: mapaKeys.ligacoes(idMapa ?? 0),
    queryFn: () => mapaService.ligacoes(idMapa!),
    enabled: idMapa != null,
    staleTime: 15_000,
  });

export const useImpacto = (id: number | null, idMapa: number | null) =>
  useQuery({
    queryKey: mapaKeys.impacto(id ?? 0, idMapa ?? 0),
    queryFn: () => mapaService.impacto(id!, idMapa!),
    enabled: id != null && id > 0 && idMapa != null,
  });

export const useCriarMapa = () =>
  useApiMutation({
    mutationFn: (input: { nome: string; descricao: string }) => mapaService.criarMapa(input),
    invalidate: [mapaKeys.mapas],
    successMessage: (_, input) => `Mapa "${input.nome.trim()}" criado.`,
  });

export const useAtualizarMapa = () =>
  useApiMutation({
    mutationFn: (input: { id: number; nome: string; descricao: string }) =>
      mapaService.atualizarMapa(input.id, { nome: input.nome, descricao: input.descricao }),
    invalidate: [mapaKeys.mapas],
    successMessage: 'Mapa atualizado.',
  });

export const useRemoverMapa = () =>
  useApiMutation({
    mutationFn: (input: { id: number; comLigacoes: boolean }) => mapaService.removerMapa(input.id, input.comLigacoes),
    invalidate: [mapaKeys.all],
    successMessage: (r) => (r.ligacoesRemovidas ? `Mapa e ${r.ligacoesRemovidas} dependência(s) removidos.` : 'Mapa removido.'),
  });

export const useCadastrarSoftware = () =>
  useApiMutation({
    mutationFn: (input: { nome: string; codigo: string }) => mapaService.cadastrar(input),
    invalidate: [mapaKeys.softwares, ativosKeys.all],
    successMessage: (_, input) => `${input.nome.trim()} cadastrado.`,
  });

export const useLigar = () =>
  useApiMutation({
    mutationFn: (input: { origem: number; destino: number; idMapa: number }) =>
      mapaService.ligar(input.origem, input.destino, input.idMapa),
    invalidate: [mapaKeys.all],
    successMessage: 'Dependência cadastrada.',
  });

export const useDesligar = () =>
  useApiMutation({
    mutationFn: (input: { origem: number; destino: number }) => mapaService.desligar(input.origem, input.destino),
    invalidate: [mapaKeys.all],
    successMessage: 'Dependência removida.',
  });
