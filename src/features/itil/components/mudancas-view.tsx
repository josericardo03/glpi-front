'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, CheckSquare, GitPullRequestArrow, PlusCircle, Siren } from 'lucide-react';
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
import type { Mudanca, StatusMudanca, TipoMudanca } from '@/types';
import { useAuth } from '@/features/auth/auth-provider';
import { SolicitarAprovacaoModal } from '@/features/aprovacoes/solicitar-aprovacao-modal';
import { mudancaEmPreparo, STATUS_MUDANCA, statusItil, TIPO_MUDANCA } from '../status';
import { useMudancas } from '../use-itil';
import { MudancaDetalheModal } from './mudanca-detalhe';
import { MudancaModal } from './mudanca-modal';

interface Filtros {
  page: number;
  pageSize: number;
  search: string;
  tipo: TipoMudanca | '';
  status: string;
}
const INITIAL: Filtros = { page: 1, pageSize: 10, search: '', tipo: '', status: '' };
const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

type Fase = 'futura' | 'andamento' | 'encerrada';
function faseJanela(m: Mudanca, agora = Date.now()): Fase {
  if (agora < Date.parse(m.janelaInicio)) return 'futura';
  return agora <= Date.parse(m.janelaFim) ? 'andamento' : 'encerrada';
}

function Janela({ m }: { m: Mudanca }) {
  const fase = faseJanela(m);
  return (
    <div className="text-sm">
      <p className="whitespace-nowrap">{formatDateTime(m.janelaInicio)}</p>
      <p className="whitespace-nowrap text-xs text-brand-muted">até {formatDateTime(m.janelaFim)}</p>
      {fase === 'andamento' && (
        <Badge tone="atendimento" className="mt-1">
          Em andamento
        </Badge>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = statusItil(status);
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

const columns: Column<Mudanca>[] = [
  {
    key: 'titulo',
    header: 'Mudança',
    cell: (m) => (
      <div className="min-w-0 max-w-md">
        <p className="truncate font-semibold text-brand-darker">
          <span className="text-brand-primary">#{m.id}</span> {m.titulo}
        </p>
        <p className="truncate text-xs text-brand-muted">{m.descricao}</p>
      </div>
    ),
  },
  { key: 'tipo', header: 'Tipo', cell: (m) => <Badge tone={TIPO_MUDANCA[m.tipo]?.tone ?? 'neutral'}>{TIPO_MUDANCA[m.tipo]?.label ?? m.tipo}</Badge> },
  { key: 'status', header: 'Status', cell: (m) => <StatusBadge status={m.status} /> },
  { key: 'janela', header: 'Janela de execução', cell: (m) => <Janela m={m} /> },
  { key: 'solicitante', header: 'Solicitante', cell: (m) => <span className="text-sm">{m.solicitanteNome}</span> },
  { key: 'criada', header: 'Registrada', cell: (m) => <span className="text-sm text-brand-muted" title={formatDateTime(m.criadaEm)}>{timeAgo(m.criadaEm)}</span> },
];

/** `idInicial` abre o detalhe direto (links do chamado para `/mudancas?id=N`). */
export function MudancasView({ idInicial = null }: { idInicial?: number | null }) {
  const podeCriar = useAuth().hasRole('GESTOR');
  const { filters, setFilter } = useFilters(INITIAL);
  const search = useDebounce(filters.search);
  const { data, isLoading, isError, error, refetch } = useMudancas();
  const [nova, setNova] = useState(false);
  const [detalheId, setDetalheId] = useState<number | null>(idInicial);
  const [aprovacao, setAprovacao] = useState<number | null>(null);

  const resumo = useMemo(() => {
    const lista = data ?? [];
    const agora = Date.now();
    const porTipo = (t: TipoMudanca) => lista.filter((m) => m.tipo === t).length;
    return {
      total: lista.length,
      aguardando: lista.filter((m) => mudancaEmPreparo(m.status)).length,
      proximas: lista.filter((m) => {
        const inicio = Date.parse(m.janelaInicio);
        return inicio >= agora && inicio - agora <= SEMANA_MS;
      }).length,
      porTipo: { PADRAO: porTipo('PADRAO'), NORMAL: porTipo('NORMAL'), EMERGENCIAL: porTipo('EMERGENCIAL') },
    };
  }, [data]);

  const statusOptions = (Object.keys(STATUS_MUDANCA) as StatusMudanca[]).map((s) => ({ value: s, label: STATUS_MUDANCA[s].label }));

  const filtrados = useMemo(
    () =>
      (data ?? []).filter(
        (m) =>
          (!filters.tipo || m.tipo === filters.tipo) &&
          (!filters.status || m.status === filters.status) &&
          (matches(m.titulo, search) || matches(m.descricao, search) || matches(String(m.id), search) || matches(m.solicitanteNome, search)),
      ),
    [data, filters.tipo, filters.status, search],
  );
  const pagina = paginate(filtrados, filters.page, filters.pageSize);

  return (
    <>
      <PageHeader
        title="Gestão de Mudanças"
        description="Requisições de mudança (RFC), janelas de execução e planos de teste e retorno."
        actions={
          podeCriar && (
            <Button icon={<PlusCircle className="h-4 w-4" />} onClick={() => setNova(true)}>
              Nova Mudança
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Mudanças registradas" value={data && resumo.total} icon={<GitPullRequestArrow className="h-5 w-5" />} tone="primary" loading={isLoading} />
        <StatCard label="Em preparação / aprovação" value={data && resumo.aguardando} icon={<CheckSquare className="h-5 w-5" />} tone="warning" loading={isLoading} />
        <StatCard label="Janelas nos próximos 7 dias" value={data && resumo.proximas} icon={<CalendarClock className="h-5 w-5" />} loading={isLoading} />
        <StatCard
          label="Emergenciais"
          value={data && resumo.porTipo.EMERGENCIAL}
          icon={<Siren className="h-5 w-5" />}
          tone={resumo.porTipo.EMERGENCIAL ? 'danger' : undefined}
          loading={isLoading}
        />
      </div>

      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 p-2">
          <Tabs
            variant="pills"
            aria-label="Tipo de mudança"
            value={filters.tipo || 'TODAS'}
            onChange={(v) => setFilter('tipo', v === 'TODAS' ? '' : v)}
            items={[
              { value: 'TODAS' as const, label: 'Todas', count: data?.length },
              ...(Object.keys(TIPO_MUDANCA) as TipoMudanca[]).map((t) => ({ value: t, label: TIPO_MUDANCA[t].label, count: data && resumo.porTipo[t] })),
            ]}
          />
          <div className="flex gap-2 px-2">
            <SearchInput aria-label="Buscar mudanças" placeholder="Título, número ou solicitante" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} className="w-60" />
            <Select aria-label="Status" placeholder="Todos os status" options={statusOptions} value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="w-44" />
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
          caption="Requisições de mudança"
          rowKey={(m) => m.id}
          onRowClick={(m) => setDetalheId(m.id)}
          emptyMessage={data?.length ? 'Nenhuma mudança para os filtros aplicados.' : 'Nenhuma mudança registrada.'}
          footer={data && <Pagination page={pagina.page} pageSize={filters.pageSize} total={pagina.total} onPageChange={(p) => setFilter('page', p)} label="mudanças" />}
        />
      )}

      {podeCriar && <MudancaModal open={nova} onClose={() => setNova(false)} />}

      <MudancaDetalheModal
        id={detalheId}
        onClose={() => setDetalheId(null)}
        onSolicitarAprovacao={(id) => {
          setDetalheId(null);
          setAprovacao(id);
        }}
      />

      <SolicitarAprovacaoModal open={aprovacao !== null} onClose={() => setAprovacao(null)} mudancaId={aprovacao ?? undefined} />
    </>
  );
}
