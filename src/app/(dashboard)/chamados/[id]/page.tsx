import type { Metadata } from 'next';
import { ChamadoWorkspace } from '@/features/chamados/components/chamado-workspace';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Chamado #${id}` };
}

export default async function ChamadoPage({ params }: Props) {
  const { id } = await params;
  return <ChamadoWorkspace id={Number(id)} />;
}
