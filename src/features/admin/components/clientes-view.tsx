'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Building, Check, Globe, Plus, Sparkles, Users } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { Cliente, ClienteInput } from '@/types';
import { useClientes, useCreateCliente } from '../use-admin';

const DOMINIO_SUFIXO = '.portal-itsm.com.br';

const PLANOS: Record<Cliente['plano'], { label: string; tone: BadgeTone; desc: string }> = {
  BASICO: { label: 'Básico', tone: 'neutral', desc: 'Até 50 usuários · Service Desk' },
  PROFISSIONAL: { label: 'Profissional', tone: 'primary', desc: 'Até 500 usuários · SLA + CMDB' },
  ENTERPRISE: { label: 'Enterprise', tone: 'dark', desc: 'Ilimitado · Integrações + Auditoria' },
};

const STATUS: Record<Cliente['status'], { label: string; tone: BadgeTone }> = {
  ATIVO: { label: 'Ativo', tone: 'success' },
  TRIAL: { label: 'Trial', tone: 'pendente' },
  SUSPENSO: { label: 'Suspenso', tone: 'danger' },
};

const columns: Column<Cliente>[] = [
  { key: 'nome', header: 'Cliente', cell: (c) => <CellStack title={c.nomeFantasia} subtitle={c.razaoSocial} /> },
  { key: 'cnpj', header: 'CNPJ', cell: (c) => <span className="font-mono text-xs">{c.cnpj}</span> },
  { key: 'dominio', header: 'Domínio', cell: (c) => <span className="inline-flex items-center gap-1 text-xs text-brand-accent"><Globe className="h-3.5 w-3.5" />{c.dominio}</span> },
  { key: 'plano', header: 'Plano', cell: (c) => <Badge tone={PLANOS[c.plano].tone}>{PLANOS[c.plano].label}</Badge> },
  { key: 'usuarios', header: 'Usuários', align: 'right', cell: (c) => <span className="font-semibold">{formatNumber(c.totalUsuarios)}</span> },
  { key: 'status', header: 'Status', cell: (c) => <Badge tone={STATUS[c.status].tone} dot>{STATUS[c.status].label}</Badge> },
  { key: 'criado', header: 'Desde', cell: (c) => <span className="text-xs text-brand-muted">{formatDate(c.criadoEm)}</span> },
];

const EMPTY: ClienteInput = { razaoSocial: '', nomeFantasia: '', cnpj: '', dominio: '', plano: 'PROFISSIONAL' };

const slugify = (v: string) =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);

export function ClientesView() {
  const { data, isLoading, isError, error, refetch } = useClientes();
  const create = useCreateCliente();
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('');
  const search = useDebounce(term, 200);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClienteInput>(EMPTY);
  const [slug, setSlug] = useState('');

  const lista = useMemo(
    () => (data ?? []).filter((c) => (matches(c.nomeFantasia, search) || matches(c.razaoSocial, search) || matches(c.cnpj, search)) && (!status || c.status === status)),
    [data, search, status],
  );
  const usuarios = data?.reduce((s, c) => s + c.totalUsuarios, 0);
  const cnpjOk = isValidCnpj(form.cnpj);

  function close() {
    setOpen(false);
    setForm(EMPTY);
    setSlug('');
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate({ ...form, dominio: `${slug}${DOMINIO_SUFIXO}` }, { onSuccess: close });
  }

  return (
    <>
      <PageHeader
        title="Clientes (Tenants)"
        description="Gerencie as organizações atendidas pela plataforma multi-tenant, seus planos e domínios."
        breadcrumbs={[{ label: 'Administração' }, { label: 'Clientes' }]}
        actions={<Button size="lg" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Novo Cliente</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Tenants" value={data?.length} icon={<Building className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Ativos" value={data?.filter((c) => c.status === 'ATIVO').length} icon={<Check className="h-5 w-5" />} tone="success" loading={isLoading} />
        <StatCard label="Em Trial" value={data?.filter((c) => c.status === 'TRIAL').length} icon={<Sparkles className="h-5 w-5" />} tone="warning" loading={isLoading} />
        <StatCard label="Usuários na Plataforma" value={usuarios !== undefined ? formatNumber(usuarios) : undefined} icon={<Users className="h-5 w-5" />} tone="dark" loading={isLoading} />
      </div>

      <FilterBar>
        <SearchInput placeholder="Buscar por nome, razão social ou CNPJ..." value={term} onChange={(e) => setTerm(e.target.value)} />
        <Select
          aria-label="Status"
          placeholder="Todos os status"
          options={(Object.keys(STATUS) as Cliente['status'][]).map((s) => ({ value: s, label: STATUS[s].label }))}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
      </FilterBar>

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : (
        <DataTable columns={columns} data={lista} loading={isLoading} rowKey={(c) => c.id} />
      )}

      <Modal
        open={open}
        onClose={close}
        size="lg"
        title="Novo Cliente"
        description="Um tenant isolado será provisionado com domínio próprio e status Trial."
        footer={
          <>
            <Button variant="outline" onClick={close}>Cancelar</Button>
            <Button type="submit" form="form-cliente" disabled={!form.razaoSocial.trim() || !form.nomeFantasia.trim() || !cnpjOk || !slug} loading={create.isPending}>
              Provisionar Tenant
            </Button>
          </>
        }
      >
        <form id="form-cliente" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Razão Social" required className="sm:col-span-2">
            {(id) => <Input id={id} value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} />}
          </Field>
          <Field label="Nome Fantasia" required>
            {(id) => (
              <Input
                id={id}
                value={form.nomeFantasia}
                onChange={(e) => {
                  const nomeFantasia = e.target.value;
                  if (!slug || slug === slugify(form.nomeFantasia)) setSlug(slugify(nomeFantasia));
                  setForm({ ...form, nomeFantasia });
                }}
              />
            )}
          </Field>
          <Field label="CNPJ" required error={form.cnpj.length === 18 && !cnpjOk ? 'CNPJ inválido.' : undefined}>
            {(id) => (
              <Input id={id} value={form.cnpj} inputMode="numeric" placeholder="00.000.000/0000-00" className="font-mono" invalid={form.cnpj.length === 18 && !cnpjOk} onChange={(e) => setForm({ ...form, cnpj: maskCnpj(e.target.value) })} />
            )}
          </Field>
          <Field label="Subdomínio" required hint="Somente letras minúsculas, números e hífen." className="sm:col-span-2">
            {(id) => (
              <div className="flex">
                <Input id={id} value={slug} className="rounded-r-none font-mono" onChange={(e) => setSlug(slugify(e.target.value))} />
                <span className="flex items-center rounded-r-md border border-l-0 border-brand-border bg-slate-50 px-3 font-mono text-xs text-brand-muted">{DOMINIO_SUFIXO}</span>
              </div>
            )}
          </Field>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Plano</p>
            <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(PLANOS) as Cliente['plano'][]).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={form.plano === p}
                  onClick={() => setForm({ ...form, plano: p })}
                  className={cn(
                    'rounded-lg border p-3 text-left transition',
                    form.plano === p ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-accent/20' : 'border-brand-border hover:border-slate-300',
                  )}
                >
                  <p className="text-sm font-semibold text-brand-darker">{PLANOS[p].label}</p>
                  <p className="mt-0.5 text-xs text-brand-muted">{PLANOS[p].desc}</p>
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
