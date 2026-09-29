'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { authService } from '@/features/auth/services/auth.service';
import { dashboardService, type Periodo } from './dashboard.service';

export const useDashboardResumo = (periodo: Periodo = '30d') =>
  useQuery({
    queryKey: ['dashboard', 'resumo', periodo],
    queryFn: () => dashboardService.resumo(periodo),
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });

export const useRelatorioTma = (periodo: Periodo) =>
  useQuery({ queryKey: ['relatorios', 'tma', periodo], queryFn: () => dashboardService.tma(periodo), placeholderData: keepPreviousData });

export const useTenant = () => useQuery({ queryKey: ['tenant', 'current'], queryFn: authService.currentTenant, staleTime: Infinity });
