'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, CheckSquare, Flame, GitPullRequestArrow, Plus, Ticket, X } from 'lucide-react';
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, Field, Modal, PageHeader, Skeleton, StatCard, Tabs, Textarea, type BadgeTone } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PriorityBadge } from '@/features/chamados/components/chamado-badges';
import type { Aprovacao, DecisaoInput, FiltroStatusAprovacao, StatusAprovacao } from '@/types';
import { useAuth } from '@/features/auth/auth-provider';
import { SolicitarAprovacaoModal } from './solicitar-aprovacao-modal';
import { useAprovacoes, useDecidirAprovacao } from './use-aprovacoes';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const RISCO = { BAIXO: { label: 'Risco baixo', tone: 'success' }, MEDIO: { label: 'Risco médio', tone: 'pendente' }, ALTO: { label: 'Risco alto', tone: 'danger' } } as const;
const JUSTIFICATIVA_MIN_REJEICAO = 10;
const JUSTIFICATIVA_MIN = 3;

type Filtro = 'TODAS' | Aprovacao['origem'];

const STATUS_FILTROS: { value: FiltroStatusAprovacao; label: string }[] = [
  { value: 'PENDENTE', label: 'Pendentes' },
  { value: 'APROVADO', label: 'Aprovadas' },
  { value: 'REJEITADO', label: 'Rejeitadas' },
  { value: 'CANCELADO', label: 'Canceladas' },
  { value: 'TODOS', label: 'Todas' },
];

const STATUS_META: Record<StatusAprovacao, { label: string; tone: BadgeTone; borda: string }> = {
  PENDENTE: { label: 'Aguardando decisão', tone: 'pendente', borda: 'border-l-brand-primary' },
  APROVADA: { label: 'Aprovada', tone: 'success', borda: 'border-l-emerald-500' },
  REJEITADA: { label: 'Rejeitada', tone: 'danger', borda: 'border-l-red-500' },
  CANCELADA: { label: 'Cancelada', tone: 'neutral', borda: 'border-l-slate-300' },
};

export function AprovacoesView() {
  const [status, setStatus] = useState<FiltroStatusAprovacao>('PENDENTE');
  const { data: atual, isLoading: carregando, isPlaceholderData, isError, error, refetch } = useAprovacoes(status);
  const isLoading = carregando || isPlaceholderData;
  const data = isPlaceholderData ? undefined : atual;
  const pendentes = useAprovacoes('PENDENTE');
  const [filtro, setFiltro] = useState<Filtro>('TODAS');
  const [decisao, setDecisao] = useState<{ item: Aprovacao; tipo: DecisaoInput['decisao'] } | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [solicitarOpen, setSolicitarOpen] = useState(false);
  const podeDecidir = useAuth().hasRole('GESTOR');

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
      <PageHeader
        title={podeDecidir ? 'Central de Aprovações' : 'Minhas Solicitações de Aprovação'}
        description={
          podeDecidir
            ? 'Aprovação de requisições e mudanças pelo gestor ou CAB (Change Advisory Board).'
            : 'Acompanhe os pedidos que você enviou e o resultado das decisões. Você também é avisado nas notificações.'
        }
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setSolicitarOpen(true)}>
            Nova Solicitação
          </Button>
        }
      />
      <SolicitarAprovacaoModal open={solicitarOpen} onClose={() => setSolicitarOpen(false)} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pendentes" value={pendentes.data?.length} icon={<CheckSquare className="h-5 w-5" />} tone="primary" loading={pendentes.isLoading} />
        <StatCard label="Requisições (filtro)" value={data && count('CHAMADO')} icon={<Ticket className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Mudanças (filtro)" value={data && count('MUDANCA')} icon={<GitPullRequestArrow className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Prioridade Alta/Crítica" value={urgentes} icon={<Flame className="h-5 w-5" />} tone={urgentes ? 'danger' : undefined} loading={isLoading} />
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Card className="min-w-0 max-w-full">
          <Tabs variant="pills" aria-label="Filtrar aprovações por status" value={status} onChange={setStatus} items={STATUS_FILTROS} />
        </Card>
        <Card className="min-w-0 max-w-full">
          <Tabs
            variant="pills"
            aria-label="Filtrar aprovações por origem"
            value={filtro}
            onChange={setFiltro}
            items={[
              { value: 'TODAS', label: 'Todas as origens', count: data?.length },
              { value: 'CHAMADO', label: 'Requisições', count: data && count('CHAMADO') },
              { value: 'MUDANCA', label: 'Mudanças', count: data && count('MUDANCA') },
            ]}
          />
        </Card>
      </div>

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : (
        <div className="space-y-3">
          {isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          {!isLoading && lista.length === 0 && (
            <Card>
              <EmptyState
                icon={<CheckSquare className="h-10 w-10" />}
                title={data?.length || status !== 'PENDENTE' ? 'Nenhuma aprovação neste filtro' : 'Nenhuma aprovação pendente'}
                description={
                  data?.length
                    ? 'Selecione outra origem para ver as demais solicitações.'
                    : status !== 'PENDENTE'
                      ? 'Selecione outro status para ver as demais solicitações.'
                      : podeDecidir
                        ? 'Você está em dia com as solicitações.'
                        : 'Você não tem pedidos aguardando decisão. Use "Nova Solicitação" ou o botão no próprio chamado.'
                }
              />
            </Card>
          )}
          {lista.map((a) => (
            <Card key={a.id} className={cn('border-l-4', STATUS_META[a.status].borda)}>
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
                    {a.aprovadorNome && (
                      <>
                        {' '}
                        · Aprovador: <strong className="text-brand-darker">{a.aprovadorNome}</strong>
                      </>
                    )}
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
                  {a.status !== 'PENDENTE' && (a.decididoEm || a.justificativaAprovador) && (
                    <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      {a.decididoEm && (
                        <p className="font-semibold text-brand-darker" title={formatDateTime(a.decididoEm)}>
                          {STATUS_META[a.status].label} {timeAgo(a.decididoEm)}
                          {a.aprovadorNome && <> por {a.aprovadorNome}</>}
                        </p>
                      )}
                      {a.justificativaAprovador && <p className="mt-0.5 italic">“{a.justificativaAprovador}”</p>}
                    </div>
                  )}
                </div>
                {a.status !== 'PENDENTE' ? (
                  <Badge tone={STATUS_META[a.status].tone} dot>
                    {STATUS_META[a.status].label}
                  </Badge>
                ) : podeDecidir ? (
                  <div className="flex gap-2">
                    <Button variant="danger-outline" icon={<X className="h-4 w-4" />} onClick={() => setDecisao({ item: a, tipo: 'REJEITADA' })} aria-label={`Rejeitar solicitação ${a.id}`}>
                      Rejeitar
                    </Button>
                    <Button icon={<Check className="h-4 w-4" />} onClick={() => setDecisao({ item: a, tipo: 'APROVADA' })} aria-label={`Aprovar solicitação ${a.id}`}>
                      Aprovar
                    </Button>
                  </div>
                ) : (
                  <Badge tone="pendente" dot>
                    Aguardando decisão
                  </Badge>
                )}
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
