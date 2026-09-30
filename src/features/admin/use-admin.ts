'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import type { Branding, ClienteInput, IntegracaoInput, PoliticaSla } from '@/types';
import { auditoriaService, brandingService, clientesService, integracoesService, slaService } from './admin.service';

export const adminKeys = {
  politicas: ['admin', 'politicas-sla'] as const,
  horarios: ['admin', 'horarios'] as const,
  branding: ['branding'] as const,
  integracoes: ['admin', 'integracoes'] as const,
  clientes: ['admin', 'clientes'] as const,
  auditoria: ['admin', 'auditoria'] as const,
};

export const usePoliticasSla = () => useQuery({ queryKey: adminKeys.politicas, queryFn: slaService.politicas });
export const useHorarios = () => useQuery({ queryKey: adminKeys.horarios, queryFn: slaService.horarios, staleTime: 10 * 60_000 });
export const useBranding = () => useQuery({ queryKey: adminKeys.branding, queryFn: brandingService.get, staleTime: Infinity });
export const useIntegracoes = () => useQuery({ queryKey: adminKeys.integracoes, queryFn: integracoesService.list });
export const useClientes = () => useQuery({ queryKey: adminKeys.clientes, queryFn: clientesService.list });
export const useAuditoria = () => useQuery({ queryKey: adminKeys.auditoria, queryFn: auditoriaService.list, staleTime: 30_000 });

export const useSalvarSla = () =>
  useApiMutation({ mutationFn: (p: PoliticaSla[]) => slaService.salvar(p), invalidate: [adminKeys.politicas], successMessage: 'Regras de SLA salvas.' });
export const useSalvarBranding = () =>
  useApiMutation({ mutationFn: (b: Branding) => brandingService.salvar(b), invalidate: [adminKeys.branding], successMessage: 'Branding atualizado para todo o portal.' });
export const useCreateIntegracao = () =>
  useApiMutation({ mutationFn: (i: IntegracaoInput) => integracoesService.create(i), invalidate: [adminKeys.integracoes], successMessage: 'Conector criado.' });
export const useTestarIntegracao = () =>
  useApiMutation({ mutationFn: (id: number) => integracoesService.testar(id), invalidate: [adminKeys.integracoes] });
export const useCreateCliente = () =>
  useApiMutation({ mutationFn: (i: ClienteInput) => clientesService.create(i), invalidate: [adminKeys.clientes], successMessage: 'Tenant criado com sucesso.' });
