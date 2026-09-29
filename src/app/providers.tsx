'use client';

import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from '@/features/auth/auth-provider';
import { queryClient } from '@/lib/query-client';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
