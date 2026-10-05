import type { Metadata } from 'next';
import { KbEditorView } from '@/features/kb/components/kb-editor-view';
import { parseRouteId } from '@/lib/route';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Editar Artigo' };

export default async function EditarArtigoPage({ params }: Props) {
  const { id } = await params;
  return <KbEditorView id={parseRouteId(id)} />;
}
