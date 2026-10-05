'use client';

import { useState } from 'react';
import { BellRing, CalendarDays, CalendarPlus, Clock, Plus, RotateCcw, Save, ShieldCheck, Timer } from 'lucide-react';
import { Badge, Button, Callout, Card, CardBody, CardHeader, ErrorState, Field, Input, PageHeader, Select, Skeleton, Switch, Tabs } from '@/components/ui';
import { PRIORIDADE_META } from '@/features/chamados/components/chamado-badges';
import { getErrorMessage } from '@/lib/api';
import { formatMinutes } from '@/lib/format';
import { recursos } from '@/lib/recursos';
import { cn } from '@/lib/utils';
import type { PoliticaSla } from '@/types';
import { useFeriados, useHorarios, usePoliticasSla, useSalvarSla } from '../use-admin';
import { DurationInput } from './duration-input';
import { nomeHorario, PoliticaModal } from './politica-modal';
import { FeriadoModal, FeriadosTab, HorarioModal, HorariosTab } from './sla-calendarios';

const PRIO_BORDER: Record<PoliticaSla['prioridade'], string> = {
  CRITICA: 'border-l-prio-critica',
  ALTA: 'border-l-prio-alta',
  MEDIA: 'border-l-prio-media',
  BAIXA: 'border-l-prio-baixa',
};

type Aba = 'politicas' | 'horarios' | 'feriados';

const CAMPOS_EDITAVEIS = ['nome', 'tempoRespostaMin', 'tempoSolucaoMin', 'horarioComercialId', 'ativa', 'notificarGestor', 'alertaPercentual'] as const;
const alterada = (p: PoliticaSla, original?: PoliticaSla) => !original || CAMPOS_EDITAVEIS.some((k) => p[k] !== original[k]);

export function SlaView() {
  const politicasQ = usePoliticasSla();
  const [aba, setAba] = useState<Aba>('politicas');
  const horariosQ = useHorarios();
  const feriadosQ = useFeriados();
  const salvar = useSalvarSla();
  const [draft, setDraft] = useState<PoliticaSla[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modal, setModal] = useState<Aba | null>(null);

  const originais = politicasQ.data ?? [];
  const politicas = draft ?? originais;
  const horarios = horariosQ.data ?? [];
  const selected = politicas.find((p) => p.id === selectedId) ?? politicas[0];
  const alteradas = draft ? draft.filter((p) => alterada(p, originais.find((o) => o.id === p.id))) : [];
  const horarioDe = (p: PoliticaSla) => horarios.find((h) => h.id === p.horarioComercialId);
  const erroDe = (p: PoliticaSla) =>
    !p.nome.trim()
      ? 'Informe o nome da política.'
      : p.tempoSolucaoMin < 1
        ? 'O tempo de solução deve ser de pelo menos 1 minuto.'
        : p.tempoRespostaMin >= p.tempoSolucaoMin
          ? 'Deve ser menor que o tempo de solução.'
          : undefined;

  function update(patch: Partial<PoliticaSla>) {
    if (!selected) return;
    setDraft(politicas.map((p) => (p.id === selected.id ? { ...p, ...patch } : p)));
  }

  if (politicasQ.isError) return <ErrorState message={getErrorMessage(politicasQ.error)} onRetry={politicasQ.refetch} />;

  const acaoPrincipal = {
    politicas: { label: 'Nova Política', icon: <Plus className="h-4 w-4" /> },
    horarios: { label: 'Novo Horário', icon: <Clock className="h-4 w-4" /> },
    feriados: { label: 'Novo Feriado', icon: <CalendarPlus className="h-4 w-4" /> },
  }[aba];

  return (
    <>
      <PageHeader
        title="Configuração de SLA"
        description="Metas de resposta e solução por prioridade, expediente de atendimento e feriados que pausam o relógio."
        breadcrumbs={[{ label: 'Administração' }, { label: 'Políticas de SLA' }]}
        actions={
          <>
            {aba === 'politicas' && (
              <>
                <Button variant="outline" icon={<RotateCcw className="h-4 w-4" />} disabled={!alteradas.length} onClick={() => setDraft(null)}>
                  Descartar
                </Button>
                <Button
                  variant="outline"
                  icon={<Save className="h-4 w-4" />}
                  disabled={!alteradas.length || alteradas.some(erroDe)}
                  loading={salvar.isPending}
                  onClick={() => salvar.mutate(alteradas, { onSuccess: () => setDraft(null) })}
                >
                  Salvar alterações{alteradas.length ? ` (${alteradas.length})` : ''}
                </Button>
              </>
            )}
            <Button icon={acaoPrincipal.icon} onClick={() => setModal(aba)}>
              {acaoPrincipal.label}
            </Button>
          </>
        }
      />

      <Tabs
        variant="pills"
        aria-label="Seções do SLA"
        value={aba}
        onChange={setAba}
        className="mb-6 border border-brand-border"
        items={[
          { value: 'politicas', label: 'Políticas', icon: <ShieldCheck className="h-4 w-4" />, count: politicasQ.data?.length },
          { value: 'horarios', label: 'Horários Comerciais', icon: <Clock className="h-4 w-4" />, count: horariosQ.data?.length },
          { value: 'feriados', label: 'Feriados', icon: <CalendarDays className="h-4 w-4" />, count: feriadosQ.data?.length },
        ]}
      />

      {aba === 'horarios' && (
        <HorariosTab horarios={horariosQ.data} politicas={politicasQ.data ?? []} isLoading={horariosQ.isLoading} error={horariosQ.error} onRetry={horariosQ.refetch} onNovo={() => setModal('horarios')} />
      )}
      {aba === 'feriados' && (
        <FeriadosTab feriados={feriadosQ.data} isLoading={feriadosQ.isLoading} error={feriadosQ.error} onRetry={feriadosQ.refetch} onNovo={() => setModal('feriados')} />
      )}

      {aba === 'politicas' && (
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted sm:col-span-2 xl:col-span-1">Políticas por Prioridade</p>
            {!politicasQ.isLoading && !politicas.length && <p className="text-sm text-brand-muted">Nenhuma política de SLA cadastrada.</p>}
            {politicasQ.isLoading
              ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 w-full" />)
              : politicas.map((p) => {
                  const meta = PRIORIDADE_META[p.prioridade];
                  const active = p.id === selected?.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      aria-pressed={active}
                      className={cn(
                        'w-full rounded-lg border border-l-4 bg-white p-4 text-left shadow-card transition',
                        PRIO_BORDER[p.prioridade],
                        active ? 'border-brand-accent ring-2 ring-brand-accent/20' : 'border-brand-border hover:border-slate-300',
                        !p.ativa && 'opacity-60',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <span className="flex gap-1">
                          {alteradas.some((a) => a.id === p.id) && <Badge tone="pendente">Alterada</Badge>}
                          {!p.ativa && <Badge tone="neutral">Inativa</Badge>}
                          {erroDe(p) && <Badge tone="danger">Inválida</Badge>}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-brand-darker">{p.nome}</p>
                      <div className="mt-2 flex gap-4 text-xs text-brand-muted">
                        <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> Resp. {formatMinutes(p.tempoRespostaMin)}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Sol. {formatMinutes(p.tempoSolucaoMin)}</span>
                        <span className="ml-auto font-semibold">{p.calendario === '24X7' ? '24x7' : 'Comercial'}</span>
                      </div>
                    </button>
                  );
                })}
          </div>

          {selected && (
            <div className="space-y-6">
              <Card>
                <CardHeader dark title={selected.nome || 'Sem nome'} description={selected.descricao} icon={<ShieldCheck className="h-5 w-5" />} />
                <CardBody className="grid gap-6 md:grid-cols-2">
                  <Field label="Nome" required error={!selected.nome.trim() ? 'Informe o nome da política.' : undefined} className="md:col-span-2">
                    {(id) => <Input id={id} maxLength={100} value={selected.nome} onChange={(e) => update({ nome: e.target.value })} invalid={!selected.nome.trim()} />}
                  </Field>
                  <DurationInput
                    label="Tempo de Primeira Resposta"
                    value={selected.tempoRespostaMin}
                    error={selected.tempoRespostaMin >= selected.tempoSolucaoMin ? 'Deve ser menor que o tempo de solução.' : undefined}
                    onChange={(v) => update({ tempoRespostaMin: v })}
                  />
                  <DurationInput label="Tempo de Solução" value={selected.tempoSolucaoMin} onChange={(v) => update({ tempoSolucaoMin: v })} />
                  <Field label="Horário comercial" hint="O relógio pausa fora dos intervalos deste horário e nos feriados cadastrados.">
                    {(id) => (
                      <Select
                        id={id}
                        placeholder={horariosQ.isLoading ? 'Carregando...' : 'Selecione...'}
                        options={horarios.map((h) => ({ value: h.id, label: `${nomeHorario(h)}${h.ativo ? '' : ' (inativo)'}` }))}
                        value={selected.horarioComercialId ?? ''}
                        onChange={(e) => update({ horarioComercialId: e.target.value ? Number(e.target.value) : null, calendario: e.target.value ? 'COMERCIAL' : '24X7' })}
                      />
                    )}
                  </Field>
                  <div className="self-end rounded-md bg-slate-50 p-3">
                    <Switch
                      label="Política ativa"
                      description="Só políticas ativas valem para novos chamados."
                      checked={selected.ativa}
                      onChange={(ativa) => update({ ativa })}
                    />
                  </div>
                  {horarioDe(selected) && !horarioDe(selected)!.ativo && (
                    <Callout tone="warning" className="md:col-span-2">
                      O horário &quot;{nomeHorario(horarioDe(selected)!)}&quot; está inativo.
                    </Callout>
                  )}
                </CardBody>
              </Card>

              {recursos.alertasSla && (
                <Card>
                  <CardHeader title="Ações Automáticas" description="Disparadas pelo motor de SLA quando a meta se aproxima do vencimento." icon={<BellRing className="h-5 w-5" />} />
                  <CardBody className="space-y-5">
                    <Switch
                      checked={selected.notificarGestor}
                      onChange={(notificarGestor) => update({ notificarGestor })}
                      label="Notificar gestor do grupo"
                      description="Envia e-mail e notificação in-app ao gestor quando o SLA for violado."
                    />
                    <Switch
                      checked={selected.alertaPercentual !== null}
                      onChange={(on) => update({ alertaPercentual: on ? 75 : null })}
                      label="Alerta preventivo"
                      description="Avisa o técnico responsável ao atingir um percentual do tempo de solução."
                    />
                    {selected.alertaPercentual !== null && (
                      <div className="flex items-center gap-4 rounded-md bg-brand-bg p-4">
                        <input
                          type="range"
                          min={10}
                          max={95}
                          step={5}
                          value={selected.alertaPercentual}
                          onChange={(e) => update({ alertaPercentual: Number(e.target.value) })}
                          aria-label="Percentual de alerta"
                          className="flex-1 accent-brand-primary"
                        />
                        <span className="w-28 text-right text-sm font-bold text-brand-primary">
                          {selected.alertaPercentual}% · {formatMinutes((selected.tempoSolucaoMin * selected.alertaPercentual) / 100)}
                        </span>
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}

              {!!alteradas.length && (
                <Callout tone="warning" title="Alterações não salvas">
                  As metas passam a valer para novos chamados após salvar. Chamados em andamento mantêm a política vigente na abertura. Ativar uma política que repete a prioridade e o tipo de outra ativa é recusado pela API.
                </Callout>
              )}
            </div>
          )}
        </div>
      )}

      <PoliticaModal open={modal === 'politicas'} onClose={() => setModal(null)} politicas={politicasQ.data ?? []} horarios={horarios} onCadastrarHorario={() => setModal('horarios')} />
      <HorarioModal open={modal === 'horarios'} onClose={() => setModal(null)} />
      <FeriadoModal open={modal === 'feriados'} onClose={() => setModal(null)} />
    </>
  );
}
