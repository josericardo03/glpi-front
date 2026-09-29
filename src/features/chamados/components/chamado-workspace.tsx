'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Database,
  History,
  MessageSquare,
  Paperclip,
  PauseCircle,
  Server,
  UserRound,
} from 'lucide-react';
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Field,
  Label,
  Modal,
  PageLoader,
  Progress,
  Select,
  Tabs,
  Textarea,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, formatMinutes } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { StatusChamado } from '@/types';
import { useAtualizarStatus, useChamado, usePausar } from '../hooks/use-chamados';
import { PriorityBadge, slaState, STATUS_OPTIONS, StatusBadge } from './chamado-badges';
import { AtribuirModal } from './atribuir-modal';
import { AnexosTab, FollowupsTab, HistoricoTab, WorklogsTab } from './workspace-tabs';

type Tab = 'followups' | 'anexos' | 'worklogs' | 'historico';

export function ChamadoWorkspace({ id }: { id: number }) {
  const { data: c, isLoading, isError, error, refetch } = useChamado(id);
  const [tab, setTab] = useState<Tab>('followups');
  const [pausaOpen, setPausaOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [reatribuir, setReatribuir] = useState(false);
  const atualizar = useAtualizarStatus();
  const pausar = usePausar(id);

  if (isLoading) return <PageLoader />;
  if (isError || !c) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const finalizado = c.status === 'RESOLVIDO' || c.status === 'CONCLUIDO';
  const sla = slaState(c.slaRestanteMin, c.slaTotalMin);
  const setStatus = (status: StatusChamado) => atualizar.mutate({ id, input: { status } });

  return (
    <>
      <Link href="/chamados" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted hover:text-brand-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar à fila
      </Link>

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-brand-darker md:text-2xl">
              <span className="text-brand-primary">#{c.id}</span> {c.titulo}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-brand-muted">
              <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" /> Solicitante: {c.solicitanteNome}</span>
              <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Aberto em: {formatDateTime(c.abertoEm)}</span>
              <span className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Previsão: {formatDateTime(c.prazoSla)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={c.status} />
              <PriorityBadge prioridade={c.prioridade} />
              <span className="text-xs text-brand-muted">· {c.categoriaNome}</span>
            </div>
          </div>
          {!finalizado && (
            <div className="w-full max-w-xs">
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="font-semibold text-brand-muted">SLA de Resolução</span>
                <span className={cn('font-mono font-bold', c.slaPausado ? 'text-status-pendente' : sla.text)}>
                  {c.slaPausado ? 'Pausado' : `${formatMinutes(c.slaRestanteMin)} ${c.slaRestanteMin < 0 ? 'vencido' : 'restante'}`}
                </span>
              </div>
              <Progress value={c.slaTotalMin - c.slaRestanteMin} max={c.slaTotalMin} tone={c.slaPausado ? 'warning' : sla.tone} size="md" />
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'followups', label: 'Follow-ups', icon: <MessageSquare className="h-4 w-4" />, count: c.comentarios.length },
              { value: 'anexos', label: 'Anexos', icon: <Paperclip className="h-4 w-4" />, count: c.anexos.length },
              { value: 'worklogs', label: 'Worklogs', icon: <Clock className="h-4 w-4" />, count: c.worklogs.length },
              { value: 'historico', label: 'Histórico', icon: <History className="h-4 w-4" /> },
            ]}
          />
          <CardBody>
            <div className="mb-6 rounded-md border border-brand-border bg-slate-50 p-4 text-sm text-slate-700">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Descrição</p>
              {c.descricao}
            </div>
            {tab === 'followups' && <FollowupsTab chamado={c} />}
            {tab === 'anexos' && <AnexosTab chamado={c} />}
            {tab === 'worklogs' && <WorklogsTab chamado={c} />}
            {tab === 'historico' && <HistoricoTab chamado={c} />}
          </CardBody>
        </Card>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Ações Rápidas" />
            <CardBody className="space-y-3">
              <Field label="Alterar Status">
                {(fid) => <Select id={fid} options={STATUS_OPTIONS} value={c.status} onChange={(e) => setStatus(e.target.value as StatusChamado)} disabled={atualizar.isPending} />}
              </Field>
              <Button variant="outline" className="w-full" icon={<PauseCircle className="h-4 w-4" />} disabled={finalizado || c.slaPausado} onClick={() => setPausaOpen(true)}>
                Pendenciar (pausar SLA)
              </Button>
              <Button className="w-full" icon={<CheckCircle2 className="h-4 w-4" />} disabled={finalizado} loading={atualizar.isPending} onClick={() => setStatus('RESOLVIDO')}>
                Resolver Chamado
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Atribuição" />
            <CardBody className="space-y-4">
              <div>
                <Label>Grupo Responsável</Label>
                <div className="flex items-center gap-2 rounded-md border border-brand-border bg-slate-50 px-3 py-2 text-sm font-medium">
                  <Server className="h-4 w-4 text-brand-muted" />
                  {c.grupoNome ?? 'Não definido'}
                </div>
              </div>
              <div>
                <Label>Técnico Atribuído</Label>
                {c.tecnicoNome ? (
                  <div className="flex items-center gap-3">
                    <Avatar name={c.tecnicoNome} size="md" />
                    <p className="text-sm font-semibold text-brand-darker">{c.tecnicoNome}</p>
                  </div>
                ) : (
                  <p className="text-sm italic text-brand-muted">Nenhum técnico atribuído</p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="w-full uppercase tracking-wide" icon={<ArrowLeftRight className="h-4 w-4" />} onClick={() => setReatribuir(true)}>
                Reatribuir Técnico
              </Button>
            </CardBody>
          </Card>

          {!!c.itensConfiguracao?.length && (
            <Card>
              <CardHeader title="Itens de Configuração" />
              <CardBody className="space-y-3">
                {c.itensConfiguracao.map((ic) => (
                  <Link key={ic.id} href={`/ativos/${ic.id}`} className="flex items-start gap-2.5 rounded-md p-1 hover:bg-slate-50">
                    <Database className="mt-0.5 h-4 w-4 text-brand-muted" />
                    <div>
                      <p className="text-sm font-semibold text-brand-darker">{ic.nome}</p>
                      <p className="text-xs text-brand-muted">{ic.detalhe}</p>
                    </div>
                  </Link>
                ))}
              </CardBody>
            </Card>
          )}
        </aside>
      </div>

      <Modal
        open={pausaOpen}
        onClose={() => setPausaOpen(false)}
        title="Pendenciar chamado"
        description="A contagem do SLA ficará pausada até a retomada do atendimento."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPausaOpen(false)}>Cancelar</Button>
            <Button
              disabled={motivo.trim().length < 5}
              loading={pausar.isPending}
              onClick={() => pausar.mutate({ motivo: motivo.trim() }, { onSuccess: () => { setPausaOpen(false); setMotivo(''); } })}
            >
              Pausar SLA
            </Button>
          </>
        }
      >
        <Field label="Motivo da pausa" required hint="Ex.: aguardando retorno do fornecedor / usuário.">
          {(fid) => <Textarea id={fid} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
        </Field>
      </Modal>

      <AtribuirModal
        open={reatribuir}
        modo="tecnico"
        quantidade={1}
        loading={atualizar.isPending}
        onClose={() => setReatribuir(false)}
        onConfirm={(input) => atualizar.mutate({ id, input }, { onSuccess: () => setReatribuir(false) })}
      />
    </>
  );
}
