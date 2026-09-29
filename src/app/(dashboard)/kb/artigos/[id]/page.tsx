import type { Metadata } from 'next';
import { KbArtigoView } from '@/features/kb/components/kb-artigo-view';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Artigo' };

export default async function KbArtigoPage({ params }: Props) {
  const { id } = await params;
  return <KbArtigoView id={Number(id)} />;
}
