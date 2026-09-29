import type { Metadata } from 'next';
import { RelatoriosView } from '@/features/dashboard/components/relatorios-view';

export const metadata: Metadata = { title: 'Relatórios & TMA' };

export default function RelatoriosPage() {
  return <RelatoriosView />;
}
