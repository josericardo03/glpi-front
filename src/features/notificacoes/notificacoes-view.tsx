'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCheck, FileCheck2, List, MessageSquare, RefreshCw, Ticket, type LucideIcon } from 'lucide-react';
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, PageHeader, Skeleton, ToggleGroup } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import type { Notificacao, TipoNotificacao } from '@/types';
import { useMarcarLida, useMarcarTodas, useNotificacoes } from './use-notificacoes';

const TIPO: Record<TipoNotificacao, { label: string; icon: LucideIcon }> = {
  CHAMADO: { label: 'Novos Chamados', icon: Ticket },
  ATUALIZACAO: { label: 'Atualizações', icon: RefreshCw },
  APROVACAO: { label: 'Aprovações', icon: FileCheck2 },
  SISTEMA: { label: 'Avisos Sistema', icon: AlertTriangle },
  COMENTARIO: { label: 'Comentários', icon: MessageSquare },
};

type Leitura = 'TODAS' | 'NAO_LIDAS' | 'LIDAS';

function NotificacaoCard({ n, onLer }: { n: Notificacao; onLer: (id: number) => void }) {
  const Icon = TIPO[n.tipo].icon;
  return (
    <Card className={cn('border-l-4 transition-opacity', n.urgente ? 'border-l-status-critica bg-red-50/40' : n.lida ? 'border-l-slate-200 opacity-70' : 'border-l-brand-primary')}>
      <CardBody className="flex gap-4">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md', n.urgente ? 'bg-red-100 text-status-critica' : n.lida ? 'bg-slate-100 text-brand-muted' : 'bg-brand-darker text-white')}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className={cn('font-semibold', n.urgente ? 'text-status-critica' : 'text-brand-darker')}>{n.titulo}</h3>
            <span className="text-[11px] font-semibold uppercase text-brand-muted">{n.urgente ? <Badge tone="danger">Urgente</Badge> : timeAgo(n.criadaEm)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{n.mensagem}</p>
          <div className="mt-3 flex items-center gap-3">
            {n.link && (
              <Link href={n.link} onClick={() => !n.lida && onLer(n.id)} className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-primary hover:bg-blue-100">
                Ver detalhes
              </Link>
            )}
            {!n.lida ? (
              <button onClick={() => onLer(n.id)} className="text-xs font-medium text-brand-muted hover:text-brand-primary">
                Marcar como lida
              </button>
            ) : (
              <span className="text-xs text-brand-muted">Lida</span>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export function NotificacoesView() {
  const { data, isLoading, isError, error, refetch } = useNotificacoes();
  const marcarLida = useMarcarLida();
  const marcarTodas = useMarcarTodas();
  const [tipo, setTipo] = useState<TipoNotificacao | 'TODAS'>('TODAS');
  const [leitura, setLeitura] = useState<Leitura>('TODAS');

  const counts = useMemo(() => {
    const c = {} as Record<TipoNotificacao, number>;
    data?.forEach((n) => (c[n.tipo] = (c[n.tipo] ?? 0) + 1));
    return c;
  }, [data]);

  const lista = (data ?? []).filter(
    (n) => (tipo === 'TODAS' || n.tipo === tipo) && (leitura === 'TODAS' || (leitura === 'LIDAS' ? n.lida : !n.lida)),
  );
  const naoLidas = data?.filter((n) => !n.lida).length ?? 0;
  const { mutate: ler } = marcarLida;

  return (
    <>
      <PageHeader
        title="Central de Notificações"
        description="Gerencie alertas, atualizações e solicitações pendentes."
        actions={
          <Button variant="outline" icon={<CheckCheck className="h-4 w-4" />} onClick={() => marcarTodas.mutate()} loading={marcarTodas.isPending} disabled={!naoLidas}>
            Marcar todas como lidas
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4">
          <Card>
            <CardBody className="p-3">
              <p className="mb-2 px-2 text-sm font-semibold text-brand-darker">Filtrar por Tipo</p>
              <nav className="space-y-0.5">
                {(['TODAS', ...Object.keys(TIPO)] as (TipoNotificacao | 'TODAS')[]).map((t) => {
                  const Icon = t === 'TODAS' ? List : TIPO[t].icon;
                  const active = tipo === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTipo(t)}
                      className={cn('flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm', active ? 'bg-blue-50 font-semibold text-brand-primary' : 'text-brand-darker hover:bg-slate-50')}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{t === 'TODAS' ? 'Todas' : TIPO[t].label}</span>
                      <span className={cn('rounded px-1.5 text-xs', active ? 'bg-brand-primary text-white' : 'text-brand-muted')}>
                        {t === 'TODAS' ? (data?.length ?? 0) : (counts[t] ?? 0)}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </CardBody>
          </Card>
          <Card className="border-brand-dark bg-brand-darker">
            <CardBody>
              <p className="text-sm font-semibold text-white">Resumo</p>
              <p className="mt-1 text-xs text-slate-400">
                {naoLidas} não lida(s) de {data?.length ?? 0} notificações.
              </p>
            </CardBody>
          </Card>
        </aside>

        <section className="space-y-3">
          <ToggleGroup
            value={leitura}
            onChange={setLeitura}
            options={[
              { value: 'TODAS', label: 'Todas' },
              { value: 'NAO_LIDAS', label: `Não lidas (${naoLidas})` },
              { value: 'LIDAS', label: 'Lidas' },
            ]}
          />
          {isError && <ErrorState message={getErrorMessage(error)} onRetry={refetch} />}
          {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          {!isLoading && lista.length === 0 && (
            <Card>
              <EmptyState title="Nenhuma notificação" description="Não há alertas para os filtros selecionados." />
            </Card>
          )}
          {lista.map((n) => (
            <NotificacaoCard key={n.id} n={n} onLer={ler} />
          ))}
        </section>
      </div>
    </>
  );
}
