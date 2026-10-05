'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FileClock, Pencil } from 'lucide-react';
import { Badge, Card, CardHeader, EmptyState, ErrorState, Skeleton, Tabs } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import type { StatusArtigoKb } from '@/types';
import type { EscopoGestao } from '../kb.service';
import { useKbGestao } from '../use-kb';
import { STATUS_ARTIGO } from './kb-status';

type Aba = 'meus' | Exclude<StatusArtigoKb, 'PUBLICADO'>;

const ESCOPOS: Record<Aba, EscopoGestao> = {
  meus: { meus: true },
  RASCUNHO: { status: 'RASCUNHO' },
  REVISAO: { status: 'REVISAO' },
  ARQUIVADO: { status: 'ARQUIVADO' },
};

const VAZIO: Record<Aba, string> = {
  meus: 'Você ainda não escreveu artigos.',
  RASCUNHO: 'Nenhum rascunho no momento.',
  REVISAO: 'Nenhum artigo aguardando revisão.',
  ARQUIVADO: 'Nenhum artigo arquivado.',
};

/** Artigos fora da base pública (rascunho, revisão, arquivados) e os do próprio técnico. */
export function KbGestao() {
  const [aba, setAba] = useState<Aba>('meus');
  const q = useKbGestao(ESCOPOS[aba]);

  return (
    <Card className="mt-10">
      <CardHeader title="Artigos em elaboração" description="Visível apenas para técnicos." icon={<FileClock className="h-5 w-5" />} />
      <Tabs
        value={aba}
        onChange={setAba}
        aria-label="Filtro de artigos em elaboração"
        items={[
          { value: 'meus', label: 'Meus artigos' },
          { value: 'RASCUNHO', label: 'Rascunhos' },
          { value: 'REVISAO', label: 'Em revisão' },
          { value: 'ARQUIVADO', label: 'Arquivados' },
        ]}
      />
      {q.isError ? (
        <div className="p-5"><ErrorState message={getErrorMessage(q.error)} onRetry={q.refetch} /></div>
      ) : q.isLoading ? (
        <div className="space-y-2 p-5">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : !q.data?.length ? (
        <EmptyState title={VAZIO[aba]} />
      ) : (
        <ul className="divide-y divide-brand-border">
          {q.data.map((a) => {
            const s = STATUS_ARTIGO[a.status];
            return (
              <li key={a.id} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/kb/artigos/${a.id}`} className="block truncate font-medium text-brand-darker hover:text-brand-primary">
                    {a.titulo}
                  </Link>
                  <p className="text-xs text-brand-muted">
                    {a.categoriaNome} · {a.autorNome} · atualizado {timeAgo(a.atualizadoEm)}
                  </p>
                </div>
                <Badge tone={s.tone}>{s.label}</Badge>
                <Link
                  href={`/kb/artigos/${a.id}/editar`}
                  aria-label={`Editar ${a.titulo}`}
                  className="rounded-md p-1.5 text-brand-muted hover:bg-slate-100 hover:text-brand-darker"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
