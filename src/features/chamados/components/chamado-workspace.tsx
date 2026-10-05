'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  Bug,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clock,
  Database,
  GitPullRequestArrow,
  History,
  Link2,
  MessageSquare,
  Paperclip,
  PauseCircle,
  PlayCircle,
  Server,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
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
import { getErrorMessage, httpStatus } from '@/lib/api';
import { formatDateTime, formatMinutes } from '@/lib/format';
import { recursos } from '@/lib/recursos';
import { cn } from '@/lib/utils';
import type { MotivoPausa, StatusChamado, VinculoItil } from '@/types';
import { useAuth } from '@/features/auth/auth-provider';
import { SolicitarAprovacaoModal } from '@/features/aprovacoes/solicitar-aprovacao-modal';
import { MudancaModal } from '@/features/itil/components/mudanca-modal';
import { ProblemaModal } from '@/features/itil/components/problema-modal';
import { statusItil } from '@/features/itil/status';
import { useAtualizarStatus, useChamado, usePausar, useRetomar } from '../hooks/use-chamados';
import { isFinalizado, MOTIVOS_PAUSA, PriorityBadge, slaState, STATUS_OPTIONS, StatusBadge, TRANSICOES } from './chamado-badges';
import { AtribuirModal } from './atribuir-modal';
import { CsatCard } from './csat-card';
import { VincularAtivoModal } from './vincular-ativo-modal';
import { AnexosTab, FollowupsTab, HistoricoTab, WorklogsTab } from './workspace-tabs';

type Tab = 'followups' | 'anexos' | 'worklogs' | 'historico';

export function ChamadoWorkspace({ id }: { id: number }) {
  const { data: c, isLoading, isError, error, refetch } = useChamado(id);
  const [tab, setTab] = useState<Tab>('followups');
  const [pausaOpen, setPausaOpen] = useState(false);
  const [motivo, setMotivo] = useState<MotivoPausa>('AGUARDANDO_SOLICITANTE');
  const [resolverOpen, setResolverOpen] = useState(false);
  const [resolucao, setResolucao] = useState('');
  const [reatribuir, setReatribuir] = useState(false);
  const [aprovacaoOpen, setAprovacaoOpen] = useState(false);
  const [vincularOpen, setVincularOpen] = useState(false);
  const [problemaOpen, setProblemaOpen] = useState(false);
  const [mudancaOpen, setMudancaOpen] = useState(false);
  const atualizar = useAtualizarStatus();
  const pausar = usePausar(id);
  const retomar = useRetomar(id);
  const { hasRole, user } = useAuth();
  const tecnico = hasRole('TECNICO');
  const gestor = hasRole('GESTOR');

  if (isLoading) return <PageLoader />;
  const status = httpStatus(error);
  if (status === 403 || status === 404) {
    return (
      <Card>
        <EmptyState
          icon={<ShieldAlert className="h-10 w-10" />}
          title={status === 403 ? 'Acesso não permitido' : 'Chamado não encontrado'}
          description={
            status === 403
              ? `O chamado #${id} pertence a outro solicitante. Você só pode visualizar os chamados que abriu.`
              : `O chamado #${id} não existe ou foi removido.`
          }
          action={
            <Link href="/chamados" className="text-sm font-semibold text-brand-primary hover:underline">
              Voltar aos meus chamados
            </Link>
          }
        />
      </Card>
    );
  }
  if (isError || !c) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const finalizado = isFinalizado(c.status);
  const dono = user?.id === c.solicitanteId;
  const podeAvaliar = dono && (c.status === 'RESOLVIDO' || c.status === 'CONCLUIDO');
  const pausado = c.status === 'PENDENTE';
  const itens = c.itensConfiguracao ?? [];
  const temSla = c.slaRestanteMin !== null && c.slaTotalMin !== null;
  const sla = temSla ? slaState(c.slaRestanteMin!, c.slaTotalMin!) : null;
  const statusOptions = STATUS_OPTIONS.filter((o) => o.value === c.status || TRANSICOES[c.status].includes(o.value));
  const setStatus = (status: StatusChamado) => {
    if (status === c.status) return;
    if (status === 'PENDENTE') return setPausaOpen(true);
    if (status === 'RESOLVIDO') return setResolverOpen(true);
    if (pausado && status === 'EM_ATENDIMENTO') return retomar.mutate();
    atualizar.mutate({ id, input: { status } });
  };

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
              {c.prazoResposta && (
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Primeira resposta até: {formatDateTime(c.prazoResposta)}</span>
              )}
              <span className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Solução até: {formatDateTime(c.prazoSla)}</span>
              {c.slaVencido && !finalizado && (
                <span className="flex items-center gap-1.5 font-semibold text-status-critica"><AlertTriangle className="h-3.5 w-3.5" /> SLA vencido</span>
              )}
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
                <span className={cn('font-mono font-bold', c.slaPausado ? 'text-status-pendente' : (sla?.text ?? 'text-brand-muted'))}>
                  {c.slaPausado
                    ? 'Pausado'
                    : temSla
                      ? c.slaRestanteMin! < 0
                        ? `vencido há ${formatMinutes(-c.slaRestanteMin!)}`
                        : `${formatMinutes(c.slaRestanteMin!)} restante`
                      : 'Sem SLA definido'}
                </span>
              </div>
              {temSla && (
                <Progress
                  value={c.slaTotalMin! - c.slaRestanteMin!}
                  max={c.slaTotalMin!}
                  tone={c.slaPausado ? 'warning' : sla!.tone}
                  size="md"
                  label="Consumo do SLA de resolução"
                />
              )}
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
              ...(tecnico
                ? [{ value: 'worklogs' as const, label: 'Worklogs', icon: <Clock className="h-4 w-4" />, count: c.worklogs.length }]
                : []),
              { value: 'historico', label: 'Histórico', icon: <History className="h-4 w-4" />, count: c.historico.length },
            ]}
            aria-label="Seções do chamado"
          />
          <CardBody>
            <div className="mb-6 rounded-md border border-brand-border bg-slate-50 p-4 text-sm text-slate-700">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Descrição</p>
              {c.descricao}
            </div>
            {tab === 'followups' && <FollowupsTab chamado={c} />}
            {tab === 'anexos' && <AnexosTab chamado={c} />}
            {tab === 'worklogs' && tecnico && <WorklogsTab chamado={c} />}
            {tab === 'historico' && <HistoricoTab chamado={c} />}
          </CardBody>
        </Card>

        <aside className="space-y-6">
          {(podeAvaliar || c.csat.avaliado) && <CsatCard chamadoId={id} csat={c.csat} podeAvaliar={podeAvaliar} />}

          {tecnico && (
          <Card>
            <CardHeader title="Ações Rápidas" />
            <CardBody className="space-y-3">
              <Field label="Alterar Status">
                {(fid) => <Select id={fid} options={statusOptions} value={c.status} onChange={(e) => setStatus(e.target.value as StatusChamado)} disabled={atualizar.isPending || retomar.isPending || !TRANSICOES[c.status].length} />}
              </Field>
              {pausado ? (
                <Button variant="outline" className="w-full" icon={<PlayCircle className="h-4 w-4" />} loading={retomar.isPending} onClick={() => retomar.mutate()}>
                  Retomar atendimento
                </Button>
              ) : (
                <Button variant="outline" className="w-full" icon={<PauseCircle className="h-4 w-4" />} disabled={!TRANSICOES[c.status].includes('PENDENTE')} onClick={() => setPausaOpen(true)}>
                  Pendenciar (pausar SLA)
                </Button>
              )}
              <Button className="w-full" icon={<CheckCircle2 className="h-4 w-4" />} disabled={!TRANSICOES[c.status].includes('RESOLVIDO')} loading={atualizar.isPending} onClick={() => setResolverOpen(true)}>
                Resolver Chamado
              </Button>
              <Button variant="ghost" className="w-full" icon={<CheckSquare className="h-4 w-4" />} disabled={finalizado} onClick={() => setAprovacaoOpen(true)}>
                Solicitar Aprovação
              </Button>
              {gestor && (
                <div className="grid grid-cols-2 gap-2 border-t border-brand-border pt-3">
                  <Button variant="ghost" size="sm" icon={<Bug className="h-4 w-4" />} onClick={() => setProblemaOpen(true)}>
                    Problema
                  </Button>
                  <Button variant="ghost" size="sm" icon={<GitPullRequestArrow className="h-4 w-4" />} onClick={() => setMudancaOpen(true)}>
                    Mudança
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
          )}

          {!tecnico && dono && !finalizado && (
            <Card>
              <CardHeader title="Precisa de uma aprovação?" description="Peça a um gestor que autorize este atendimento (compra, acesso, mudança)." />
              <CardBody>
                <Button variant="outline" className="w-full" icon={<CheckSquare className="h-4 w-4" />} onClick={() => setAprovacaoOpen(true)}>
                  Solicitar Aprovação
                </Button>
                <Link href="/aprovacoes" className="mt-2 block text-center text-xs font-medium text-brand-primary hover:underline">
                  Acompanhar minhas solicitações
                </Link>
              </CardBody>
            </Card>
          )}

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
              {tecnico && recursos.atribuicaoChamado && (
                <Button variant="ghost" size="sm" className="w-full uppercase tracking-wide" icon={<ArrowLeftRight className="h-4 w-4" />} onClick={() => setReatribuir(true)}>
                  Reatribuir Técnico
                </Button>
              )}
            </CardBody>
          </Card>

          {(!!itens.length || tecnico) && (
            <Card>
              <CardHeader
                title="Itens de Configuração"
                actions={
                  tecnico && !finalizado ? (
                    <Button variant="ghost" size="sm" icon={<Link2 className="h-4 w-4" />} onClick={() => setVincularOpen(true)}>
                      Vincular
                    </Button>
                  ) : undefined
                }
              />
              <CardBody className="space-y-3">
                {!itens.length && <p className="text-xs text-brand-muted">Nenhum ativo vinculado a este chamado.</p>}
                {itens.map((ic) => (
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

          {(!!c.problemas.length || !!c.mudancas.length) && (
            <Card>
              <CardHeader title="Problemas e Mudanças" />
              <CardBody className="space-y-3">
                {c.problemas.map((p) => (
                  <VinculoItilItem key={`p${p.id}`} href={tecnico ? `/problemas?id=${p.id}` : undefined} icon={<Bug className="mt-0.5 h-4 w-4 text-brand-muted" />} rotulo={`Problema #${p.id}`} vinculo={p} />
                ))}
                {c.mudancas.map((m) => (
                  <VinculoItilItem key={`m${m.id}`} href={tecnico ? `/mudancas?id=${m.id}` : undefined} icon={<GitPullRequestArrow className="mt-0.5 h-4 w-4 text-brand-muted" />} rotulo={`Mudança #${m.id}`} vinculo={m} />
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
            <Button loading={pausar.isPending} onClick={() => pausar.mutate({ motivo }, { onSuccess: () => setPausaOpen(false) })}>
              Pausar SLA
            </Button>
          </>
        }
      >
        <Field label="Motivo da pausa" required>
          {(fid) => <Select id={fid} options={MOTIVOS_PAUSA} value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoPausa)} />}
        </Field>
      </Modal>

      <Modal
        open={resolverOpen}
        onClose={() => setResolverOpen(false)}
        title="Resolver chamado"
        description="Descreva a solução aplicada. O solicitante poderá concluir o chamado em seguida."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResolverOpen(false)}>Cancelar</Button>
            <Button
              disabled={resolucao.trim().length < 5}
              loading={atualizar.isPending}
              onClick={() =>
                atualizar.mutate(
                  { id, input: { status: 'RESOLVIDO', resolucao: resolucao.trim() } },
                  { onSuccess: () => { setResolverOpen(false); setResolucao(''); } },
                )
              }
            >
              Resolver
            </Button>
          </>
        }
      >
        <Field label="Resolução" required hint="Mínimo de 5 caracteres.">
          {(fid) => <Textarea id={fid} value={resolucao} onChange={(e) => setResolucao(e.target.value)} />}
        </Field>
      </Modal>

      {(tecnico || dono) && <SolicitarAprovacaoModal open={aprovacaoOpen} onClose={() => setAprovacaoOpen(false)} chamadoId={id} />}
      {tecnico && <VincularAtivoModal chamadoId={id} open={vincularOpen} onClose={() => setVincularOpen(false)} vinculados={itens.map((ic) => ic.id)} />}
      {gestor && (
        <>
          <ProblemaModal open={problemaOpen} onClose={() => setProblemaOpen(false)} chamado={{ id, titulo: c.titulo, descricao: c.descricao }} />
          <MudancaModal open={mudancaOpen} onClose={() => setMudancaOpen(false)} chamado={{ id, titulo: c.titulo }} />
        </>
      )}

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

function VinculoItilItem({ href, icon, rotulo, vinculo }: { href?: string; icon: ReactNode; rotulo: string; vinculo: VinculoItil }) {
  const s = statusItil(vinculo.status);
  const conteudo = (
    <>
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">{rotulo}</p>
        <p className="truncate text-sm font-semibold text-brand-darker" title={vinculo.titulo}>{vinculo.titulo}</p>
        <Badge tone={s.tone} className="mt-1">{s.label}</Badge>
      </div>
    </>
  );
  return href ? (
    <Link href={href} className="flex items-start gap-2.5 rounded-md p-1 hover:bg-slate-50">{conteudo}</Link>
  ) : (
    <div className="flex items-start gap-2.5 p-1">{conteudo}</div>
  );
}
