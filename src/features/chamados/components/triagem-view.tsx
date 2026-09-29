'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeftRight, Clock, Eye, Info, UserPlus, UsersRound } from 'lucide-react';
import {
  Button,
  Callout,
  DataTable,
  ErrorState,
  Field,
  FilterBar,
  Menu,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  type Column,
} from '@/components/ui';
import { useDebounce, useFilters, useSelection } from '@/hooks/use-filters';
import { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/features/auth/auth-provider';
import { useCategoriaOptions, useGrupoOptions } from '@/features/cadastros/use-cadastros';
import type { AtualizarStatusInput, Chamado, ChamadoFiltros } from '@/types';
import { useAtualizarStatus, useTriagem } from '../hooks/use-chamados';
import { PRIORIDADE_OPTIONS } from './chamado-badges';
import { chamadoColumns } from './chamado-columns';
import { AtribuirModal, type AtribuirModo } from './atribuir-modal';

const TIPO_OPTIONS = [
  { value: 'INCIDENTE', label: 'Incidente' },
  { value: 'REQUISICAO', label: 'Requisição' },
];

const INITIAL: ChamadoFiltros = { page: 1, pageSize: 10, search: '', prioridade: '', tipo: '', categoriaId: '', grupoId: '' };

export function TriagemView() {
  const router = useRouter();
  const { user } = useAuth();
  const { filters, setFilter, reset } = useFilters(INITIAL);
  const search = useDebounce(filters.search);
  const { data, isLoading, isError, error, refetch } = useTriagem({ ...filters, search });
  const categorias = useCategoriaOptions();
  const grupos = useGrupoOptions();
  const selection = useSelection<string | number>();
  const [modo, setModo] = useState<AtribuirModo | null>(null);
  const [alvo, setAlvo] = useState<number[]>([]);
  const atualizar = useAtualizarStatus();
  const { mutate: atribuir } = atualizar;

  const abrir = (m: AtribuirModo, ids: number[]) => {
    setAlvo(ids);
    setModo(m);
  };

  async function confirmar(input: AtualizarStatusInput) {
    await Promise.all(alvo.map((id) => atualizar.mutateAsync({ id, input })));
    selection.clear();
    setModo(null);
  }

  const columns = useMemo<Column<Chamado>[]>(
    () => [
      ...chamadoColumns(['id', 'assunto', 'solicitante', 'prioridadeInline', 'status', 'sla']),
      {
        key: 'acoes',
        header: <span className="sr-only">Ações</span>,
        align: 'right',
        cell: (c) => (
          <Menu
            items={[
              { label: 'Atribuir a mim', icon: <UserPlus className="h-4 w-4" />, onClick: () => user && atribuir({ id: c.id, input: { tecnicoId: user.id } }) },
              { label: 'Atribuir para grupo', icon: <UsersRound className="h-4 w-4" />, onClick: () => abrir('grupo', [c.id]) },
              { label: 'Ver detalhes', icon: <Eye className="h-4 w-4" />, onClick: () => router.push(`/chamados/${c.id}`) },
            ]}
          />
        ),
      },
    ],
    [user, router, atribuir],
  );

  const rows = data?.data ?? [];
  const vencidos = rows.filter((c) => c.slaRestanteMin < 0).length;
  const proximos = rows.filter((c) => c.slaRestanteMin >= 0 && c.slaRestanteMin <= 120).length;
  const ids = [...selection.selected].map(Number);

  return (
    <>
      <PageHeader
        title="Triagem de Chamados Abertos"
        description="Gerencie tickets não atribuídos e pendentes de ação inicial."
        breadcrumbs={[{ label: 'Chamados', href: '/chamados' }, { label: 'Fila de Triagem' }]}
        actions={
          <>
            <Button variant="outline" icon={<UsersRound className="h-4 w-4" />} disabled={!ids.length} onClick={() => abrir('grupo', ids)}>
              Atribuir para Grupo
            </Button>
            <Button variant="outline" icon={<UserPlus className="h-4 w-4" />} disabled={!ids.length} onClick={() => abrir('tecnico', ids)}>
              Atribuir para Técnico
            </Button>
            <Button variant="dark" icon={<ArrowLeftRight className="h-4 w-4" />} disabled={!ids.length} onClick={() => abrir('status', ids)}>
              Mudar Status
            </Button>
          </>
        }
      />

      <FilterBar actions={<Button variant="subtle" onClick={reset}>Limpar Filtros</Button>}>
        <Field label="Prioridade">
          {(id) => <Select id={id} placeholder="Todas" options={PRIORIDADE_OPTIONS} value={filters.prioridade} onChange={(e) => setFilter('prioridade', e.target.value as ChamadoFiltros['prioridade'])} />}
        </Field>
        <Field label="Tipo">
          {(id) => <Select id={id} placeholder="Todos" options={TIPO_OPTIONS} value={filters.tipo} onChange={(e) => setFilter('tipo', e.target.value as ChamadoFiltros['tipo'])} />}
        </Field>
        <Field label="Categoria">
          {(id) => <Select id={id} placeholder="Todas" options={categorias} value={filters.categoriaId} onChange={(e) => setFilter('categoriaId', e.target.value ? Number(e.target.value) : '')} />}
        </Field>
        <Field label="Grupo Responsável">
          {(id) => <Select id={id} placeholder="Todos" options={grupos} value={filters.grupoId} onChange={(e) => setFilter('grupoId', e.target.value ? Number(e.target.value) : '')} />}
        </Field>
        <Field label="Requerente">
          {(id) => <SearchInput id={id} placeholder="Nome ou assunto" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} />}
        </Field>
      </FilterBar>

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          data={data?.data}
          loading={isLoading}
          rowKey={(c) => c.id}
          selection={selection}
          rowClassName={(c) => (c.slaRestanteMin < 0 ? 'bg-red-50/40' : undefined)}
          emptyMessage="Nenhum chamado aguardando triagem. 🎉"
          footer={data && <Pagination page={filters.page!} pageSize={filters.pageSize!} total={data.total} onPageChange={(p) => setFilter('page', p)} label="chamados em triagem" />}
        />
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Callout tone="danger" title="Atenção ao SLA">
          Existem {vencidos} tickets com SLA vencido que precisam de atribuição imediata.
        </Callout>
        <Callout tone="warning" title="Próximos Vencimentos" icon={<Clock className="h-5 w-5" />}>
          {proximos} chamados vencerão nas próximas 2 horas. Organize a fila de prioridades.
        </Callout>
        <Callout tone="info" title="Tempo Médio de Triagem" icon={<Info className="h-5 w-5" />}>
          <span className="text-2xl font-bold text-brand-darker">12m</span> <span className="text-xs">hoje</span>
        </Callout>
      </div>

      <AtribuirModal
        open={modo !== null}
        modo={modo ?? 'grupo'}
        quantidade={alvo.length}
        loading={atualizar.isPending}
        onClose={() => setModo(null)}
        onConfirm={confirmar}
      />
    </>
  );
}
