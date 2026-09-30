import type { Metadata } from 'next';
import { ChamadoWorkspace } from '@/features/chamados/components/chamado-workspace';
import { parseRouteId } from '@/lib/route';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Chamado #${parseRouteId(id)}` };
}

export default async function ChamadoPage({ params }: Props) {
  const { id } = await params;
  return <ChamadoWorkspace id={parseRouteId(id)} />;
}
