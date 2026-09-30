import type { Metadata } from 'next';
import { AtivoDetalheView } from '@/features/ativos/components/ativo-detalhe-view';
import { parseRouteId } from '@/lib/route';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Ficha do Ativo' };

export default async function AtivoPage({ params }: Props) {
  const { id } = await params;
  return <AtivoDetalheView id={parseRouteId(id)} />;
}
