import type { Metadata } from 'next';
import { AtivosView } from '@/features/ativos/components/ativos-view';

export const metadata: Metadata = { title: 'Inventário CMDB' };

export default function AtivosPage() {
  return <AtivosView />;
}
