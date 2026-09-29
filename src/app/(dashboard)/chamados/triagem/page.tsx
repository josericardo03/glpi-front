import type { Metadata } from 'next';
import { TriagemView } from '@/features/chamados/components/triagem-view';

export const metadata: Metadata = { title: 'Triagem de Chamados' };

export default function TriagemPage() {
  return <TriagemView />;
}
