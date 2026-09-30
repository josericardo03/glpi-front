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
import { useAuth } from '@/features/auth/auth-provider';
import { useDebounce, useFilters } from '@/hooks/use-filters';
import { getErrorMessage } from '@/lib/api';
import { PAPEL_LABEL, perfilPrincipal } from '@/lib/backend/usuario.mapper';
import { exportCsv } from '@/lib/csv';
import { formatNumber } from '@/lib/format';
import { paginate } from '@/lib/http';
import { isEmail, semErros, senhaInvalida, textoInvalido } from '@/lib/validation';
import type { Papel, StatusUsuario, Usuario, UsuarioInput } from '@/types';
import type { UsuarioFiltros } from '../cadastros.service';
import { useCreateUsuario, useDepartamentoOptions, useUpdateUsuario, useUsuarios } from '../use-cadastros';

const PAPEL_TONE: Record<Papel, BadgeTone> = { ADMIN: 'dark', GESTOR: 'pendente', TECNICO: 'primary', SOLICITANTE: 'neutral' };
const PAPEIS = (Object.keys(PAPEL_TONE) as Papel[]).map((p) => ({ value: p, label: PAPEL_LABEL[p] }));
const STATUS_USUARIO: Record<StatusUsuario, { label: string; tone: BadgeTone }> = {
  ATIVO: { label: 'Ativo', tone: 'success' },
  DESATIVADO: { label: 'Desativado', tone: 'neutral' },
  PENDENTE_CONFIRMACAO: { label: 'Pendente', tone: 'pendente' },
};
const STATUS_OPTIONS = (Object.keys(STATUS_USUARIO) as StatusUsuario[]).map((s) => ({ value: s, label: STATUS_USUARIO[s].label }));
const EMPTY: UsuarioInput = { nome: '', email: '', cargo: '', departamentoId: null, papeis: ['SOLICITANTE'], status: 'ATIVO', senha: '' };
const INITIAL: UsuarioFiltros = { page: 1, pageSize: 10, search: '', departamentoId: '', papel: '', status: '' };

function validar(form: UsuarioInput, novo: boolean) {
  return {
    nome: textoInvalido(form.nome, { rotulo: 'O nome' }),
    email: novo && !isEmail(form.email) ? 'Informe um e-mail válido.' : undefined,
    cargo: textoInvalido(form.cargo, { rotulo: 'O cargo' }),
    senha: novo || form.senha ? senhaInvalida(form.senha ?? '') : undefined,
  };
}

export function UsuariosView() {
  const { user, updateUser } = useAuth();
  const { filters, setFilter, reset } = useFilters(INITIAL);
  const search = useDebounce(filters.search);
  const { page = 1, pageSize = 10, ...criterios } = filters;
  const { data: todos, isLoading, isError, error, refetch } = useUsuarios({ ...criterios, search });
  const departamentos = useDepartamentoOptions();
  const create = useCreateUsuario();
  const update = useUpdateUsuario();
  const [editing, setEditing] = useState<Usuario | 'new' | null>(null);
  const [form, setForm] = useState<UsuarioInput>(EMPTY);
  const [tocado, setTocado] = useState(false);

  const novo = editing === 'new';
  const erros = validar(form, novo);
  const mostrar = (campo: keyof typeof erros) => (tocado ? erros[campo] : undefined);

  function openForm(u: Usuario | 'new') {
    setEditing(u);
    setTocado(false);
    setForm(
      u === 'new'
        ? EMPTY
        : { nome: u.nome, email: u.email, cargo: u.cargo, departamentoId: u.departamentoId, papeis: [perfilPrincipal(u.papeis)], status: u.status, senha: '' },
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTocado(true);
    if (!semErros(erros)) return;
    if (novo) create.mutate(form, { onSuccess: () => setEditing(null) });
    else if (editing) {
      const { email: _email, ...alteracoes } = form;
      update.mutate(
        { id: editing.id, input: { ...alteracoes, senha: form.senha || undefined } },
        {
          onSuccess: (u) => {
            if (u.id === user?.id) updateUser(u);
            setEditing(null);
          },
        },
      );
    }
  }

  const columns = useMemo<Column<Usuario>[]>(
    () => [
      { key: 'usuario', header: 'Usuário', cell: (u) => <UserCell name={u.nome} subtitle={u.email} src={u.avatarUrl} /> },
      { key: 'dep', header: 'Departamento', cell: (u) => u.departamentoNome ?? '—' },
      { key: 'cargo', header: 'Cargo', cell: (u) => <span className="text-sm">{u.cargo || '—'}</span> },
      {
        key: 'perfil',
        header: 'Perfil',
        cell: (u) => {
          const p = perfilPrincipal(u.papeis);
          return <Badge tone={PAPEL_TONE[p]}>{PAPEL_LABEL[p]}</Badge>;
        },
      },
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

  const lista = todos ?? [];
  const pagina = paginate(lista, page, pageSize);
  const editandoASiMesmo = editing !== 'new' && editing?.id === user?.id;

  return (
    <>
      <PageHeader
        title="Gestão de Usuários"
        description="Cadastro de usuários, departamentos e perfis de acesso."
        actions={
          <Button size="lg" icon={<UserPlus className="h-4 w-4" />} onClick={() => openForm('new')}>
            Adicionar Usuário
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Usuários (filtro atual)" value={todos && formatNumber(lista.length)} icon={<Users className="h-5 w-5" />} tone="dark" loading={isLoading} />
        <StatCard label="Administradores" value={todos && lista.filter((u) => u.papeis.includes('ADMIN')).length} icon={<ShieldCheck className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Ativos" value={todos && lista.filter((u) => u.status === 'ATIVO').length} icon={<UserCheck className="h-5 w-5" />} tone="success" loading={isLoading} />
      </div>

      <FilterBar
        actions={
          <>
            <Button variant="ghost" onClick={reset}>Limpar</Button>
            <Button
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              disabled={!lista.length}
              onClick={() =>
                exportCsv('usuarios', lista, [
                  { header: 'Nome', value: (u) => u.nome },
                  { header: 'E-mail', value: (u) => u.email },
                  { header: 'Departamento', value: (u) => u.departamentoNome },
                  { header: 'Cargo', value: (u) => u.cargo },
                  { header: 'Perfil', value: (u) => PAPEL_LABEL[perfilPrincipal(u.papeis)] },
                  { header: 'Status', value: (u) => STATUS_USUARIO[u.status].label },
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
          data={todos ? pagina.data : undefined}
          loading={isLoading}
          caption="Usuários cadastrados"
          rowKey={(u) => u.id}
          rowClassName={(u) => (u.status === 'DESATIVADO' ? 'opacity-60' : undefined)}
          footer={todos && <Pagination page={pagina.page} pageSize={pageSize} total={pagina.total} onPageChange={(p) => setFilter('page', p)} label="usuários" />}
        />
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={novo ? 'Novo Usuário' : 'Editar Usuário'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button type="submit" form="form-usuario" loading={create.isPending || update.isPending}>Salvar</Button>
          </>
        }
      >
        <form id="form-usuario" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo" required error={mostrar('nome')} className="sm:col-span-2">
            {(id) => <Input id={id} maxLength={100} autoComplete="off" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />}
          </Field>
          <Field label="E-mail corporativo" required error={mostrar('email')} hint={novo ? undefined : 'O e-mail não pode ser alterado.'}>
            {(id) => <Input id={id} type="email" autoComplete="off" value={form.email} disabled={!novo} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
          </Field>
          <Field label="Cargo" required error={mostrar('cargo')}>
            {(id) => <Input id={id} maxLength={100} value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />}
          </Field>
          <Field label="Departamento">
            {(id) => <Select id={id} placeholder="Nenhum" options={departamentos} value={form.departamentoId ?? ''} onChange={(e) => setForm({ ...form, departamentoId: e.target.value ? Number(e.target.value) : null })} />}
          </Field>
          <Field label="Status" hint={editandoASiMesmo ? 'Você não pode alterar o próprio status.' : undefined}>
            {(id) => <Select id={id} options={STATUS_OPTIONS} value={form.status} disabled={editandoASiMesmo} onChange={(e) => setForm({ ...form, status: e.target.value as StatusUsuario })} />}
          </Field>
          <Field
            label="Perfil de acesso"
            required
            hint={editandoASiMesmo ? 'Você não pode alterar o próprio perfil.' : 'Hierárquico: Administrador > Gestor > Técnico > Solicitante.'}
            className="sm:col-span-2"
          >
            {(id) => <Select id={id} options={PAPEIS} value={form.papeis[0]} disabled={editandoASiMesmo} onChange={(e) => setForm({ ...form, papeis: [e.target.value as Papel] })} />}
          </Field>
          <Field
            label={novo ? 'Senha inicial' : 'Nova senha'}
            required={novo}
            error={mostrar('senha')}
            hint={novo ? 'Mínimo de 8 caracteres.' : 'Deixe em branco para manter a senha atual.'}
            className="sm:col-span-2"
          >
            {(id) => <Input id={id} type="password" autoComplete="new-password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />}
          </Field>
        </form>
      </Modal>
    </>
  );
}
