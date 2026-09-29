'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { notificacoesService } from './notificacoes.service';

export const notificacoesKeys = { all: ['notificacoes'] as const };

export function useNotificacoes() {
  return useQuery({
    queryKey: notificacoesKeys.all,
    queryFn: notificacoesService.list,
    refetchInterval: 60_000,
  });
}

export function useUnreadCount() {
  const { data } = useNotificacoes();
  return data?.filter((n) => !n.lida).length ?? 0;
}

export function useMarcarLida() {
  return useApiMutation({ mutationFn: notificacoesService.marcarLida, invalidate: [notificacoesKeys.all] });
}

export function useMarcarTodas() {
  return useApiMutation({
    mutationFn: notificacoesService.marcarTodas,
    invalidate: [notificacoesKeys.all],
    successMessage: 'Todas as notificações foram marcadas como lidas.',
  });
}
