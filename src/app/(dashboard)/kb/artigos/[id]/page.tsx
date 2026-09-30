import type { Metadata } from 'next';
import { KbArtigoView } from '@/features/kb/components/kb-artigo-view';
import { parseRouteId } from '@/lib/route';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Artigo' };

export default async function KbArtigoPage({ params }: Props) {
  const { id } = await params;
  return <KbArtigoView id={parseRouteId(id)} />;
}
