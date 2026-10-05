'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { notificacoesService } from './notificacoes.service';

export const notificacoesKeys = {
  all: ['notificacoes'] as const,
  lista: ['notificacoes', 'lista'] as const,
  naoLidas: ['notificacoes', 'nao-lidas'] as const,
};

export function useNotificacoes() {
  return useQuery({
    queryKey: notificacoesKeys.lista,
    queryFn: notificacoesService.list,
    refetchInterval: 60_000,
  });
}

/** Só o total (`/notificacoes/nao-lidas/total`): o sino não precisa baixar a lista. */
export function useUnreadCount() {
  const { data } = useQuery({
    queryKey: notificacoesKeys.naoLidas,
    queryFn: notificacoesService.naoLidas,
    refetchInterval: 60_000,
  });
  return data ?? 0;
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
