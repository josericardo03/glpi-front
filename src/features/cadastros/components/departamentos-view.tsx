'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Building2, LayoutGrid, List, Network, Plus, TrendingUp, Users } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  StatCard,
  type BadgeTone,
  type Column,
} from '@/components/ui';
import { useDebounce } from '@/hooks/use-filters';
import { getErrorMessage } from '@/lib/api';
import { matches } from '@/lib/http';
import { cn } from '@/lib/utils';
import { textoInvalido } from '@/lib/validation';
import type { AtivoInativo, Departamento, DepartamentoInput } from '@/types';
import { useCreateDepartamento, useDepartamentos, useUsuarioOptions } from '../use-cadastros';

const STATUS: Record<AtivoInativo, { label: string; tone: BadgeTone }> = {
  ATIVO: { label: 'Ativo', tone: 'success' },
  INATIVO: { label: 'Inativo', tone: 'neutral' },
};

const EMPTY: DepartamentoInput = { sigla: '', nome: '', gestorId: null, departamentoPaiId: null };

function validar(form: DepartamentoInput, siglasEmUso: Set<string>) {
  const sigla = form.sigla.trim().toUpperCase();
  return {
    sigla: textoInvalido(sigla, { rotulo: 'A sigla', max: 20 }) ?? (siglasEmUso.has(sigla) ? `A sigla ${sigla} já está em uso.` : undefined),
    nome: textoInvalido(form.nome, { rotulo: 'O nome' }),
  };
}

export function DepartamentosView() {
  const { data, isLoading, isError, error, refetch } = useDepartamentos();
  const usuarios = useUsuarioOptions();
  const create = useCreateDepartamento();
  const [term, setTerm] = useState('');
  const search = useDebounce(term, 200);
  const [layout, setLayout] = useState<'lista' | 'grade'>('lista');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DepartamentoInput>(EMPTY);

  const porId = useMemo(() => new Map((data ?? []).map((d) => [d.id, d])), [data]);
  const lista = useMemo(() => (data ?? []).filter((d) => matches(d.nome, search) || matches(d.sigla, search)), [data, search]);
  const siglasEmUso = useMemo(() => new Set((data ?? []).map((d) => d.sigla.toUpperCase())), [data]);
  const totalUsuarios = data?.reduce((s, d) => s + d.totalUsuarios, 0) ?? 0;
  const maisPopuloso = data?.length ? data.reduce((a, b) => (b.totalUsuarios > a.totalUsuarios ? b : a)) : undefined;
  const subordinados = data?.filter((d) => d.departamentoPaiId).length ?? 0;
  const paiOptions = (data ?? []).filter((d) => d.status === 'ATIVO').map((d) => ({ value: d.id, label: `${d.sigla} · ${d.nome}` }));
  const erros = validar(form, siglasEmUso);
  const valido = !erros.sigla && !erros.nome;

  const columns = useMemo<Column<Departamento>[]>(
    () => [
      { key: 'sigla', header: 'Código/Sigla', cell: (d) => <span className="font-mono font-bold">{d.sigla}</span> },
      {
        key: 'nome',
        header: 'Nome do Departamento',
        cell: (d) => {
          const pai = d.departamentoPaiId ? porId.get(d.departamentoPaiId) : undefined;
          return (
            <div>
              <p className="font-semibold">{d.nome}</p>
              {(pai || d.descricao) && <p className="text-xs text-brand-muted">{pai ? `Subordinado a ${pai.sigla}` : d.descricao}</p>}
            </div>
          );
        },
      },
      { key: 'usuarios', header: 'Usuários', align: 'center', cell: (d) => <span className="text-lg font-bold">{d.totalUsuarios}</span> },
      { key: 'gestor', header: 'Responsável', cell: (d) => d.gestorNome ?? '—' },
      { key: 'status', header: 'Status', cell: (d) => <Badge tone={STATUS[d.status].tone}>{STATUS[d.status].label}</Badge> },
    ],
    [porId],
  );

  function fechar() {
    setOpen(false);
    setForm(EMPTY);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    create.mutate(form, { onSuccess: fechar });
  }

  return (
    <>
      <PageHeader
        title="Gestão de Departamentos"
        description="Visualize, gerencie e organize os setores da instituição."
        actions={
          <Button size="lg" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Novo Departamento
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total de Departamentos" value={data?.length} icon={<Building2 className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Usuários Alocados" value={totalUsuarios} icon={<Users className="h-5 w-5" />} loading={isLoading} />
        <StatCard
          label="Maior Departamento"
          value={<span className="block truncate text-lg">{maisPopuloso?.nome ?? '—'}</span>}
          icon={<TrendingUp className="h-5 w-5" />}
          loading={isLoading}
          footer={maisPopuloso && `${maisPopuloso.totalUsuarios} ${maisPopuloso.totalUsuarios === 1 ? 'usuário' : 'usuários'}`}
        />
        <StatCard label="Subdepartamentos" value={subordinados} icon={<Network className="h-5 w-5" />} loading={isLoading} footer="Vinculados a um departamento pai" />
      </div>

      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-center gap-3 p-3">
          <SearchInput
            aria-label="Buscar departamento"
            placeholder="Buscar departamento por nome ou sigla..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="min-w-[280px]"
          />
          <div className="ml-auto flex items-center gap-2 text-sm text-brand-muted" role="group" aria-label="Modo de visualização">
            Visualização:
            {(['lista', 'grade'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLayout(l)}
                aria-pressed={layout === l}
                aria-label={l === 'lista' ? 'Lista' : 'Grade'}
                className={cn('rounded-md border p-2', layout === l ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-border bg-white')}
              >
                {l === 'lista' ? <List className="h-4 w-4" aria-hidden /> : <LayoutGrid className="h-4 w-4" aria-hidden />}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : layout === 'lista' ? (
        <DataTable columns={columns} data={lista} loading={isLoading} caption="Departamentos" rowKey={(d) => d.id} emptyMessage="Nenhum departamento encontrado." />
      ) : !isLoading && !lista.length ? (
        <EmptyState title="Nenhum departamento encontrado" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((d) => (
            <Card key={d.id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <span className="font-mono text-sm font-bold text-brand-primary">{d.sigla}</span>
                  <Badge tone={STATUS[d.status].tone}>{STATUS[d.status].label}</Badge>
                </div>
                <p className="mt-2 font-semibold text-brand-darker">{d.nome}</p>
                {d.descricao && <p className="text-xs text-brand-muted">{d.descricao}</p>}
                <div className="mt-4 flex justify-between text-sm">
                  <span className="text-brand-muted">{d.gestorNome ?? 'Sem responsável'}</span>
                  <strong>
                    {d.totalUsuarios} {d.totalUsuarios === 1 ? 'usuário' : 'usuários'}
                  </strong>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={fechar}
        title="Novo Departamento"
        description="Defina um departamento pai para montar o organograma da instituição."
        footer={
          <>
            <Button variant="outline" onClick={fechar}>Cancelar</Button>
            <Button type="submit" form="form-dep" disabled={!valido} loading={create.isPending}>
              Salvar
            </Button>
          </>
        }
      >
        <form id="form-dep" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <Field label="Sigla" required error={form.sigla ? erros.sigla : undefined} hint="Até 20 caracteres, sem espaços.">
            {(id) => (
              <Input
                id={id}
                value={form.sigla}
                maxLength={20}
                className="font-mono uppercase"
                onChange={(e) => setForm({ ...form, sigla: e.target.value.toUpperCase().replace(/\s/g, '') })}
              />
            )}
          </Field>
          <Field label="Nome" required error={form.nome ? erros.nome : undefined}>
            {(id) => <Input id={id} maxLength={100} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />}
          </Field>
          <Field label="Gestor Responsável" className="sm:col-span-2">
            {(id) => (
              <Select
                id={id}
                placeholder="Selecione..."
                options={usuarios}
                value={form.gestorId ?? ''}
                onChange={(e) => setForm({ ...form, gestorId: e.target.value ? Number(e.target.value) : null })}
              />
            )}
          </Field>
          <Field label="Departamento Pai" className="sm:col-span-2">
            {(id) => (
              <Select
                id={id}
                placeholder="Nenhum (raiz)"
                options={paiOptions}
                value={form.departamentoPaiId ?? ''}
                onChange={(e) => setForm({ ...form, departamentoPaiId: e.target.value ? Number(e.target.value) : null })}
              />
            )}
          </Field>
        </form>
      </Modal>
    </>
  );
}
