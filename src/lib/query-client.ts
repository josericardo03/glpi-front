import { QueryClient } from '@tanstack/react-query';

/** Instância única: compartilhada entre o Provider e a camada de serviços (joins e cache de lookups). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (count, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        return status !== undefined && status >= 400 && status < 500 ? false : count < 2;
      },
    },
  },
});
