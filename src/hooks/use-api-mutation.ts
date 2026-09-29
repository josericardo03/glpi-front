'use client';

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { getErrorMessage } from '@/lib/api';

interface Options<TData, TVars> {
  mutationFn: (vars: TVars) => Promise<TData>;
  /** Query keys a invalidar após sucesso. */
  invalidate?: QueryKey[];
  successMessage?: string | ((data: TData, vars: TVars) => string);
  onSuccess?: (data: TData, vars: TVars) => void;
}

/** useMutation padronizado: toast de sucesso/erro (401/403/409/422) + invalidação de cache. */
export function useApiMutation<TData = unknown, TVars = void>({ mutationFn, invalidate, successMessage, onSuccess }: Options<TData, TVars>) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn,
    onSuccess: async (data, vars) => {
      if (invalidate) await Promise.all(invalidate.map((queryKey) => qc.invalidateQueries({ queryKey })));
      if (successMessage) toast.success(typeof successMessage === 'function' ? successMessage(data, vars) : successMessage);
      onSuccess?.(data, vars);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
