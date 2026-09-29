import type { Metadata } from 'next';
import { AprovacoesView } from '@/features/aprovacoes/aprovacoes-view';

export const metadata: Metadata = { title: 'Central de Aprovações' };

export default function AprovacoesPage() {
  return <AprovacoesView />;
}
