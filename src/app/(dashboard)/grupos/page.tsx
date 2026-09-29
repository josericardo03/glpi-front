import type { Metadata } from 'next';
import { GruposView } from '@/features/cadastros/components/grupos-view';

export const metadata: Metadata = { title: 'Equipes de Suporte' };

export default function GruposPage() {
  return <GruposView />;
}
