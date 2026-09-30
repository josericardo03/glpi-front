'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, Plus, Wrench } from 'lucide-react';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageLoader,
  Progress,
  Select,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { recursos } from '@/lib/recursos';
import { cn } from '@/lib/utils';
import { textoInvalido } from '@/lib/validation';
import type { AtivoDetalhe, Dependencia, Manutencao } from '@/types';
import { StatusBadge } from '@/features/chamados/components/chamado-badges';
import { useAddEspecificacao, useAddManutencao, useAtivo } from '../use-ativos';
import { AtivoIcon, StatusAtivoBadge, TIPO_ATIVO } from './ativo-meta';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function Node({ d, side }: { d: Dependencia; side: 'l' | 'r' }) {
  return (
    <Link
      href={`/ativos/${d.id}`}
      className={cn('relative flex items-center gap-2 rounded-md border border-brand-border bg-white p-2 text-xs shadow-sm hover:border-brand-accent', side === 'l' ? 'flex-row' : 'flex-row-reverse text-right')}
    >
      <AtivoIcon tipo={d.tipo} className="h-8 w-8" />
      <span>
        <span className="block font-semibold text-brand-darker">{d.nome}</span>
        <span className="text-brand-muted">{d.codigo}</span>
      </span>
    </Link>
  );
}

/** Grafo de dependências (upstream à esquerda, downstream à direita). */
function DependencyGraph({ ativo }: { ativo: AtivoDetalhe }) {
  const up = ativo.dependencias.filter((d) => d.relacao === 'DEPENDE_DE');
  const down = ativo.dependencias.filter((d) => d.relacao === 'SUPORTA');
  if (!ativo.dependencias.length) return <EmptyState title="Sem dependências mapeadas" />;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-brand-muted">Depende de</p>
        {up.map((d) => <Node key={d.id} d={d} side="l" />)}
      </div>
      <div className="flex items-center gap-2">
        <span className="h-px w-6 bg-brand-accent" />
        <div className="rounded-lg bg-brand-darker px-4 py-3 text-center text-white shadow-pop">
          <p className="text-xs font-bold">{ativo.codigo}</p>
          <p className="text-[10px] text-slate-400">{TIPO_ATIVO[ativo.tipo].label}</p>
        </div>
        <span className="h-px w-6 bg-brand-accent" />
      </div>
      <div className="space-y-2">
        <p className="text-right text-[10px] font-bold uppercase tracking-wide text-brand-muted">Suporta</p>
        {down.map((d) => <Node key={d.id} d={d} side="r" />)}
        {!down.length && <p className="text-right text-xs text-brand-muted">—</p>}
      </div>
    </div>
  );
}

const hoje = () => new Date().toLocaleDateString('en-CA');
const novaManutencao = (): Omit<Manutencao, 'id'> => ({ descricao: '', tipo: 'PREVENTIVA', custo: 0, realizadaEm: hoje(), responsavel: '' });

export function AtivoDetalheView({ id }: { id: number }) {
  const { data: a, isLoading, isError, error, refetch } = useAtivo(id);
  const addSpec = useAddEspecificacao(id);
  const addManut = useAddManutencao(id);
  const [chave, setChave] = useState('');
  const [valor, setValor] = useState('');
  const [manutOpen, setManutOpen] = useState(false);
  const [manut, setManut] = useState(novaManutencao);

  if (isLoading) return <PageLoader />;
  if (isError || !a) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const detalhado = recursos.detalhesAtivo;
  const custoValido = Number.isFinite(manut.custo) && manut.custo >= 0;
  const manutValida = !textoInvalido(manut.descricao, { min: 3, max: 255 }) && !textoInvalido(manut.responsavel) && custoValido && !!manut.realizadaEm && manut.realizadaEm <= hoje();

  function onSpec(e: FormEvent) {
    e.preventDefault();
    if (!chave.trim() || !valor.trim()) return;
    addSpec.mutate(
      { chave: chave.trim(), valor: valor.trim() },
      {
        onSuccess: () => {
          setChave('');
          setValor('');
        },
      },
    );
  }

  function fecharManutencao() {
    setManutOpen(false);
    setManut(novaManutencao());
  }

  function onManutencao(e: FormEvent) {
    e.preventDefault();
    if (!manutValida) return;
    addManut.mutate(
      { ...manut, descricao: manut.descricao.trim(), responsavel: manut.responsavel.trim(), realizadaEm: `${manut.realizadaEm}T12:00:00.000Z` },
      { onSuccess: fecharManutencao },
    );
  }

  const info = (
    [
      ['Fabricante', a.fabricante],
      ['Modelo', a.modelo],
      ['Número de Série', a.numeroSerie],
      ['Responsável', a.responsavelNome ?? 'Não atribuído'],
      ['Localização', a.localizacao],
      ['Aquisição', a.dataAquisicao && formatDate(a.dataAquisicao)],
      ['Garantia até', a.garantiaAte && formatDate(a.garantiaAte)],
    ] as [string, string | null][]
  ).filter((kv): kv is [string, string] => !!kv[1]);

  return (
    <>
      <Link href="/ativos" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted hover:text-brand-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar ao inventário
      </Link>

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <AtivoIcon tipo={a.tipo} className="h-14 w-14" />
            <div>
              <p className="text-xs font-semibold text-brand-muted">{a.codigo} · {TIPO_ATIVO[a.tipo].label}</p>
              <h1 className="text-2xl font-bold text-brand-darker">{a.nome}</h1>
              <div className="mt-1.5"><StatusAtivoBadge status={a.status} /></div>
            </div>
          </div>
          {a.saude !== null && (
            <div className="w-56">
              <div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-brand-muted">Saúde do ativo</span><strong>{a.saude}%</strong></div>
              <Progress value={a.saude} tone={a.saude >= 80 ? 'success' : a.saude >= 50 ? 'warning' : 'danger'} size="md" />
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {!detalhado && (
            <Callout tone="info">
              A API atual fornece apenas os dados cadastrais do ativo. Especificações técnicas, dependências, manutenções e chamados vinculados ainda não estão disponíveis.
            </Callout>
          )}
          {detalhado && (
            <>
              <Card>
                <CardHeader title="Especificações Técnicas" description="Pares chave/valor (ativo_especificacoes)" />
                <CardBody>
                  {a.especificacoes.length === 0 ? (
                    <EmptyState title="Nenhuma especificação cadastrada" />
                  ) : (
                    <dl className="divide-y divide-brand-border rounded-md border border-brand-border">
                      {a.especificacoes.map((s) => (
                        <div key={s.id} className="grid grid-cols-[180px_1fr] gap-4 px-4 py-2.5 text-sm">
                          <dt className="font-medium text-brand-muted">{s.chave}</dt>
                          <dd className="text-brand-darker">{s.valor}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <form onSubmit={onSpec} className="mt-4 grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                    <Input aria-label="Chave da especificação" placeholder="Chave (ex: CPU)" maxLength={100} value={chave} onChange={(e) => setChave(e.target.value)} />
                    <Input aria-label="Valor da especificação" placeholder="Valor" maxLength={255} value={valor} onChange={(e) => setValor(e.target.value)} />
                    <Button type="submit" variant="dark" disabled={!chave.trim() || !valor.trim()} loading={addSpec.isPending} icon={<Plus className="h-4 w-4" />}>
                      Adicionar
                    </Button>
                  </form>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Grafo de Dependências" description="Relacionamentos entre itens de configuração" />
                <CardBody>
                  <DependencyGraph ativo={a} />
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Histórico de Manutenção"
                  actions={
                    <Button size="sm" variant="outline" icon={<Wrench className="h-4 w-4" />} onClick={() => setManutOpen(true)}>
                      Registrar
                    </Button>
                  }
                />
                <CardBody>
                  {a.manutencoes.length === 0 ? (
                    <EmptyState title="Nenhuma manutenção registrada" />
                  ) : (
                    <ol className="relative ml-3 space-y-5 border-l border-brand-border pl-6">
                      {a.manutencoes.map((m) => (
                        <li key={m.id} className="relative">
                          <span
                            aria-hidden
                            className={cn('absolute -left-[29px] top-1 h-3 w-3 rounded-full ring-4 ring-white', m.tipo === 'CORRETIVA' ? 'bg-status-critica' : 'bg-brand-accent')}
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-brand-darker">{m.descricao}</p>
                            <Badge tone={m.tipo === 'CORRETIVA' ? 'danger' : 'primary'}>{m.tipo === 'CORRETIVA' ? 'Corretiva' : 'Preventiva'}</Badge>
                          </div>
                          <p className="text-xs text-brand-muted">
                            {formatDate(m.realizadaEm)} · {m.responsavel} · {brl.format(m.custo)}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardBody>
              </Card>
            </>
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Informações Gerais" />
            <CardBody>
              <dl className="space-y-3 text-sm">
                {info.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-brand-muted">{k}</dt>
                    <dd className="text-right font-medium text-brand-darker">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
          {detalhado && (
            <Card>
              <CardHeader title="Chamados Vinculados" />
              <CardBody className="space-y-2">
                {a.chamadosVinculados.length === 0 && <p className="text-sm text-brand-muted">Nenhum chamado vinculado.</p>}
                {a.chamadosVinculados.map((c) => (
                  <Link key={c.id} href={`/chamados/${c.id}`} className="block rounded-md border border-brand-border p-3 hover:border-brand-accent">
                    <p className="text-xs font-bold text-brand-primary">#{c.id}</p>
                    <p className="text-sm font-medium text-brand-darker">{c.titulo}</p>
                    <div className="mt-1.5">
                      <StatusBadge status={c.status} />
                    </div>
                  </Link>
                ))}
              </CardBody>
            </Card>
          )}
        </aside>
      </div>

      <Modal
        open={manutOpen}
        onClose={fecharManutencao}
        title="Registrar Manutenção"
        footer={
          <>
            <Button variant="outline" onClick={fecharManutencao}>Cancelar</Button>
            <Button type="submit" form="form-manutencao" disabled={!manutValida} loading={addManut.isPending}>
              Salvar
            </Button>
          </>
        }
      >
        <form id="form-manutencao" onSubmit={onManutencao} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label="Descrição" required className="sm:col-span-2">
            {(fid) => <Input id={fid} maxLength={255} value={manut.descricao} onChange={(e) => setManut({ ...manut, descricao: e.target.value })} />}
          </Field>
          <Field label="Tipo">
            {(fid) => (
              <Select id={fid} value={manut.tipo} onChange={(e) => setManut({ ...manut, tipo: e.target.value as Manutencao['tipo'] })} options={[{ value: 'PREVENTIVA', label: 'Preventiva' }, { value: 'CORRETIVA', label: 'Corretiva' }]} />
            )}
          </Field>
          <Field label="Custo (R$)" error={custoValido ? undefined : 'Informe um valor maior ou igual a zero.'}>
            {(fid) => <Input id={fid} type="number" min={0} step="0.01" value={manut.custo} onChange={(e) => setManut({ ...manut, custo: Number(e.target.value) })} />}
          </Field>
          <Field label="Data" required>
            {(fid) => <Input id={fid} type="date" max={hoje()} value={manut.realizadaEm} onChange={(e) => setManut({ ...manut, realizadaEm: e.target.value })} />}
          </Field>
          <Field label="Responsável" required>
            {(fid) => <Input id={fid} maxLength={100} value={manut.responsavel} onChange={(e) => setManut({ ...manut, responsavel: e.target.value })} />}
          </Field>
        </form>
      </Modal>
    </>
  );
}
