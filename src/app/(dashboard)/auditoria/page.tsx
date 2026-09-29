import type { Metadata } from 'next';
import { AuditoriaView } from '@/features/admin/components/auditoria-view';

export const metadata: Metadata = { title: 'Auditoria' };

export default function AuditoriaPage() {
  return <AuditoriaView />;
}
