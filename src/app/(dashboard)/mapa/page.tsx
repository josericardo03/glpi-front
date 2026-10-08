import type { Metadata } from 'next';
import { MapaSoftwareView } from '@/features/mapa/components/mapa-software-view';

export const metadata: Metadata = { title: 'Mapa de software' };

export default function MapaPage() {
  return <MapaSoftwareView />;
}
