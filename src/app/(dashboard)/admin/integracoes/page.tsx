import type { Metadata } from 'next';
import { IntegracoesView } from '@/features/admin/components/integracoes-view';

export const metadata: Metadata = { title: 'Integrações' };

export default function IntegracoesPage() {
  return <IntegracoesView />;
}
