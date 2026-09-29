import type { Metadata } from 'next';
import { ClientesView } from '@/features/admin/components/clientes-view';

export const metadata: Metadata = { title: 'Clientes' };

export default function ClientesPage() {
  return <ClientesView />;
}
