'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Building2, Info, LayoutGrid, List, Plus, Sparkles, TrendingUp, Users } from 'lucide-react';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  DataTable,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  Progress,
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
import type { Departamento, DepartamentoInput } from '@/types';
import { useCreateDepartamento, useDepartamentos, useUsuarioOptions } from '../use-cadastros';

const STATUS: Record<Departamento['status'], { label: string; tone: BadgeTone }> = {
  ATIVO: { label: 'Ativo', tone: 'success' },
  REVISAO: { label: 'Revisão', tone: 'pendente' },
  INATIVO: { label: 'Inativo', tone: 'neutral' },
};

const columns: Column<Departamento>[] = [
  { key: 'sigla', header: 'Código/Sigla', cell: (d) => <span className="font-mono font-bold">{d.sigla}</span> },
  { key: 'nome', header: 'Nome do Departamento', cell: (d) => <div><p className="font-semibold">{d.nome}</p><p className="text-xs text-brand-muted">{d.descricao}</p></div> },
  { key: 'usuarios', header: 'Usuários', align: 'center', cell: (d) => <span className="text-lg font-bold">{d.totalUsuarios}</span> },
  { key: 'gestor', header: 'Responsável', cell: (d) => d.gestorNome ?? '—' },
  { key: 'status', header: 'Status', cell: (d) => <Badge tone={STATUS[d.status].tone}>{STATUS[d.status].label}</Badge> },
];

const EMPTY: DepartamentoInput = { sigla: '', nome: '', descricao: '', gestorId: null, departamentoPaiId: null };

export function DepartamentosView() {
  const { data, isLoading, isError, error, refetch } = useDepartamentos();
  const usuarios = useUsuarioOptions();
  const create = useCreateDepartamento();
  const [term, setTerm] = useState('');
  const search = useDebounce(term, 200);
  const [layout, setLayout] = useState<'lista' | 'grade'>('lista');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DepartamentoInput>(EMPTY);

  const lista = useMemo(() => (data ?? []).filter((d) => matches(d.nome, search) || matches(d.sigla, search)), [data, search]);
  const totalUsuarios = data?.reduce((s, d) => s + d.totalUsuarios, 0) ?? 0;
  const maisAtivo = data?.slice().sort((a, b) => b.totalUsuarios - a.totalUsuarios)[0];
  const paiOptions = (data ?? []).map((d) => ({ value: d.id, label: `${d.sigla} · ${d.nome}` }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate(form, { onSuccess: () => { setOpen(false); setForm(EMPTY); } });
  }

  return (
    <>
      <PageHeader
        title="Gestão de Departamentos"
        description="Visualize, gerencie e organize os setores da instituição."
        actions={<Button size="lg" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Novo Departamento</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total de Departamentos" value={data?.length} icon={<Building2 className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Usuários Alocados" value={totalUsuarios} icon={<Users className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Setor Mais Ativo" value={<span className="block truncate text-lg">{maisAtivo?.nome ?? '—'}</span>} icon={<TrendingUp className="h-5 w-5" />} loading={isLoading} footer={maisAtivo && `${maisAtivo.totalUsuarios} usuários`} />
        <StatCard label="Status Médio" value="75%" loading={isLoading} footer={<><Progress value={75} tone="dark" className="mb-1" />Operacionalidade ideal</>} />
      </div>

      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-center gap-3 p-3">
          <SearchInput placeholder="Buscar departamento por nome ou sigla..." value={term} onChange={(e) => setTerm(e.target.value)} className="min-w-[280px]" />
          <div className="ml-auto flex items-center gap-2 text-sm text-brand-muted">
            Visualização:
            {(['lista', 'grade'] as const).map((l) => (
              <button key={l} onClick={() => setLayout(l)} aria-pressed={layout === l} className={cn('rounded-md border p-2', layout === l ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-border bg-white')}>
                {l === 'lista' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : layout === 'lista' ? (
        <DataTable columns={columns} data={lista} loading={isLoading} rowKey={(d) => d.id} />
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
                <p className="text-xs text-brand-muted">{d.descricao}</p>
                <div className="mt-4 flex justify-between text-sm">
                  <span className="text-brand-muted">{d.gestorNome}</span>
                  <strong>{d.totalUsuarios} usuários</strong>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Callout tone="dark" title="Hierarquia de Departamentos" icon={<Info className="h-5 w-5" />}>
          Ao criar um setor você pode definir um “Departamento Pai” para organizar melhor o organograma da instituição.
        </Callout>
        <Callout tone="info" title="Relatórios Automáticos" icon={<Sparkles className="h-5 w-5" />}>
          A exportação de dados por departamento permite agendamento mensal direto para o e-mail do gestor responsável.
        </Callout>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo Departamento"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" form="form-dep" disabled={!form.sigla.trim() || !form.nome.trim()} loading={create.isPending}>Salvar</Button>
          </>
        }
      >
        <form id="form-dep" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <Field label="Sigla" required hint="Convertida para maiúsculas.">
            {(id) => <Input id={id} value={form.sigla} maxLength={12} className="font-mono uppercase" onChange={(e) => setForm({ ...form, sigla: e.target.value.toUpperCase().replace(/\s/g, '') })} />}
          </Field>
          <Field label="Nome" required>{(id) => <Input id={id} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />}</Field>
          <Field label="Gestor Responsável" className="sm:col-span-2">
            {(id) => <Select id={id} placeholder="Selecione..." options={usuarios} value={form.gestorId ?? ''} onChange={(e) => setForm({ ...form, gestorId: e.target.value ? Number(e.target.value) : null })} />}
          </Field>
          <Field label="Departamento Pai" className="sm:col-span-2">
            {(id) => <Select id={id} placeholder="Nenhum (raiz)" options={paiOptions} value={form.departamentoPaiId ?? ''} onChange={(e) => setForm({ ...form, departamentoPaiId: e.target.value ? Number(e.target.value) : null })} />}
          </Field>
        </form>
      </Modal>
    </>
  );
}
