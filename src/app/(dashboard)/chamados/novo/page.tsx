import type { Metadata } from 'next';
import { NovoChamadoForm } from '@/features/chamados/components/novo-chamado-form';

export const metadata: Metadata = { title: 'Novo Chamado' };

export default function NovoChamadoPage() {
  return <NovoChamadoForm />;
}
