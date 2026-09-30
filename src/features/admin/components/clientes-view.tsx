'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Ban, Building, Check, Plus, Users } from 'lucide-react';
import {
  Badge,
  Button,
  CellStack,
  DataTable,
  ErrorState,
  Field,
  FilterBar,
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
import { isValidCnpj, maskCnpj } from '@/lib/cnpj';
import { formatDate, formatNumber } from '@/lib/format';
import { matches } from '@/lib/http';
import { textoInvalido } from '@/lib/validation';
import type { Cliente, ClienteInput } from '@/types';
import { useClientes, useCreateCliente } from '../use-admin';

const STATUS: Record<Cliente['status'], { label: string; tone: BadgeTone }> = {
  ATIVO: { label: 'Ativo', tone: 'success' },
  BLOQUEADO: { label: 'Bloqueado', tone: 'danger' },
  INATIVO: { label: 'Inativo', tone: 'neutral' },
};
const STATUS_OPTIONS = (Object.keys(STATUS) as Cliente['status'][]).map((s) => ({ value: s, label: STATUS[s].label }));

const columns: Column<Cliente>[] = [
  { key: 'nome', header: 'Cliente', cell: (c) => <CellStack title={c.nomeFantasia} subtitle={c.razaoSocial} /> },
  { key: 'cnpj', header: 'CNPJ', cell: (c) => <span className="font-mono text-xs">{c.cnpj}</span> },
  { key: 'usuarios', header: 'Usuários', align: 'right', cell: (c) => <span className="font-semibold">{c.totalUsuarios === null ? '—' : formatNumber(c.totalUsuarios)}</span> },
  { key: 'status', header: 'Status', cell: (c) => <Badge tone={STATUS[c.status].tone} dot>{STATUS[c.status].label}</Badge> },
  { key: 'criado', header: 'Contratação', cell: (c) => <span className="text-xs text-brand-muted">{formatDate(c.criadoEm)}</span> },
];

const EMPTY: ClienteInput = { razaoSocial: '', nomeFantasia: '', cnpj: '', status: 'ATIVO' };

export function ClientesView() {
  const { data, isLoading, isError, error, refetch } = useClientes();
  const create = useCreateCliente();
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('');
  const search = useDebounce(term, 200);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClienteInput>(EMPTY);

  const lista = useMemo(
    () => (data ?? []).filter((c) => (matches(c.nomeFantasia, search) || matches(c.razaoSocial, search) || matches(c.cnpj, search)) && (!status || c.status === status)),
    [data, search, status],
  );
  const usuarios = data?.reduce((s, c) => s + (c.totalUsuarios ?? 0), 0);
  /** A API só informa a contagem de usuários do tenant da sessão. */
  const contagemParcial = data?.some((c) => c.totalUsuarios === null);
  const cnpjOk = isValidCnpj(form.cnpj);
  const erros = {
    razaoSocial: form.razaoSocial ? textoInvalido(form.razaoSocial, { rotulo: 'A razão social', max: 150 }) : undefined,
    nomeFantasia: form.nomeFantasia ? textoInvalido(form.nomeFantasia, { rotulo: 'O nome fantasia' }) : undefined,
  };
  const valido = !textoInvalido(form.razaoSocial, { max: 150 }) && !textoInvalido(form.nomeFantasia) && cnpjOk;

  function close() {
    setOpen(false);
    setForm(EMPTY);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    create.mutate({ ...form, razaoSocial: form.razaoSocial.trim(), nomeFantasia: form.nomeFantasia.trim() }, { onSuccess: close });
  }

  return (
    <>
      <PageHeader
        title="Clientes (Tenants)"
        description="Gerencie as organizações atendidas pela plataforma multi-tenant."
        breadcrumbs={[{ label: 'Administração' }, { label: 'Clientes' }]}
        actions={<Button size="lg" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Novo Cliente</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Tenants" value={data?.length} icon={<Building className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Ativos" value={data?.filter((c) => c.status === 'ATIVO').length} icon={<Check className="h-5 w-5" />} tone="success" loading={isLoading} />
        <StatCard label="Bloqueados" value={data?.filter((c) => c.status === 'BLOQUEADO').length} icon={<Ban className="h-5 w-5" />} tone="warning" loading={isLoading} />
        <StatCard
          label={contagemParcial ? 'Usuários no Seu Tenant' : 'Usuários na Plataforma'}
          value={usuarios !== undefined ? formatNumber(usuarios) : undefined}
          icon={<Users className="h-5 w-5" />}
          tone="dark"
          loading={isLoading}
        />
      </div>

      <FilterBar>
        <SearchInput aria-label="Buscar clientes" placeholder="Buscar por nome, razão social ou CNPJ..." value={term} onChange={(e) => setTerm(e.target.value)} />
        <Select
          aria-label="Status"
          placeholder="Todos os status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
      </FilterBar>

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : (
        <DataTable columns={columns} data={lista} loading={isLoading} caption="Clientes" rowKey={(c) => c.id} emptyMessage="Nenhum cliente encontrado." />
      )}

      <Modal
        open={open}
        onClose={close}
        size="lg"
        title="Novo Cliente"
        description="Um tenant isolado será provisionado para a organização."
        footer={
          <>
            <Button variant="outline" onClick={close}>Cancelar</Button>
            <Button type="submit" form="form-cliente" disabled={!valido} loading={create.isPending}>
              Provisionar Tenant
            </Button>
          </>
        }
      >
        <form id="form-cliente" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label="Razão Social" required error={erros.razaoSocial} className="sm:col-span-2">
            {(id) => <Input id={id} maxLength={150} value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} />}
          </Field>
          <Field label="Nome Fantasia" required error={erros.nomeFantasia}>
            {(id) => (
              <Input id={id} value={form.nomeFantasia} maxLength={100} onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })} />
            )}
          </Field>
          <Field label="CNPJ" required error={form.cnpj.length === 18 && !cnpjOk ? 'CNPJ inválido.' : undefined}>
            {(id) => (
              <Input id={id} value={form.cnpj} inputMode="numeric" placeholder="00.000.000/0000-00" className="font-mono" onChange={(e) => setForm({ ...form, cnpj: maskCnpj(e.target.value) })} />
            )}
          </Field>
          <Field label="Status inicial">
            {(id) => <Select id={id} options={STATUS_OPTIONS} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Cliente['status'] })} />}
          </Field>
        </form>
      </Modal>
    </>
  );
}
