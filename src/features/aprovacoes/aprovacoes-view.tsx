'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, CheckSquare, Flame, GitPullRequestArrow, Ticket, X } from 'lucide-react';
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, Field, Modal, PageHeader, Skeleton, StatCard, Tabs, Textarea } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { PriorityBadge } from '@/features/chamados/components/chamado-badges';
import type { Aprovacao, DecisaoInput } from '@/types';
import { useAprovacoesPendentes, useDecidirAprovacao } from './use-aprovacoes';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const RISCO = { BAIXO: { label: 'Risco baixo', tone: 'success' }, MEDIO: { label: 'Risco médio', tone: 'pendente' }, ALTO: { label: 'Risco alto', tone: 'danger' } } as const;
const JUSTIFICATIVA_MIN_REJEICAO = 10;
const JUSTIFICATIVA_MIN = 3;

type Filtro = 'TODAS' | Aprovacao['origem'];

export function AprovacoesView() {
  const { data, isLoading, isError, error, refetch } = useAprovacoesPendentes();
  const [filtro, setFiltro] = useState<Filtro>('TODAS');
  const [decisao, setDecisao] = useState<{ item: Aprovacao; tipo: DecisaoInput['decisao'] } | null>(null);
  const [justificativa, setJustificativa] = useState('');

  function fechar() {
    setDecisao(null);
    setJustificativa('');
  }

  const decidir = useDecidirAprovacao(fechar);

  const lista = (data ?? []).filter((a) => filtro === 'TODAS' || a.origem === filtro);
  const count = (o: Aprovacao['origem']) => data?.filter((a) => a.origem === o).length ?? 0;
  const urgentes = data?.filter((a) => a.prioridade === 'CRITICA' || a.prioridade === 'ALTA').length;

  const rejeitando = decisao?.tipo === 'REJEITADA';
  const texto = justificativa.trim();
  const erroJustificativa = rejeitando
    ? texto.length < JUSTIFICATIVA_MIN_REJEICAO
      ? `Informe ao menos ${JUSTIFICATIVA_MIN_REJEICAO} caracteres.`
      : undefined
    : texto && texto.length < JUSTIFICATIVA_MIN
      ? `Informe ao menos ${JUSTIFICATIVA_MIN} caracteres ou deixe em branco.`
      : undefined;

  function confirmar() {
    if (!decisao || erroJustificativa) return;
    decidir.mutate({ id: decisao.item.id, input: { decisao: decisao.tipo, justificativa: texto || undefined } });
  }

  return (
    <>
      <PageHeader title="Central de Aprovações" description="Aprovação de requisições e mudanças pelo gestor ou CAB (Change Advisory Board)." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pendentes" value={data?.length} icon={<CheckSquare className="h-5 w-5" />} tone="primary" loading={isLoading} />
        <StatCard label="Requisições" value={data && count('CHAMADO')} icon={<Ticket className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Mudanças (CAB)" value={data && count('MUDANCA')} icon={<GitPullRequestArrow className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Prioridade Alta/Crítica" value={urgentes} icon={<Flame className="h-5 w-5" />} tone={urgentes ? 'danger' : undefined} loading={isLoading} />
      </div>

      <Card className="mb-4 inline-block">
        <Tabs
          variant="pills"
          aria-label="Filtrar aprovações por origem"
          value={filtro}
          onChange={setFiltro}
          items={[
            { value: 'TODAS', label: 'Todas', count: data?.length },
            { value: 'CHAMADO', label: 'Requisições', count: data && count('CHAMADO') },
            { value: 'MUDANCA', label: 'Mudanças', count: data && count('MUDANCA') },
          ]}
        />
      </Card>

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : (
        <div className="space-y-3">
          {isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          {!isLoading && lista.length === 0 && (
            <Card>
              <EmptyState
                icon={<CheckSquare className="h-10 w-10" />}
                title={data?.length ? 'Nenhuma aprovação neste filtro' : 'Nenhuma aprovação pendente'}
                description={data?.length ? 'Selecione outra origem para ver as demais solicitações.' : 'Você está em dia com as solicitações.'}
              />
            </Card>
          )}
          {lista.map((a) => (
            <Card key={a.id} className="border-l-4 border-l-brand-primary">
              <CardBody className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={a.origem === 'MUDANCA' ? 'atendimento' : 'primary'}>{a.origem === 'MUDANCA' ? `Mudança #${a.mudancaId}` : `Chamado #${a.chamadoId}`}</Badge>
                    <PriorityBadge prioridade={a.prioridade} />
                    {a.risco && <Badge tone={RISCO[a.risco].tone}>{RISCO[a.risco].label}</Badge>}
                    <span className="text-xs text-brand-muted">· {timeAgo(a.solicitadoEm)}</span>
                  </div>
                  <h2 className="mt-2 font-semibold text-brand-darker">
                    #{a.id} · {a.titulo}
                  </h2>
                  {a.descricao && <p className="mt-0.5 text-sm text-brand-muted">{a.descricao}</p>}
                  <p className="mt-2 text-xs text-brand-muted">
                    Solicitante: <strong className="text-brand-darker">{a.solicitanteNome}</strong>
                    {a.custoEstimado !== null && (
                      <>
                        {' '}
                        · Custo estimado: <strong className="text-brand-darker">{brl.format(a.custoEstimado)}</strong>
                      </>
                    )}
                    {a.chamadoId && (
                      <>
                        {' '}
                        ·{' '}
                        <Link href={`/chamados/${a.chamadoId}`} className="font-semibold text-brand-primary hover:underline">
                          ver chamado
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="danger-outline" icon={<X className="h-4 w-4" />} onClick={() => setDecisao({ item: a, tipo: 'REJEITADA' })} aria-label={`Rejeitar solicitação ${a.id}`}>
                    Rejeitar
                  </Button>
                  <Button icon={<Check className="h-4 w-4" />} onClick={() => setDecisao({ item: a, tipo: 'APROVADA' })} aria-label={`Aprovar solicitação ${a.id}`}>
                    Aprovar
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!decisao}
        onClose={fechar}
        title={decisao?.tipo === 'APROVADA' ? 'Confirmar aprovação' : 'Rejeitar solicitação'}
        description={decisao && `#${decisao.item.id} · ${decisao.item.titulo}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={fechar}>
              Cancelar
            </Button>
            <Button variant={rejeitando ? 'danger' : 'primary'} loading={decidir.isPending} disabled={!!erroJustificativa} onClick={confirmar}>
              {decisao?.tipo === 'APROVADA' ? 'Aprovar' : 'Rejeitar'}
            </Button>
          </>
        }
      >
        <Field
          label="Justificativa"
          required={rejeitando}
          error={texto || !rejeitando ? erroJustificativa : undefined}
          hint={rejeitando ? `Obrigatória. Mínimo de ${JUSTIFICATIVA_MIN_REJEICAO} caracteres.` : 'Opcional.'}
        >
          {(id) => <Textarea id={id} maxLength={1000} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />}
        </Field>
      </Modal>
    </>
  );
}
