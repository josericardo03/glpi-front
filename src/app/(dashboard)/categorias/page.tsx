import type { Metadata } from 'next';
import { CategoriasView } from '@/features/cadastros/components/categorias-view';

export const metadata: Metadata = { title: 'Taxonomia de Categorias' };

export default function CategoriasPage() {
  return <CategoriasView />;
}
