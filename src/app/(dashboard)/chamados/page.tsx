import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageLoader } from '@/components/ui/feedback';
import { FilaGlobalView } from '@/features/chamados/components/fila-global-view';

export const metadata: Metadata = { title: 'Fila Global' };

export default function ChamadosPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <FilaGlobalView />
    </Suspense>
  );
}
