'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import type { AuditoriaFiltrosApi, Branding, ClienteInput, FeriadoInput, HorarioInput, IntegracaoInput, IntervaloInput, PoliticaSla, PoliticaSlaInput } from '@/types';
import { auditoriaService, brandingService, clientesService, integracoesService, slaService } from './admin.service';

export const adminKeys = {
  politicas: ['admin', 'politicas-sla'] as const,
  horarios: ['admin', 'horarios'] as const,
  feriados: ['admin', 'feriados'] as const,
  branding: ['branding'] as const,
  integracoes: ['admin', 'integracoes'] as const,
  clientes: ['admin', 'clientes'] as const,
  auditoria: (f: AuditoriaFiltrosApi) => ['admin', 'auditoria', f] as const,
};

export const usePoliticasSla = () => useQuery({ queryKey: adminKeys.politicas, queryFn: slaService.politicas });
export const useHorarios = (enabled = true) => useQuery({ queryKey: adminKeys.horarios, queryFn: slaService.horarios, enabled, staleTime: 5 * 60_000 });
export const useFeriados = () => useQuery({ queryKey: adminKeys.feriados, queryFn: slaService.feriados, staleTime: 5 * 60_000 });
export const useBranding = () => useQuery({ queryKey: adminKeys.branding, queryFn: brandingService.get, staleTime: Infinity });
export const useIntegracoes = () => useQuery({ queryKey: adminKeys.integracoes, queryFn: integracoesService.list });
export const useClientes = () => useQuery({ queryKey: adminKeys.clientes, queryFn: clientesService.list });
export const useAuditoria = (f: AuditoriaFiltrosApi) =>
  useQuery({ queryKey: adminKeys.auditoria(f), queryFn: () => auditoriaService.list(f), staleTime: 30_000, placeholderData: keepPreviousData });

export const useSalvarSla = () =>
  useApiMutation({
    mutationFn: (p: PoliticaSla[]) => slaService.atualizarPoliticas(p),
    invalidate: [adminKeys.politicas],
    successMessage: (_, p) => (p.length === 1 ? 'Política de SLA atualizada.' : `${p.length} políticas de SLA atualizadas.`),
  });
export const useCriarPolitica = (onSuccess?: () => void) =>
  useApiMutation({
    mutationFn: (p: PoliticaSlaInput) => slaService.criarPolitica(p),
    invalidate: [adminKeys.politicas, adminKeys.horarios],
    successMessage: 'Política de SLA criada.',
    onSuccess,
  });
export const useCriarHorario = (onSuccess?: () => void) =>
  useApiMutation({ mutationFn: (h: HorarioInput) => slaService.criarHorario(h), invalidate: [adminKeys.horarios], successMessage: 'Horário comercial criado.', onSuccess });
export const useCriarIntervalo = (onSuccess?: () => void) =>
  useApiMutation({ mutationFn: (i: IntervaloInput) => slaService.criarIntervalo(i), invalidate: [adminKeys.horarios], successMessage: 'Intervalo adicionado.', onSuccess });
export const useAtualizarHorario = (onSuccess?: () => void) =>
  useApiMutation({
    mutationFn: ({ id, ...h }: HorarioInput & { id: number }) => slaService.atualizarHorario(id, h),
    invalidate: [adminKeys.horarios],
    successMessage: 'Horário comercial atualizado.',
    onSuccess,
  });
export const useExcluirHorario = (onSuccess?: () => void) =>
  useApiMutation({ mutationFn: (id: number) => slaService.excluirHorario(id), invalidate: [adminKeys.horarios], successMessage: 'Horário comercial excluído.', onSuccess });
export const useAtualizarIntervalo = (onSuccess?: () => void) =>
  useApiMutation({
    mutationFn: ({ id, ...i }: IntervaloInput & { id: number }) => slaService.atualizarIntervalo(id, i),
    invalidate: [adminKeys.horarios],
    successMessage: 'Intervalo atualizado.',
    onSuccess,
  });
export const useExcluirIntervalo = (onSuccess?: () => void) =>
  useApiMutation({
    mutationFn: ({ horarioId, id }: { horarioId: number; id: number }) => slaService.excluirIntervalo(horarioId, id),
    invalidate: [adminKeys.horarios],
    successMessage: 'Intervalo removido.',
    onSuccess,
  });
export const useCriarFeriado = (onSuccess?: () => void) =>
  useApiMutation({ mutationFn: (f: FeriadoInput) => slaService.criarFeriado(f), invalidate: [adminKeys.feriados], successMessage: 'Feriado cadastrado.', onSuccess });
export const useAtualizarFeriado = (onSuccess?: () => void) =>
  useApiMutation({
    mutationFn: ({ id, ...f }: FeriadoInput & { id: number }) => slaService.atualizarFeriado(id, f),
    invalidate: [adminKeys.feriados],
    successMessage: 'Feriado atualizado.',
    onSuccess,
  });
export const useExcluirFeriado = (onSuccess?: () => void) =>
  useApiMutation({ mutationFn: (id: number) => slaService.excluirFeriado(id), invalidate: [adminKeys.feriados], successMessage: 'Feriado excluído.', onSuccess });
export const useSalvarBranding = () =>
  useApiMutation({ mutationFn: (b: Branding) => brandingService.salvar(b), invalidate: [adminKeys.branding], successMessage: 'Branding atualizado para todo o portal.' });
export const useCreateIntegracao = () =>
  useApiMutation({ mutationFn: (i: IntegracaoInput) => integracoesService.create(i), invalidate: [adminKeys.integracoes], successMessage: 'Conector criado.' });
export const useTestarIntegracao = () =>
  useApiMutation({ mutationFn: (id: number) => integracoesService.testar(id), invalidate: [adminKeys.integracoes] });
export const useCreateCliente = () =>
  useApiMutation({ mutationFn: (i: ClienteInput) => clientesService.create(i), invalidate: [adminKeys.clientes], successMessage: 'Tenant criado com sucesso.' });
