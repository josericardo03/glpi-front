'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { AlarmClock, AlertOctagon, CheckCheck, Download, KanbanSquare, List, Plus, Ticket } from 'lucide-react';
import {
  Button,
  buttonVariants,
  DataTable,
  ErrorState,
  Field,
  FilterBar,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatCard,
  ToggleGroup,
  useToast,
} from '@/components/ui';
import { useDebounce, useFilters } from '@/hooks/use-filters';
import { exportCsv } from '@/lib/csv';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { paginate } from '@/lib/http';
import type { ChamadoFiltros, StatusChamado } from '@/types';
import { useAuth } from '@/features/auth/auth-provider';
import { useCategoriaOptions, useTecnicoOptions } from '@/features/cadastros/use-cadastros';
import { useAtualizarStatus, useChamados } from '../hooks/use-chamados';
import { isFinalizado, PRIORIDADE_META, PRIORIDADE_OPTIONS, slaVencido, STATUS_META, STATUS_OPTIONS, TRANSICOES } from './chamado-badges';
import { chamadoColumns } from './chamado-columns';
import { KanbanBoard } from './kanban-board';

const columns = chamadoColumns(['id', 'assunto', 'solicitante', 'tecnico', 'prioridade', 'status', 'slaCompact', 'ver']);

export function FilaGlobalView() {
  const router = useRouter();
  const params = useSearchParams();
  const view = params.get('view') === 'kanban' ? 'kanban' : 'lista';

  const initial = useMemo<ChamadoFiltros>(() => ({ page: 1, pageSize: 10, search: params.get('search') ?? '', status: '', prioridade: '', categoriaId: '', tecnicoId: '' }), [params]);
  const { filters, setFilter, reset } = useFilters(initial);
  const search = useDebounce(filters.search);

  const { data: rows, isLoading, isError, error, refetch } = useChamados({ ...filters, search });
  const pagina = useMemo(() => (rows ? paginate(rows, filters.page, filters.pageSize) : undefined), [rows, filters.page, filters.pageSize]);
  const categorias = useCategoriaOptions();
  const tecnicos = useTecnicoOptions();
  const { mutate: mover } = useAtualizarStatus();
  const toast = useToast();
  const { hasRole } = useAuth();
  const podeMover = hasRole('TECNICO');

  const urlSearch = params.get('search') ?? '';
  useEffect(() => setFilter('search', urlSearch), [urlSearch, setFilter]);

  const onMove = useCallback(
    (id: number, status: StatusChamado) => {
      if (!podeMover) return toast.error('Somente técnicos podem alterar o status dos chamados.');
      const atual = rows?.find((c) => c.id === id)?.status;
      if (!atual) return;
      if (!TRANSICOES[atual].includes(status)) {
        return toast.error(`Transição não permitida: ${STATUS_META[atual].label} → ${STATUS_META[status].label}.`);
      }
      if (status === 'PENDENTE' || status === 'RESOLVIDO') {
        toast.info(status === 'PENDENTE' ? 'Informe o motivo da pausa no chamado.' : 'Informe a resolução no chamado.');
        return router.push(`/chamados/${id}`);
      }
      mover({ id, input: { status } });
    },
    [rows, mover, router, toast, podeMover],
  );

  const stats = useMemo(() => {
    const todos = rows ?? [];
    const abertos = todos.filter((c) => !isFinalizado(c.status));
    const comSla = abertos.filter((c) => c.slaRestanteMin !== null);
    return {
      pendentes: abertos.length,
      noPrazo: comSla.length ? `${((comSla.filter((c) => !slaVencido(c)).length / comSla.length) * 100).toFixed(1)}%` : '—',
      vencidos: abertos.filter(slaVencido).length,
      resolvidos: todos.length - abertos.length,
    };
  }, [rows]);

  function setView(v: 'lista' | 'kanban') {
    const sp = new URLSearchParams(params);
    sp.set('view', v);
    router.replace(`/chamados?${sp}`, { scroll: false });
  }

  function onExport() {
    exportCsv('chamados', rows ?? [], [
      { header: 'ID', value: (c) => c.id },
      { header: 'Título', value: (c) => c.titulo },
      { header: 'Categoria', value: (c) => c.categoriaNome },
      { header: 'Solicitante', value: (c) => c.solicitanteNome },
      { header: 'Técnico', value: (c) => c.tecnicoNome },
      { header: 'Prioridade', value: (c) => PRIORIDADE_META[c.prioridade].label },
      { header: 'Status', value: (c) => STATUS_META[c.status].label },
      { header: 'Aberto em', value: (c) => formatDateTime(c.abertoEm) },
    ]);
  }

  return (
    <>
      <PageHeader
        title={podeMover ? 'Fila Global de Chamados' : 'Meus Chamados'}
        description={podeMover ? 'Gerencie e visualize todos os chamados abertos no sistema.' : 'Acompanhe os chamados que você abriu.'}
        breadcrumbs={[{ label: 'Chamados' }, { label: podeMover ? 'Fila Global' : 'Meus Chamados' }]}
        actions={
          <>
            <ToggleGroup
              value={view}
              onChange={setView}
              options={[
                { value: 'lista', label: 'Lista' },
                { value: 'kanban', label: 'Kanban' },
              ]}
            />
            <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={onExport}>
              CSV
            </Button>
            <Link href="/chamados/novo" className={buttonVariants()}>
              <Plus className="h-4 w-4" /> Criar Ticket
            </Link>
          </>
        }
      />

      <FilterBar actions={<Button variant="subtle" onClick={reset}>Limpar Filtros</Button>}>
        <Field label="Número / Assunto">
          {(id) => <SearchInput id={id} placeholder="Ex: 10245" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} />}
        </Field>
        <Field label="Status">
          {(id) => <Select id={id} placeholder="Todos os Status" options={STATUS_OPTIONS} value={filters.status} onChange={(e) => setFilter('status', e.target.value as ChamadoFiltros['status'])} />}
        </Field>
        <Field label="Prioridade">
          {(id) => <Select id={id} placeholder="Todas" options={PRIORIDADE_OPTIONS} value={filters.prioridade} onChange={(e) => setFilter('prioridade', e.target.value as ChamadoFiltros['prioridade'])} />}
        </Field>
        <Field label="Categoria">
          {(id) => <Select id={id} placeholder="Todas" options={categorias} value={filters.categoriaId} onChange={(e) => setFilter('categoriaId', e.target.value ? Number(e.target.value) : '')} />}
        </Field>
        <Field label="Técnico">
          {(id) => <Select id={id} placeholder="Todos os Técnicos" options={tecnicos} value={filters.tecnicoId} onChange={(e) => setFilter('tecnicoId', e.target.value ? Number(e.target.value) : '')} />}
        </Field>
      </FilterBar>

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : view === 'kanban' ? (
        <KanbanBoard chamados={rows ?? []} onMove={onMove} />
      ) : (
        <DataTable
          columns={columns}
          data={pagina?.data}
          loading={isLoading}
          rowKey={(c) => c.id}
          onRowClick={(c) => router.push(`/chamados/${c.id}`)}
          footer={pagina && <Pagination page={pagina.page} pageSize={pagina.pageSize} total={pagina.total} onPageChange={(p) => setFilter('page', p)} label="tickets" />}
        />
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Em Aberto" value={stats.pendentes} icon={<Ticket className="h-5 w-5" />} tone="primary" loading={isLoading} />
        <StatCard label="Dentro do SLA" value={stats.noPrazo} icon={<AlarmClock className="h-5 w-5" />} tone="success" loading={isLoading} />
        <StatCard label="SLA Vencido" value={stats.vencidos} icon={<AlertOctagon className="h-5 w-5" />} tone="danger" loading={isLoading} />
        <StatCard label="Resolvidos / Concluídos" value={stats.resolvidos} icon={<CheckCheck className="h-5 w-5" />} loading={isLoading} />
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-muted">
        {view === 'kanban' ? <KanbanSquare aria-hidden className="h-3.5 w-3.5" /> : <List aria-hidden className="h-3.5 w-3.5" />}
        {view === 'kanban'
          ? podeMover
            ? 'Arraste os cartões entre as colunas para alterar o status.'
            : 'Visualização somente leitura.'
          : 'Indicadores calculados sobre todos os chamados que atendem aos filtros.'}
      </p>
    </>
  );
}
