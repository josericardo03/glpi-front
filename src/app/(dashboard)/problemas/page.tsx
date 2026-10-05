import type { Metadata } from 'next';
import { ProblemasView } from '@/features/itil/components/problemas-view';
import { idDaBusca } from '@/lib/route';

export const metadata: Metadata = { title: 'Problemas' };

export default async function ProblemasPage({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  const { id } = await searchParams;
  return <ProblemasView idInicial={idDaBusca(id)} />;
}
