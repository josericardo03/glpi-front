'use client';

import { useMemo, useState } from 'react';
import { Bug, CheckCircle2, Flame, LifeBuoy, PlusCircle } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  ErrorState,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatCard,
  Tabs,
  type Column,
} from '@/components/ui';
import { useDebounce, useFilters } from '@/hooks/use-filters';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, timeAgo } from '@/lib/format';
import { matches, paginate } from '@/lib/http';
import type { Prioridade, Problema } from '@/types';
import { useAuth } from '@/features/auth/auth-provider';
import { PRIORIDADE_OPTIONS, PriorityBadge } from '@/features/chamados/components/chamado-badges';
import { problemaAberto, statusItil } from '../status';
import { useProblemas } from '../use-itil';
import { ProblemaDetalheModal } from './problema-detalhe';
import { ProblemaModal } from './problema-modal';

type Situacao = 'ABERTOS' | 'RESOLVIDOS' | 'TODOS';
interface Filtros {
  page: number;
  pageSize: number;
  search: string;
  situacao: Situacao;
  prioridade: Prioridade | '';
}
const INITIAL: Filtros = { page: 1, pageSize: 10, search: '', situacao: 'ABERTOS', prioridade: '' };

const aberto = (p: Problema) => problemaAberto(p.status, p.resolvidoEm);

const columns: Column<Problema>[] = [
  {
    key: 'titulo',
    header: 'Problema',
    cell: (p) => (
      <div className="min-w-0 max-w-md">
        <p className="truncate font-semibold text-brand-darker">
          <span className="text-brand-primary">#{p.id}</span> {p.titulo}
        </p>
        <p className="truncate text-xs text-brand-muted">{p.descricao}</p>
      </div>
    ),
  },
  { key: 'prioridade', header: 'Prioridade', cell: (p) => <PriorityBadge prioridade={p.prioridade} variant="inline" /> },
  {
    key: 'status',
    header: 'Status',
    cell: (p) => {
      const s = statusItil(p.status);
      return (
        <Badge tone={s.tone} dot>
          {s.label}
        </Badge>
      );
    },
  },
  {
    key: 'contorno',
    header: 'Contorno',
    cell: (p) =>
      p.solucaoContorno ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-status-resolvido">
          <LifeBuoy className="h-3.5 w-3.5" aria-hidden /> Disponível
        </span>
      ) : (
        <span className="text-xs text-brand-muted">—</span>
      ),
  },
  { key: 'tecnico', header: 'Responsável', cell: (p) => <span className="text-sm">{p.tecnicoNome ?? '—'}</span> },
  { key: 'identificado', header: 'Identificado', cell: (p) => <span className="text-sm text-brand-muted" title={formatDateTime(p.identificadoEm)}>{timeAgo(p.identificadoEm)}</span> },
];

/** `idInicial` abre o detalhe direto (links do chamado para `/problemas?id=N`). */
export function ProblemasView({ idInicial = null }: { idInicial?: number | null }) {
  const podeCriar = useAuth().hasRole('GESTOR');
  const { filters, setFilter } = useFilters(INITIAL);
  const search = useDebounce(filters.search);
  const { data, isLoading, isError, error, refetch } = useProblemas();
  const [novo, setNovo] = useState(false);
  const [detalheId, setDetalheId] = useState<number | null>(idInicial);

  const resumo = useMemo(() => {
    const lista = data ?? [];
    const abertos = lista.filter(aberto);
    return {
      abertos: abertos.length,
      resolvidos: lista.length - abertos.length,
      errosConhecidos: abertos.filter((p) => p.status === 'ERRO_CONHECIDO').length,
      criticos: abertos.filter((p) => p.prioridade === 'CRITICA' || p.prioridade === 'ALTA').length,
    };
  }, [data]);

  const filtrados = useMemo(
    () =>
      (data ?? []).filter(
        (p) =>
          (filters.situacao === 'TODOS' || (filters.situacao === 'ABERTOS') === aberto(p)) &&
          (!filters.prioridade || p.prioridade === filters.prioridade) &&
          (matches(p.titulo, search) || matches(p.descricao, search) || matches(String(p.id), search)),
      ),
    [data, filters.situacao, filters.prioridade, search],
  );
  const pagina = paginate(filtrados, filters.page, filters.pageSize);

  return (
    <>
      <PageHeader
        title="Gestão de Problemas"
        description="Investigação da causa raiz de incidentes recorrentes e registro de erros conhecidos."
        actions={
          podeCriar && (
            <Button icon={<PlusCircle className="h-4 w-4" />} onClick={() => setNovo(true)}>
              Novo Problema
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Em aberto" value={data && resumo.abertos} icon={<Bug className="h-5 w-5" />} tone="primary" loading={isLoading} />
        <StatCard label="Alta / Crítica abertos" value={data && resumo.criticos} icon={<Flame className="h-5 w-5" />} tone={resumo.criticos ? 'danger' : undefined} loading={isLoading} />
        <StatCard label="Erros conhecidos" value={data && resumo.errosConhecidos} icon={<LifeBuoy className="h-5 w-5" />} tone="warning" loading={isLoading} />
        <StatCard label="Resolvidos" value={data && resumo.resolvidos} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" loading={isLoading} />
      </div>

      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 p-2">
          <Tabs
            variant="pills"
            aria-label="Situação dos problemas"
            value={filters.situacao}
            onChange={(v) => setFilter('situacao', v)}
            items={[
              { value: 'ABERTOS', label: 'Em aberto', count: data && resumo.abertos },
              { value: 'RESOLVIDOS', label: 'Resolvidos', count: data && resumo.resolvidos },
              { value: 'TODOS', label: 'Todos', count: data?.length },
            ]}
          />
          <div className="flex gap-2 px-2">
            <SearchInput aria-label="Buscar problemas" placeholder="Título, descrição ou número" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} className="w-60" />
            <Select aria-label="Prioridade" placeholder="Todas as prioridades" options={PRIORIDADE_OPTIONS} value={filters.prioridade} onChange={(e) => setFilter('prioridade', e.target.value as Prioridade | '')} className="w-48" />
          </div>
        </div>
      </Card>

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          data={data ? pagina.data : undefined}
          loading={isLoading}
          caption="Problemas registrados"
          rowKey={(p) => p.id}
          onRowClick={(p) => setDetalheId(p.id)}
          emptyMessage={data?.length ? 'Nenhum problema para os filtros aplicados.' : 'Nenhum problema registrado.'}
          footer={data && <Pagination page={pagina.page} pageSize={filters.pageSize} total={pagina.total} onPageChange={(p) => setFilter('page', p)} label="problemas" />}
        />
      )}

      {podeCriar && <ProblemaModal open={novo} onClose={() => setNovo(false)} />}

      <ProblemaDetalheModal id={detalheId} onClose={() => setDetalheId(null)} />
    </>
  );
}
