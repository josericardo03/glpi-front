'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Download, Pencil, ShieldCheck, UserCheck, UserPlus, Users } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  ErrorState,
  Field,
  FilterBar,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatCard,
  UserCell,
  type BadgeTone,
  type Column,
} from '@/components/ui';
import { useDebounce, useFilters } from '@/hooks/use-filters';
import { getErrorMessage } from '@/lib/api';
import { perfilPrincipal } from '@/lib/backend/usuario.mapper';
import { exportCsv } from '@/lib/csv';
import { formatNumber } from '@/lib/format';
import type { Papel, StatusUsuario, Usuario, UsuarioInput } from '@/types';
import type { UsuarioFiltros } from '../cadastros.service';
import { useCreateUsuario, useDepartamentoOptions, useUpdateUsuario, useUsuarios } from '../use-cadastros';

const PAPEIS: { value: Papel; label: string; tone: BadgeTone }[] = [
  { value: 'ADMIN', label: 'Admin', tone: 'dark' },
  { value: 'GESTOR', label: 'Gestor', tone: 'pendente' },
  { value: 'TECNICO', label: 'Técnico', tone: 'primary' },
  { value: 'SOLICITANTE', label: 'Solicitante', tone: 'neutral' },
];
const PAPEL_TONE = Object.fromEntries(PAPEIS.map((p) => [p.value, p])) as Record<Papel, (typeof PAPEIS)[number]>;
const STATUS_USUARIO: Record<StatusUsuario, { label: string; tone: BadgeTone }> = {
  ATIVO: { label: 'Ativo', tone: 'success' },
  DESATIVADO: { label: 'Desativado', tone: 'neutral' },
  PENDENTE_CONFIRMACAO: { label: 'Pendente', tone: 'pendente' },
};
const STATUS_OPTIONS = (Object.keys(STATUS_USUARIO) as StatusUsuario[]).map((s) => ({ value: s, label: STATUS_USUARIO[s].label }));
const EMPTY: UsuarioInput = { nome: '', email: '', cargo: '', departamentoId: null, papeis: ['SOLICITANTE'], status: 'ATIVO', senha: '' };
const INITIAL: UsuarioFiltros = { page: 1, pageSize: 10, search: '', departamentoId: '', papel: '', status: '' };

export function UsuariosView() {
  const { filters, setFilter, reset } = useFilters(INITIAL);
  const search = useDebounce(filters.search);
  const { data, isLoading, isError, error, refetch } = useUsuarios({ ...filters, search });
  const departamentos = useDepartamentoOptions();
  const create = useCreateUsuario();
  const update = useUpdateUsuario();
  const [editing, setEditing] = useState<Usuario | 'new' | null>(null);
  const [form, setForm] = useState<UsuarioInput>(EMPTY);

  function openForm(u: Usuario | 'new') {
    setEditing(u);
    setForm(u === 'new' ? EMPTY : { nome: u.nome, email: u.email, cargo: u.cargo, departamentoId: u.departamentoId, papeis: [perfilPrincipal(u.papeis)], status: u.status });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const done = { onSuccess: () => setEditing(null) };
    if (editing === 'new') create.mutate(form, done);
    else if (editing) update.mutate({ id: editing.id, input: form }, done);
  }

  const columns = useMemo<Column<Usuario>[]>(
    () => [
      { key: 'usuario', header: 'Usuário', cell: (u) => <UserCell name={u.nome} subtitle={u.email} src={u.avatarUrl} /> },
      { key: 'dep', header: 'Departamento', cell: (u) => u.departamentoNome ?? '—' },
      { key: 'cargo', header: 'Cargo', cell: (u) => <span className="text-sm">{u.cargo}</span> },
      { key: 'perfil', header: 'Perfil', cell: (u) => <div className="flex flex-wrap gap-1">{u.papeis.map((p) => <Badge key={p} tone={PAPEL_TONE[p].tone}>{PAPEL_TONE[p].label}</Badge>)}</div> },
      { key: 'status', header: 'Status', cell: (u) => <Badge tone={STATUS_USUARIO[u.status].tone} dot>{STATUS_USUARIO[u.status].label}</Badge> },
      {
        key: 'acoes',
        header: <span className="sr-only">Ações</span>,
        align: 'right',
        cell: (u) => (
          <Button variant="ghost" size="icon" onClick={() => openForm(u)} aria-label={`Editar ${u.nome}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [],
  );

  const rows = data?.data ?? [];
  const valid = form.nome.trim() && /\S+@\S+\.\S+/.test(form.email) && form.papeis.length > 0 && (editing !== 'new' || (form.senha?.length ?? 0) >= 8);

  return (
    <>
      <PageHeader
        title="Gestão de Usuários"
        description="Cadastro de usuários, departamentos e papéis RBAC."
        actions={
          <Button size="lg" icon={<UserPlus className="h-4 w-4" />} onClick={() => openForm('new')}>
            Adicionar Usuário
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total de Usuários" value={data && formatNumber(data.total)} icon={<Users className="h-5 w-5" />} tone="dark" loading={isLoading} />
        <StatCard label="Administradores" value={rows.filter((u) => u.papeis.includes('ADMIN')).length} icon={<ShieldCheck className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Ativos" value={rows.filter((u) => u.status === 'ATIVO').length} icon={<UserCheck className="h-5 w-5" />} tone="success" loading={isLoading} />
      </div>

      <FilterBar
        actions={
          <>
            <Button variant="ghost" onClick={reset}>Limpar</Button>
            <Button
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={() =>
                exportCsv('usuarios', rows, [
                  { header: 'Nome', value: (u) => u.nome },
                  { header: 'E-mail', value: (u) => u.email },
                  { header: 'Departamento', value: (u) => u.departamentoNome },
                  { header: 'Cargo', value: (u) => u.cargo },
                  { header: 'Papéis', value: (u) => u.papeis.join(', ') },
                  { header: 'Status', value: (u) => u.status },
                ])
              }
            >
              CSV
            </Button>
          </>
        }
      >
        <Field label="Buscar">{(id) => <SearchInput id={id} placeholder="Nome ou e-mail" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} />}</Field>
        <Field label="Departamento">{(id) => <Select id={id} placeholder="Todos" options={departamentos} value={filters.departamentoId} onChange={(e) => setFilter('departamentoId', e.target.value ? Number(e.target.value) : '')} />}</Field>
        <Field label="Perfil">{(id) => <Select id={id} placeholder="Todos" options={PAPEIS} value={filters.papel} onChange={(e) => setFilter('papel', e.target.value as Papel | '')} />}</Field>
        <Field label="Status">
          {(id) => <Select id={id} placeholder="Todos" options={STATUS_OPTIONS} value={filters.status} onChange={(e) => setFilter('status', e.target.value as StatusUsuario | '')} />}
        </Field>
      </FilterBar>

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          data={data?.data}
          loading={isLoading}
          rowKey={(u) => u.id}
          rowClassName={(u) => (u.status === 'DESATIVADO' ? 'opacity-60' : undefined)}
          footer={data && <Pagination page={filters.page!} pageSize={filters.pageSize!} total={data.total} onPageChange={(p) => setFilter('page', p)} label="usuários" />}
        />
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Novo Usuário' : 'Editar Usuário'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button type="submit" form="form-usuario" disabled={!valid} loading={create.isPending || update.isPending}>Salvar</Button>
          </>
        }
      >
        <form id="form-usuario" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo" required className="sm:col-span-2">{(id) => <Input id={id} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />}</Field>
          <Field label="E-mail corporativo" required hint={editing !== 'new' ? 'O e-mail não pode ser alterado.' : undefined}>
            {(id) => <Input id={id} type="email" value={form.email} disabled={editing !== 'new'} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
          </Field>
          <Field label="Cargo">{(id) => <Input id={id} value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />}</Field>
          <Field label="Departamento">
            {(id) => <Select id={id} placeholder="Nenhum" options={departamentos} value={form.departamentoId ?? ''} onChange={(e) => setForm({ ...form, departamentoId: e.target.value ? Number(e.target.value) : null })} />}
          </Field>
          <Field label="Status">
            {(id) => <Select id={id} options={STATUS_OPTIONS} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusUsuario })} />}
          </Field>
          <Field label="Perfil (RBAC)" required hint="Hierárquico: Admin > Gestor > Técnico > Solicitante." className="sm:col-span-2">
            {(id) => <Select id={id} options={PAPEIS} value={form.papeis[0]} onChange={(e) => setForm({ ...form, papeis: [e.target.value as Papel] })} />}
          </Field>
          {editing === 'new' && (
            <Field label="Senha inicial" required hint="Mínimo de 8 caracteres." className="sm:col-span-2">
              {(id) => <Input id={id} type="password" autoComplete="new-password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />}
            </Field>
          )}
        </form>
      </Modal>
    </>
  );
}
