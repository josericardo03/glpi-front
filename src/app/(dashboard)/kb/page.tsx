import type { Metadata } from 'next';
import { KbHomeView } from '@/features/kb/components/kb-home-view';

export const metadata: Metadata = { title: 'Base de Conhecimento' };

export default function KbPage() {
  return <KbHomeView />;
}
