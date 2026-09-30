'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Clock, Eye, Inbox, UserPlus, UsersRound } from 'lucide-react';
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
import { plural } from '@/lib/format';
import { paginate } from '@/lib/http';
import { recursos } from '@/lib/recursos';
import { useAuth } from '@/features/auth/auth-provider';
import { useCategoriaOptions, useGrupoOptions } from '@/features/cadastros/use-cadastros';
import type { AtualizarStatusInput, Chamado, ChamadoFiltros } from '@/types';
import { useAtualizarStatus, useAtualizarStatusLote, useTriagem } from '../hooks/use-chamados';
import { PRIORIDADE_OPTIONS, slaVencido, transicoesComuns } from './chamado-badges';
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
  const { data: rows, isLoading, isError, error, refetch } = useTriagem({ ...filters, search });
  const pagina = useMemo(() => (rows ? paginate(rows, filters.page, filters.pageSize) : undefined), [rows, filters.page, filters.pageSize]);
  const categorias = useCategoriaOptions();
  const grupos = useGrupoOptions();
  const selection = useSelection<number>();
  const [modo, setModo] = useState<AtribuirModo | null>(null);
  const [alvo, setAlvo] = useState<number[]>([]);
  const { mutate: atribuir } = useAtualizarStatus();
  const lote = useAtualizarStatusLote();

  const { clear } = selection;
  useEffect(() => clear(), [filters.prioridade, filters.tipo, filters.categoriaId, filters.grupoId, search, clear]);

  const abrir = (m: AtribuirModo, ids: number[]) => {
    setAlvo(ids);
    setModo(m);
  };

  function confirmar(input: AtualizarStatusInput) {
    lote.mutate(
      { ids: alvo, input },
      {
        onSuccess: () => {
          selection.clear();
          setModo(null);
        },
      },
    );
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
            label={`Ações do chamado #${c.id}`}
            items={[
              ...(recursos.atribuicaoChamado
                ? [
                    { label: 'Atribuir a mim', icon: <UserPlus className="h-4 w-4" />, onClick: () => user && atribuir({ id: c.id, input: { tecnicoId: user.id } }) },
                    { label: 'Atribuir para grupo', icon: <UsersRound className="h-4 w-4" />, onClick: () => abrir('grupo', [c.id]) },
                  ]
                : []),
              { label: 'Mudar status', icon: <ArrowLeftRight className="h-4 w-4" />, onClick: () => abrir('status', [c.id]) },
              { label: 'Ver detalhes', icon: <Eye className="h-4 w-4" />, onClick: () => router.push(`/chamados/${c.id}`) },
            ]}
          />
        ),
      },
    ],
    [user, router, atribuir],
  );

  const todos = rows ?? [];
  const vencidos = todos.filter(slaVencido).length;
  const proximos = todos.filter((c) => c.slaRestanteMin !== null && c.slaRestanteMin >= 0 && c.slaRestanteMin <= 120).length;
  const ids = [...selection.selected];
  const statusPermitidos = useMemo(
    () => transicoesComuns(alvo.map((id) => todos.find((c) => c.id === id)?.status).filter((s) => s !== undefined)),
    [alvo, todos],
  );

  return (
    <>
      <PageHeader
        title="Triagem de Chamados Abertos"
        description="Gerencie tickets não atribuídos e pendentes de ação inicial."
        breadcrumbs={[{ label: 'Chamados', href: '/chamados' }, { label: 'Fila de Triagem' }]}
        actions={
          <>
            {recursos.atribuicaoChamado && (
              <>
                <Button variant="outline" icon={<UsersRound className="h-4 w-4" />} disabled={!ids.length} onClick={() => abrir('grupo', ids)}>
                  Atribuir para Grupo
                </Button>
                <Button variant="outline" icon={<UserPlus className="h-4 w-4" />} disabled={!ids.length} onClick={() => abrir('tecnico', ids)}>
                  Atribuir para Técnico
                </Button>
              </>
            )}
            <Button variant="dark" icon={<ArrowLeftRight className="h-4 w-4" />} disabled={!ids.length} onClick={() => abrir('status', ids)}>
              Mudar Status{ids.length ? ` (${ids.length})` : ''}
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

      {!recursos.atribuicaoChamado && (
        <Callout tone="info" className="mb-4">
          A atribuição de técnico e grupo ainda não está disponível na API. Por aqui é possível iniciar o atendimento ou pendenciar os chamados.
        </Callout>
      )}

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          data={pagina?.data}
          loading={isLoading}
          rowKey={(c) => c.id}
          selection={selection}
          rowClassName={(c) => (slaVencido(c) ? 'bg-red-50/40' : undefined)}
          emptyMessage="Nenhum chamado aguardando triagem."
          footer={pagina && <Pagination page={pagina.page} pageSize={pagina.pageSize} total={pagina.total} onPageChange={(p) => setFilter('page', p)} label="chamados em triagem" />}
        />
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Callout tone={vencidos ? 'danger' : 'success'} title="Atenção ao SLA">
          {vencidos
            ? `${plural(vencidos, 'chamado', 'chamados')} com SLA vencido ${vencidos === 1 ? 'aguarda' : 'aguardam'} ação imediata.`
            : 'Nenhum chamado da triagem está com SLA vencido.'}
        </Callout>
        <Callout tone="warning" title="Próximos Vencimentos" icon={<Clock className="h-5 w-5" />}>
          {proximos
            ? `${plural(proximos, 'chamado vence', 'chamados vencem')} nas próximas 2 horas.`
            : 'Nenhum vencimento previsto para as próximas 2 horas.'}
        </Callout>
        <Callout tone="info" title="Aguardando Triagem" icon={<Inbox className="h-5 w-5" />}>
          <span className="text-2xl font-bold text-brand-darker">{todos.length}</span> <span className="text-xs">{todos.length === 1 ? 'chamado' : 'chamados'} sem técnico atribuído</span>
        </Callout>
      </div>

      <AtribuirModal
        open={modo !== null}
        modo={modo ?? 'status'}
        quantidade={alvo.length}
        statusPermitidos={statusPermitidos}
        loading={lote.isPending}
        onClose={() => setModo(null)}
        onConfirm={confirmar}
      />
    </>
  );
}
