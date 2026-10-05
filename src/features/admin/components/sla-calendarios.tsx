'use client';

import { useState } from 'react';
import { CalendarDays, CalendarPlus, Clock, Globe2, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, ConfirmModal, EmptyState, ErrorState, Field, Input, Menu, Modal, Select, Skeleton, Switch } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { textoInvalido } from '@/lib/validation';
import { cn } from '@/lib/utils';
import type { Feriado, HorarioComercial, IntervaloHorario, PoliticaSla } from '@/types';
import {
  useAtualizarFeriado,
  useAtualizarHorario,
  useAtualizarIntervalo,
  useCriarFeriado,
  useCriarHorario,
  useCriarIntervalo,
  useExcluirFeriado,
  useExcluirHorario,
  useExcluirIntervalo,
} from '../use-admin';
import { nomeHorario } from './politica-modal';

export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const FUSOS = [
  { value: 'America/Cuiaba', label: 'Cuiabá (UTC−4)' },
  { value: 'America/Sao_Paulo', label: 'Brasília (UTC−3)' },
  { value: 'America/Manaus', label: 'Manaus (UTC−4)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (UTC−4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (UTC−5)' },
  { value: 'America/Belem', label: 'Belém (UTC−3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (UTC−3)' },
  { value: 'America/Recife', label: 'Recife (UTC−3)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (UTC−2)' },
];

const labelFuso = (v: string) => FUSOS.find((f) => f.value === v)?.label ?? v;

/* ----------------------------- Horários ----------------------------- */

interface HorariosTabProps {
  horarios: HorarioComercial[] | undefined;
  politicas: PoliticaSla[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  onNovo: () => void;
}

export function HorariosTab({ horarios, politicas, isLoading, error, onRetry, onNovo }: HorariosTabProps) {
  const [intervalo, setIntervalo] = useState<{ horario: HorarioComercial; atual?: IntervaloHorario } | null>(null);
  const [editando, setEditando] = useState<HorarioComercial | null>(null);
  const [excluindo, setExcluindo] = useState<HorarioComercial | null>(null);
  const excluir = useExcluirHorario(() => setExcluindo(null));

  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={onRetry} />;
  if (isLoading) return <div className="grid gap-6 lg:grid-cols-2">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-72" />)}</div>;
  if (!horarios?.length) {
    return (
      <Card>
        <EmptyState
          icon={<Clock className="h-10 w-10" />}
          title="Nenhum horário comercial"
          description="Cadastre o expediente de atendimento para que o SLA pause fora dele."
          action={<Button icon={<Plus className="h-4 w-4" />} onClick={onNovo}>Novo horário</Button>}
        />
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {horarios.map((h) => {
          const usadoPor = politicas.filter((p) => p.horarioComercialId === h.id);
          return (
            <Card key={h.id} className={cn(!h.ativo && 'opacity-75')}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    {nomeHorario(h)}
                    {!h.ativo && <Badge tone="neutral">Inativo</Badge>}
                  </span>
                }
                description={labelFuso(h.fusoHorario)}
                icon={<Globe2 className="h-5 w-5" />}
                actions={
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" icon={<Plus className="h-4 w-4" />} onClick={() => setIntervalo({ horario: h })}>
                      Intervalo
                    </Button>
                    <Menu
                      label={`Ações do horário ${nomeHorario(h)}`}
                      items={[
                        { label: 'Editar', icon: <Pencil className="h-4 w-4" />, onClick: () => setEditando(h) },
                        { label: 'Excluir', icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: () => setExcluindo(h) },
                      ]}
                    />
                  </div>
                }
              />
              <CardBody className="divide-y divide-brand-border p-0">
                {DIAS_SEMANA.map((dia, i) => {
                  const intervalos = h.intervalos.filter((x) => x.diaSemana === i);
                  return (
                    <div key={dia} className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm">
                      <span className={cn('w-20 font-medium', intervalos.length ? 'text-brand-darker' : 'text-brand-muted')}>{dia}</span>
                      <div className="flex flex-1 flex-wrap justify-end gap-1.5">
                        {intervalos.length ? (
                          intervalos.map((x) => (
                            <button
                              key={x.id}
                              type="button"
                              title="Editar intervalo"
                              aria-label={`Editar intervalo de ${dia}, ${x.inicio} a ${x.fim}`}
                              onClick={() => setIntervalo({ horario: h, atual: x })}
                              className="rounded bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-brand-primary hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                            >
                              {x.inicio} – {x.fim}
                            </button>
                          ))
                        ) : (
                          <span className="text-xs italic text-brand-muted">Sem expediente</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardBody>
              <div className="border-t border-brand-border px-5 py-3 text-xs text-brand-muted">
                {usadoPor.length ? (
                  <>
                    Usado por: <strong className="text-brand-darker">{usadoPor.map((p) => p.nome).join(', ')}</strong>
                  </>
                ) : (
                  'Nenhuma política usa este horário.'
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {intervalo && <IntervaloModal key={`${intervalo.horario.id}-${intervalo.atual?.id ?? 'novo'}`} horario={intervalo.horario} atual={intervalo.atual} onClose={() => setIntervalo(null)} />}
      {editando && <HorarioModal key={editando.id} open horario={editando} onClose={() => setEditando(null)} />}
      <ConfirmModal
        open={!!excluindo}
        onClose={() => setExcluindo(null)}
        onConfirm={() => excluindo && excluir.mutate(excluindo.id)}
        loading={excluir.isPending}
        title="Excluir horário comercial"
      >
        {excluindo && politicas.some((p) => p.horarioComercialId === excluindo.id) ? (
          <p>
            &quot;{nomeHorario(excluindo)}&quot; está em uso por{' '}
            <strong>{politicas.filter((p) => p.horarioComercialId === excluindo.id).map((p) => p.nome).join(', ')}</strong>. A API recusa a exclusão; troque o horário dessas políticas primeiro.
          </p>
        ) : (
          <p>O horário &quot;{excluindo && nomeHorario(excluindo)}&quot; e todos os seus intervalos serão removidos.</p>
        )}
      </ConfirmModal>
    </>
  );
}

export function HorarioModal({ open, onClose, horario }: { open: boolean; onClose: () => void; horario?: HorarioComercial }) {
  const [nome, setNome] = useState(horario?.nome ?? '');
  const [fuso, setFuso] = useState(horario?.fusoHorario ?? FUSOS[0]!.value);
  const [ativo, setAtivo] = useState(horario?.ativo ?? true);
  const [tentou, setTentou] = useState(false);

  function fechar() {
    setNome(horario?.nome ?? '');
    setFuso(horario?.fusoHorario ?? FUSOS[0]!.value);
    setAtivo(horario?.ativo ?? true);
    setTentou(false);
    onClose();
  }

  const criar = useCriarHorario(fechar);
  const atualizar = useAtualizarHorario(fechar);
  const erroNome = textoInvalido(nome, { rotulo: 'O nome', max: 100 });
  const fusos = FUSOS.some((f) => f.value === fuso) ? FUSOS : [...FUSOS, { value: fuso, label: fuso }];

  function salvar() {
    setTentou(true);
    if (erroNome) return;
    if (horario) atualizar.mutate({ id: horario.id, nome, fusoHorario: fuso, ativo });
    else criar.mutate({ nome, fusoHorario: fuso, ativo });
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      size="sm"
      title={horario ? 'Editar horário comercial' : 'Novo horário comercial'}
      description={horario ? 'Os intervalos são editados direto no cartão do horário.' : 'Depois de criado, adicione os intervalos de atendimento de cada dia.'}
      footer={
        <>
          <Button variant="outline" onClick={fechar}>Cancelar</Button>
          <Button loading={criar.isPending || atualizar.isPending} onClick={salvar}>{horario ? 'Salvar' : 'Criar horário'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nome" required error={tentou ? erroNome : undefined}>
          {(id) => <Input id={id} maxLength={100} placeholder="Ex.: Expediente Matriz" value={nome} onChange={(e) => setNome(e.target.value)} invalid={tentou && !!erroNome} />}
        </Field>
        <Field label="Fuso horário">{(id) => <Select id={id} options={fusos} value={fuso} onChange={(e) => setFuso(e.target.value)} />}</Field>
        <div className="rounded-md bg-slate-50 p-3">
          <Switch label="Ativo" checked={ativo} onChange={setAtivo} />
        </div>
      </div>
    </Modal>
  );
}

function IntervaloModal({ horario, atual, onClose }: { horario: HorarioComercial; atual?: IntervaloHorario; onClose: () => void }) {
  const [dia, setDia] = useState(String(atual?.diaSemana ?? 1));
  const [inicio, setInicio] = useState(atual?.inicio ?? '08:00');
  const [fim, setFim] = useState(atual?.fim ?? '12:00');

  const criar = useCriarIntervalo(onClose);
  const atualizar = useAtualizarIntervalo(onClose);
  const remover = useExcluirIntervalo(onClose);
  const diaSemana = Number(dia);
  const sobreposto = horario.intervalos.find((x) => x.id !== atual?.id && x.diaSemana === diaSemana && inicio < x.fim && fim > x.inicio);
  const erro = !inicio || !fim ? 'Informe início e fim.' : fim <= inicio ? 'O fim precisa ser depois do início.' : sobreposto ? `Sobrepõe o intervalo ${sobreposto.inicio} – ${sobreposto.fim} deste dia.` : undefined;

  function salvar() {
    const input = { horarioId: horario.id, diaSemana, inicio, fim };
    if (atual) atualizar.mutate({ id: atual.id, ...input });
    else criar.mutate(input);
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={atual ? 'Editar intervalo' : 'Adicionar intervalo'}
      description={nomeHorario(horario)}
      footer={
        <>
          {atual && (
            <Button
              variant="danger-outline"
              className="mr-auto"
              icon={<Trash2 className="h-4 w-4" />}
              loading={remover.isPending}
              onClick={() => remover.mutate({ horarioId: horario.id, id: atual.id })}
            >
              Remover
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button loading={criar.isPending || atualizar.isPending} disabled={!!erro} onClick={salvar}>
            {atual ? 'Salvar' : 'Adicionar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Dia da semana">{(id) => <Select id={id} options={DIAS_SEMANA.map((d, i) => ({ value: i, label: d }))} value={dia} onChange={(e) => setDia(e.target.value)} />}</Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Início">{(id) => <Input id={id} type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} invalid={!!erro} />}</Field>
          <Field label="Fim">{(id) => <Input id={id} type="time" value={fim} onChange={(e) => setFim(e.target.value)} invalid={!!erro} />}</Field>
        </div>
        {erro && <p role="alert" className="text-xs text-status-critica">{erro}</p>}
        <p className="text-xs text-brand-muted">Para pausar o almoço, cadastre dois intervalos no mesmo dia (ex.: 08:00–12:00 e 13:00–18:00).</p>
      </div>
    </Modal>
  );
}

/* ----------------------------- Feriados ----------------------------- */

const pad = (n: number) => String(n).padStart(2, '0');

/** Próxima data do feriado a partir de hoje; `null` para feriado único que já passou. */
function proximaOcorrencia(f: Feriado) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em = (ano: number) => new Date(ano, f.mes - 1, f.dia);
  if (f.ano) return em(f.ano) >= hoje ? em(f.ano) : null;
  return em(hoje.getFullYear()) >= hoje ? em(hoje.getFullYear()) : em(hoje.getFullYear() + 1);
}

interface FeriadosTabProps {
  feriados: Feriado[] | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  onNovo: () => void;
}

export function FeriadosTab({ feriados, isLoading, error, onRetry, onNovo }: FeriadosTabProps) {
  const [editando, setEditando] = useState<Feriado | null>(null);
  const [excluindo, setExcluindo] = useState<Feriado | null>(null);
  const excluir = useExcluirFeriado(() => setExcluindo(null));

  if (error) return <ErrorState message={getErrorMessage(error)} onRetry={onRetry} />;
  if (isLoading) return <Skeleton className="h-64" />;
  if (!feriados?.length) {
    return (
      <Card>
        <EmptyState
          icon={<CalendarDays className="h-10 w-10" />}
          title="Nenhum feriado cadastrado"
          description="Feriados não contam no relógio do SLA em horário comercial."
          action={<Button icon={<CalendarPlus className="h-4 w-4" />} onClick={onNovo}>Novo feriado</Button>}
        />
      </Card>
    );
  }
  return (
    <>
      <div className="overflow-hidden rounded-lg border border-brand-border bg-white shadow-card">
        <table className="w-full text-sm">
          <caption className="sr-only">Feriados cadastrados</caption>
          <thead>
            <tr className="bg-brand-darker text-left text-[11px] font-semibold uppercase tracking-wider text-slate-200">
              <th scope="col" className="px-4 py-3">Data</th>
              <th scope="col" className="px-4 py-3">Feriado</th>
              <th scope="col" className="px-4 py-3">Recorrência</th>
              <th scope="col" className="px-4 py-3">Próxima ocorrência</th>
              <th scope="col" className="w-12 px-4 py-3"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {feriados.map((f) => {
              const proxima = proximaOcorrencia(f);
              return (
                <tr key={f.id} className={cn('hover:bg-slate-50', !proxima && 'text-brand-muted')}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {pad(f.dia)}/{pad(f.mes)}
                    {f.ano ? `/${f.ano}` : ''}
                  </td>
                  <td className="px-4 py-3 font-medium text-brand-darker">{f.nome}</td>
                  <td className="px-4 py-3">
                    {f.ano ? <Badge tone="neutral">Somente {f.ano}</Badge> : <Badge tone="primary"><Repeat className="mr-1 inline h-3 w-3" aria-hidden />Todo ano</Badge>}
                  </td>
                  <td className="px-4 py-3 text-xs">{proxima ? formatDate(proxima.toISOString()) : 'Já ocorreu'}</td>
                  <td className="px-4 py-2 text-right">
                    <Menu
                      label={`Ações do feriado ${f.nome}`}
                      items={[
                        { label: 'Editar', icon: <Pencil className="h-4 w-4" />, onClick: () => setEditando(f) },
                        { label: 'Excluir', icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: () => setExcluindo(f) },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editando && <FeriadoModal key={editando.id} open feriado={editando} onClose={() => setEditando(null)} />}
      <ConfirmModal
        open={!!excluindo}
        onClose={() => setExcluindo(null)}
        onConfirm={() => excluindo && excluir.mutate(excluindo.id)}
        loading={excluir.isPending}
        title="Excluir feriado"
      >
        <p>O feriado &quot;{excluindo?.nome}&quot; deixará de pausar o relógio do SLA.</p>
      </ConfirmModal>
    </>
  );
}

/** Ano usado no seletor de data quando o feriado se repete todo ano (só dia e mês são gravados). */
const anoReferencia = () => new Date().getFullYear();
const dataDoFeriado = (f?: Feriado) => (f ? `${f.ano ?? anoReferencia()}-${pad(f.mes)}-${pad(f.dia)}` : '');

export function FeriadoModal({ open, onClose, feriado }: { open: boolean; onClose: () => void; feriado?: Feriado }) {
  const [nome, setNome] = useState(feriado?.nome ?? '');
  const [data, setData] = useState(dataDoFeriado(feriado));
  const [anual, setAnual] = useState(feriado ? feriado.ano === null : true);
  const [tentou, setTentou] = useState(false);

  function fechar() {
    setNome(feriado?.nome ?? '');
    setData(dataDoFeriado(feriado));
    setAnual(feriado ? feriado.ano === null : true);
    setTentou(false);
    onClose();
  }

  const criar = useCriarFeriado(fechar);
  const atualizar = useAtualizarFeriado(fechar);
  const erros = { nome: textoInvalido(nome, { rotulo: 'O nome', max: 100 }), data: data ? undefined : 'Informe a data.' };

  function salvar() {
    setTentou(true);
    if (erros.nome || erros.data) return;
    const [ano, mes, dia] = data.split('-').map(Number) as [number, number, number];
    const input = { nome, dia, mes, ano: anual ? null : ano };
    if (feriado) atualizar.mutate({ id: feriado.id, ...input });
    else criar.mutate(input);
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      size="sm"
      title={feriado ? 'Editar feriado' : 'Novo feriado'}
      description="Datas repetidas são recusadas pela API."
      footer={
        <>
          <Button variant="outline" onClick={fechar}>Cancelar</Button>
          <Button loading={criar.isPending || atualizar.isPending} onClick={salvar}>{feriado ? 'Salvar' : 'Cadastrar'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nome" required error={tentou ? erros.nome : undefined}>
          {(id) => <Input id={id} maxLength={100} placeholder="Ex.: Aniversário da cidade" value={nome} onChange={(e) => setNome(e.target.value)} invalid={tentou && !!erros.nome} />}
        </Field>
        <Field label="Data" required error={tentou ? erros.data : undefined} hint={anual ? 'Só o dia e o mês são gravados.' : undefined}>
          {(id) => <Input id={id} type="date" value={data} onChange={(e) => setData(e.target.value)} invalid={tentou && !!erros.data} />}
        </Field>
        <div className="rounded-md bg-slate-50 p-3">
          <Switch label="Repetir todos os anos" description="Desligue para feriados ou pontos facultativos de um ano específico." checked={anual} onChange={setAnual} />
        </div>
      </div>
    </Modal>
  );
}
