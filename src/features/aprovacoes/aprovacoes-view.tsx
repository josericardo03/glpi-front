'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, CheckSquare, GitPullRequestArrow, ShieldAlert, Ticket, X } from 'lucide-react';
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, Field, Modal, PageHeader, Skeleton, StatCard, Textarea, Tabs } from '@/components/ui';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { getErrorMessage } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { PriorityBadge } from '@/features/chamados/components/chamado-badges';
import type { Aprovacao, DecisaoInput } from '@/types';
import { aprovacoesService } from './aprovacoes.service';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const RISCO_TONE = { BAIXO: 'success', MEDIO: 'pendente', ALTO: 'danger' } as const;
const KEY = ['aprovacoes', 'pendentes'];

export function AprovacoesView() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: KEY, queryFn: aprovacoesService.pendentes });
  const [filtro, setFiltro] = useState<'TODAS' | 'CHAMADO' | 'MUDANCA'>('TODAS');
  const [decisao, setDecisao] = useState<{ item: Aprovacao; tipo: DecisaoInput['decisao'] } | null>(null);
  const [justificativa, setJustificativa] = useState('');

  const decidir = useApiMutation({
    mutationFn: ({ id, input }: { id: number; input: DecisaoInput }) => aprovacoesService.decidir(id, input),
    invalidate: [KEY],
    successMessage: (a) => `Solicitação #${a.id} ${a.status === 'APROVADA' ? 'aprovada' : 'rejeitada'}.`,
    onSuccess: () => {
      setDecisao(null);
      setJustificativa('');
    },
  });

  const lista = (data ?? []).filter((a) => filtro === 'TODAS' || a.origem === filtro);
  const count = (o: Aprovacao['origem']) => data?.filter((a) => a.origem === o).length ?? 0;
  const precisaJustificativa = decisao?.tipo === 'REJEITADA';

  return (
    <>
      <PageHeader title="Central de Aprovações" description="Aprovação de requisições e mudanças pelo gestor ou CAB (Change Advisory Board)." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pendentes" value={data?.length} icon={<CheckSquare className="h-5 w-5" />} tone="primary" loading={isLoading} />
        <StatCard label="Requisições" value={count('CHAMADO')} icon={<Ticket className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Mudanças (CAB)" value={count('MUDANCA')} icon={<GitPullRequestArrow className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Alto Risco" value={data?.filter((a) => a.risco === 'ALTO').length} icon={<ShieldAlert className="h-5 w-5" />} tone="danger" loading={isLoading} />
      </div>

      <Card className="mb-4 inline-block">
        <Tabs
          variant="pills"
          value={filtro}
          onChange={setFiltro}
          items={[
            { value: 'TODAS', label: 'Todas', count: data?.length },
            { value: 'CHAMADO', label: 'Requisições', count: count('CHAMADO') },
            { value: 'MUDANCA', label: 'Mudanças', count: count('MUDANCA') },
          ]}
        />
      </Card>

      {isError && <ErrorState message={getErrorMessage(error)} onRetry={refetch} />}

      <div className="space-y-3">
        {isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        {!isLoading && lista.length === 0 && (
          <Card>
            <EmptyState icon={<CheckSquare className="h-10 w-10" />} title="Nenhuma aprovação pendente" description="Você está em dia com as solicitações." />
          </Card>
        )}
        {lista.map((a) => (
          <Card key={a.id} className="border-l-4 border-l-brand-primary">
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={a.origem === 'MUDANCA' ? 'atendimento' : 'primary'}>{a.origem === 'MUDANCA' ? `Mudança #${a.mudancaId}` : `Chamado #${a.chamadoId}`}</Badge>
                  <PriorityBadge prioridade={a.prioridade} />
                  <Badge tone={RISCO_TONE[a.risco]}>Risco {a.risco.toLowerCase()}</Badge>
                  <span className="text-xs text-brand-muted">· {timeAgo(a.solicitadoEm)}</span>
                </div>
                <h3 className="mt-2 font-semibold text-brand-darker">
                  #{a.id} · {a.titulo}
                </h3>
                <p className="mt-0.5 text-sm text-brand-muted">{a.descricao}</p>
                <p className="mt-2 text-xs text-brand-muted">
                  Solicitante: <strong className="text-brand-darker">{a.solicitanteNome}</strong>
                  {a.custoEstimado !== null && (
                    <>
                      {' '}· Custo estimado: <strong className="text-brand-darker">{brl.format(a.custoEstimado)}</strong>
                    </>
                  )}
                  {a.chamadoId && (
                    <>
                      {' '}·{' '}
                      <Link href={`/chamados/${a.chamadoId}`} className="font-semibold text-brand-primary hover:underline">
                        ver chamado
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="danger-outline" icon={<X className="h-4 w-4" />} onClick={() => setDecisao({ item: a, tipo: 'REJEITADA' })}>
                  Rejeitar
                </Button>
                <Button icon={<Check className="h-4 w-4" />} onClick={() => setDecisao({ item: a, tipo: 'APROVADA' })}>
                  Aprovar
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal
        open={!!decisao}
        onClose={() => setDecisao(null)}
        title={decisao?.tipo === 'APROVADA' ? 'Confirmar aprovação' : 'Rejeitar solicitação'}
        description={decisao && `#${decisao.item.id} · ${decisao.item.titulo}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDecisao(null)}>Cancelar</Button>
            <Button
              variant={precisaJustificativa ? 'danger' : 'primary'}
              loading={decidir.isPending}
              disabled={precisaJustificativa && justificativa.trim().length < 10}
              onClick={() => decisao && decidir.mutate({ id: decisao.item.id, input: { decisao: decisao.tipo, justificativa: justificativa.trim() } })}
            >
              {decisao?.tipo === 'APROVADA' ? 'Aprovar' : 'Rejeitar'}
            </Button>
          </>
        }
      >
        <Field label="Justificativa" required={precisaJustificativa} hint={precisaJustificativa ? 'Mínimo de 10 caracteres.' : 'Opcional.'}>
          {(id) => <Textarea id={id} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />}
        </Field>
      </Modal>
    </>
  );
}
