import type { Metadata } from 'next';
import { KbEditorView } from '@/features/kb/components/kb-editor-view';

export const metadata: Metadata = { title: 'Novo Artigo' };

export default function NovoArtigoPage() {
  return <KbEditorView />;
}
