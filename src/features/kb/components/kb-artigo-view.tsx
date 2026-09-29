'use client';

import Link from 'next/link';
import { CalendarDays, Clock, Eye, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Avatar, Badge, Button, buttonVariants, Card, CardBody, CardHeader, ErrorState, Markdown, PageLoader } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { formatDate, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useKbArtigo, useKbArtigos, useKbFeedback } from '../use-kb';

export function KbArtigoView({ id }: { id: number }) {
  const { data: a, isLoading, isError, error, refetch } = useKbArtigo(id);
  const relacionados = useKbArtigos({ categoriaId: a?.categoriaId, limit: 4 });
  const feedback = useKbFeedback(id);

  if (isLoading) return <PageLoader />;
  if (isError || !a) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const votou = !!a.meuVoto;

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-brand-muted">
        <Link href="/kb" className="hover:text-brand-primary">Base de Conhecimento</Link>
        <span>›</span>
        <span>{a.categoriaNome}</span>
        <span>›</span>
        <span className="truncate font-semibold text-brand-darker">{a.titulo}</span>
      </nav>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardBody className="p-6 md:p-10">
            <div className="flex flex-wrap items-center gap-3 text-xs text-brand-muted">
              <Badge tone="dark">{a.categoriaNome}</Badge>
              <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Atualizado em {formatDate(a.atualizadoEm)}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {a.tempoLeituraMin} min de leitura</span>
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {formatNumber(a.visualizacoes)}</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-brand-darker md:text-4xl">{a.titulo}</h1>
            <Markdown content={a.conteudoMarkdown} className="mt-6 border-t border-brand-border pt-2" />

            <div className="mt-10 border-t border-brand-border pt-6 text-center">
              <p className="text-sm font-medium text-brand-darker">Este artigo foi útil?</p>
              <div className="mt-3 flex justify-center gap-3">
                <Button
                  variant={a.meuVoto === 'UTIL' ? 'primary' : 'outline'}
                  icon={<ThumbsUp className="h-4 w-4" />}
                  disabled={votou}
                  loading={feedback.isPending && feedback.variables === true}
                  onClick={() => feedback.mutate(true)}
                >
                  Sim, ajudou ({a.votosUteis})
                </Button>
                <Button
                  variant={a.meuVoto === 'NAO_UTIL' ? 'danger' : 'outline'}
                  icon={<ThumbsDown className="h-4 w-4" />}
                  disabled={votou}
                  loading={feedback.isPending && feedback.variables === false}
                  onClick={() => feedback.mutate(false)}
                >
                  Não muito ({a.votosNaoUteis})
                </Button>
              </div>
              {votou && <p className="mt-2 text-xs text-brand-muted">Seu voto foi registrado. Cada usuário pode votar uma única vez.</p>}
            </div>
          </CardBody>
        </Card>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Artigos Relacionados" />
            <CardBody className="space-y-4">
              {relacionados.data
                ?.filter((r) => r.id !== a.id)
                .map((r) => (
                  <Link key={r.id} href={`/kb/artigos/${r.id}`} className="block group">
                    <p className="text-sm font-semibold text-brand-darker group-hover:text-brand-primary">{r.titulo}</p>
                    <p className="text-xs text-brand-muted">Tempo de leitura: {r.tempoLeituraMin} min</p>
                  </Link>
                ))}
            </CardBody>
          </Card>
          <Card className="border-brand-dark bg-brand-darker">
            <CardBody>
              <p className="font-semibold text-white">Ainda precisa de ajuda?</p>
              <p className="mt-1 text-xs text-slate-400">Se as instruções não funcionarem, nossos técnicos estão prontos para ajudar.</p>
              <Link href="/chamados/novo" className={cn(buttonVariants({ className: 'mt-4 w-full' }))}>Abrir um Ticket</Link>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Autor" />
            <CardBody className="flex items-center gap-3">
              <Avatar name={a.autorNome} size="md" />
              <div>
                <p className="text-sm font-semibold text-brand-darker">{a.autorNome}</p>
                <p className="text-xs text-brand-muted">{a.autorCargo}</p>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
