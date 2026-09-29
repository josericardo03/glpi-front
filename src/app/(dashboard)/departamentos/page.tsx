import type { Metadata } from 'next';
import { DepartamentosView } from '@/features/cadastros/components/departamentos-view';

export const metadata: Metadata = { title: 'Departamentos' };

export default function DepartamentosPage() {
  return <DepartamentosView />;
}
