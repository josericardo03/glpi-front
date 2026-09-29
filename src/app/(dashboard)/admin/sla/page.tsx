import type { Metadata } from 'next';
import { SlaView } from '@/features/admin/components/sla-view';

export const metadata: Metadata = { title: 'Políticas de SLA' };

export default function SlaPage() {
  return <SlaView />;
}
