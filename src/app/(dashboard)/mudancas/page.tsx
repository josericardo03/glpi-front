import type { Metadata } from 'next';
import { MudancasView } from '@/features/itil/components/mudancas-view';
import { idDaBusca } from '@/lib/route';

export const metadata: Metadata = { title: 'Mudanças' };

export default async function MudancasPage({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  const { id } = await searchParams;
  return <MudancasView idInicial={idDaBusca(id)} />;
}
