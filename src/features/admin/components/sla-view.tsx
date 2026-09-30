'use client';

import { useState } from 'react';
import { BellRing, CalendarDays, Clock, Globe2, Lock, RotateCcw, Save, ShieldCheck, Timer } from 'lucide-react';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Skeleton,
  Switch,
  ToggleGroup,
} from '@/components/ui';
import { PRIORIDADE_META } from '@/features/chamados/components/chamado-badges';
import { getErrorMessage } from '@/lib/api';
import { formatDate, formatMinutes } from '@/lib/format';
import { recursos } from '@/lib/recursos';
import { cn } from '@/lib/utils';
import type { PoliticaSla } from '@/types';
import { useHorarios, usePoliticasSla, useSalvarSla } from '../use-admin';

const PRIO_BORDER: Record<PoliticaSla['prioridade'], string> = {
  CRITICA: 'border-l-prio-critica',
  ALTA: 'border-l-prio-alta',
  MEDIA: 'border-l-prio-media',
  BAIXA: 'border-l-prio-baixa',
};

interface DurationInputProps {
  label: string;
  value: number;
  onChange: (min: number) => void;
  invalid?: boolean;
  disabled?: boolean;
}

function DurationInput({ label, value, onChange, invalid, disabled }: DurationInputProps) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  const inteiro = (v: string) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0);
  const set = (hours: number, mins: number) => onChange(Math.max(0, hours) * 60 + Math.min(59, Math.max(0, mins)));
  return (
    <Field label={label} hint={`Total: ${formatMinutes(value)} (${value} min)`} error={invalid ? 'Deve ser menor que o tempo de solução.' : undefined}>
      {(id) => (
        <div className="flex items-center gap-2">
          <Input id={id} type="number" min={0} step={1} value={h} disabled={disabled} onChange={(e) => set(inteiro(e.target.value), m)} className="text-center font-semibold" />
          <span className="text-xs font-semibold text-brand-muted">h</span>
          <Input
            type="number"
            min={0}
            max={59}
            step={1}
            value={m}
            disabled={disabled}
            invalid={invalid}
            aria-label={`${label} (minutos)`}
            onChange={(e) => set(h, inteiro(e.target.value))}
            className="text-center font-semibold"
          />
          <span className="text-xs font-semibold text-brand-muted">min</span>
        </div>
      )}
    </Field>
  );
}

export function SlaView() {
  const { data, isLoading, isError, error, refetch } = usePoliticasSla();
  const { data: horarios } = useHorarios();
  const salvar = useSalvarSla();
  const [draft, setDraft] = useState<PoliticaSla[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const editavel = recursos.edicaoSla;
  const politicas = draft ?? data ?? [];
  const selected = politicas.find((p) => p.id === selectedId) ?? politicas[0];
  const horario = horarios?.[0];
  const invalid = (p: PoliticaSla) => p.tempoRespostaMin >= p.tempoSolucaoMin;

  function update(patch: Partial<PoliticaSla>) {
    if (!selected || !editavel) return;
    setDraft(politicas.map((p) => (p.id === selected.id ? { ...p, ...patch } : p)));
  }

  function onSave() {
    if (draft) salvar.mutate(draft, { onSuccess: () => setDraft(null) });
  }

  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Configuração de SLA"
        description={editavel ? 'Defina metas de resposta e solução por prioridade, calendário de contagem e ações automáticas.' : 'Metas de resposta e solução por prioridade.'}
        breadcrumbs={[{ label: 'Administração' }, { label: 'Políticas de SLA' }]}
        actions={
          editavel && (
            <>
              <Button variant="outline" icon={<RotateCcw className="h-4 w-4" />} disabled={!draft} onClick={() => setDraft(null)}>
                Descartar
              </Button>
              <Button icon={<Save className="h-4 w-4" />} disabled={!draft || politicas.some(invalid)} loading={salvar.isPending} onClick={onSave}>
                Salvar Regras
              </Button>
            </>
          )
        }
      />

      {!editavel && (
        <Callout tone="info" icon={<Lock className="h-5 w-5" />} className="mb-6">
          Visualização somente leitura: a API atual não permite editar políticas existentes nem consultar turnos e feriados.
        </Callout>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted sm:col-span-2 xl:col-span-1">Políticas por Prioridade</p>
          {!isLoading && !politicas.length && <p className="text-sm text-brand-muted">Nenhuma política de SLA cadastrada.</p>}
          {isLoading
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
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {invalid(p) && <Badge tone="danger">Inválida</Badge>}
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
              <CardHeader dark title={selected.nome} description={selected.descricao} icon={<ShieldCheck className="h-5 w-5" />} />
              <CardBody className="grid gap-6 md:grid-cols-2">
                <DurationInput
                  label="Tempo de Primeira Resposta"
                  value={selected.tempoRespostaMin}
                  invalid={invalid(selected)}
                  disabled={!editavel}
                  onChange={(v) => update({ tempoRespostaMin: v })}
                />
                <DurationInput label="Tempo de Solução" value={selected.tempoSolucaoMin} disabled={!editavel} onChange={(v) => update({ tempoSolucaoMin: v })} />
                <div className="md:col-span-2">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Calendário de Contagem</p>
                  {editavel ? (
                    <ToggleGroup
                      value={selected.calendario}
                      aria-label="Calendário de contagem"
                      onChange={(calendario) => update({ calendario, horarioComercialId: calendario === 'COMERCIAL' ? (horario?.id ?? null) : null })}
                      options={[
                        { value: '24X7', label: '24x7 (corrido)' },
                        { value: 'COMERCIAL', label: 'Horário Comercial' },
                      ]}
                      className="w-full max-w-md"
                    />
                  ) : (
                    <Badge tone="neutral">{selected.calendario === '24X7' ? '24x7 (corrido)' : 'Horário Comercial'}</Badge>
                  )}
                  <p className="mt-2 text-xs text-brand-muted">
                    {selected.calendario === '24X7'
                      ? 'O relógio do SLA corre ininterruptamente, inclusive fins de semana e feriados.'
                      : `O relógio pausa fora de "${horario?.nome ?? 'Horário Comercial'}" e em feriados cadastrados.`}
                  </p>
                </div>
              </CardBody>
            </Card>

            {editavel && (
              <>
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

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader title="Turnos de Atendimento" description={horario?.nome} icon={<Globe2 className="h-5 w-5" />} />
                    <CardBody className="divide-y divide-brand-border p-0">
                      {!horarios ? (
                        <Skeleton className="m-5 h-16" />
                      ) : horario?.turnos.length ? (
                        horario.turnos.map((t) => (
                          <div key={t.dias} className="flex items-center justify-between px-5 py-3 text-sm">
                            <span className="font-medium text-brand-darker">{t.dias}</span>
                            <span className="font-mono text-brand-muted">
                              {t.inicio} – {t.fim}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="px-5 py-4 text-sm text-brand-muted">Nenhum turno disponível.</p>
                      )}
                    </CardBody>
                  </Card>
                  <Card>
                    <CardHeader title="Feriados" description="Não contabilizados no calendário comercial." icon={<CalendarDays className="h-5 w-5" />} />
                    <CardBody className="divide-y divide-brand-border p-0">
                      {!horarios ? (
                        <Skeleton className="m-5 h-16" />
                      ) : horario?.feriados.length ? (
                        horario.feriados.map((f) => (
                          <div key={f.data} className="flex items-center justify-between px-5 py-3 text-sm">
                            <span className="font-medium text-brand-darker">{f.descricao}</span>
                            <span className="font-mono text-brand-muted">{formatDate(`${f.data}T12:00:00`)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="px-5 py-4 text-sm text-brand-muted">Nenhum feriado disponível.</p>
                      )}
                    </CardBody>
                  </Card>
                </div>
              </>
            )}

            {draft && (
              <Callout tone="warning" title="Alterações não salvas">
                As metas passam a valer para novos chamados após salvar. Chamados em andamento mantêm a política vigente na abertura.
              </Callout>
            )}
          </div>
        )}
      </div>
    </>
  );
}
