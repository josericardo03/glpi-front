'use client';

import { useMemo, useState } from 'react';
import { Download, FileDown, Star, Ticket } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  ErrorState,
  PageHeader,
  Pagination,
  Progress,
  RankList,
  StackedBarChart,
  StatCard,
  ToggleGroup,
  type Column,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { exportCsv } from '@/lib/csv';
import { formatMinutes, formatNumber } from '@/lib/format';
import { paginate } from '@/lib/http';
import { recursos } from '@/lib/recursos';
import { cn } from '@/lib/utils';
import { chamadoColumns } from '@/features/chamados/components/chamado-columns';
import { useChamados } from '@/features/chamados/hooks/use-chamados';
import type { RelatorioTma } from '@/types';
import type { Periodo } from '../dashboard.service';
import { useDashboardResumo, useRelatorioTma } from '../use-dashboard';

type Analista = RelatorioTma['analistas'][number];

const PERIODO_LABEL: Record<Periodo, string> = { '30d': 'Últimos 30 dias', trimestre: 'Trimestre', ano: 'Ano' };

const matrizColumns: Column<Analista>[] = [
  { key: 'nome', header: 'Técnico', cell: (a) => <span className="font-semibold">{a.nome}</span> },
  { key: 'dep', header: 'Departamento', cell: (a) => a.departamento },
  { key: 'fechados', header: 'Fechados', align: 'right', cell: (a) => formatNumber(a.fechados) },
  { key: 'tma', header: 'Média Tempo (TMA)', cell: (a) => formatMinutes(a.tmaMin) },
  ...(recursos.satisfacao ? [{ key: 'reab', header: 'Reaberturas', cell: (a: Analista) => (a.reaberturasPct === null ? '—' : `${a.reaberturasPct}%`) }] : []),
  {
    key: 'sla',
    header: 'SLA Cumprido',
    cell: (a) => (
      <div className="flex items-center gap-2">
        <Progress value={a.slaPct} tone={a.slaPct >= 95 ? 'success' : 'warning'} className="w-20" label={`SLA de ${a.nome}`} />
        <span className="text-xs">{a.slaPct}%</span>
      </div>
    ),
  },
  ...(recursos.satisfacao
    ? [{ key: 'efic', header: 'Eficiência', align: 'right' as const, cell: (a: Analista) => <strong>{a.eficienciaPct === null ? '—' : `${a.eficienciaPct}%`}</strong> }]
    : []),
];

const incidentesColumns = chamadoColumns(['id', 'assunto', 'prioridade', 'status', 'tecnico', 'abertoEm']);

const SERIES = [
  { key: 'abertos', label: 'Abertos no dia', className: 'bg-brand-darker' },
  { key: 'fechados', label: 'Resolvidos no dia', className: 'bg-slate-300' },
];

const PAGE_SIZE = 5;

export function RelatoriosView() {
  const [periodo, setPeriodo] = useState<Periodo>('30d');
  const [page, setPage] = useState(1);
  const tma = useRelatorioTma(periodo);
  const resumo = useDashboardResumo(periodo);
  const incidentes = useChamados({ tipo: 'INCIDENTE' });
  const pagina = useMemo(() => (incidentes.data ? paginate(incidentes.data, page, PAGE_SIZE) : undefined), [incidentes.data, page]);

  const t = tma.data;
  const r = resumo.data;
  const categorias = r
    ? r.categoriasTop.map((c) => ({ label: c.nome, value: r.kpis.totalPeriodo ? Math.round((c.total / r.kpis.totalPeriodo) * 100) : 0, suffix: '%' }))
    : [];

  return (
    <>
      <PageHeader
        title="Análise de Performance"
        breadcrumbs={[{ label: 'Relatórios' }, { label: 'Performance & TMA' }]}
        actions={
          <>
            <ToggleGroup
              aria-label="Período"
              value={periodo}
              onChange={setPeriodo}
              options={(Object.keys(PERIODO_LABEL) as Periodo[]).map((p) => ({ value: p, label: PERIODO_LABEL[p] }))}
            />
            <Button icon={<FileDown className="h-4 w-4" />} onClick={() => window.print()}>
              Imprimir / PDF
            </Button>
          </>
        }
      />

      {tma.isError ? (
        <ErrorState message={getErrorMessage(tma.error)} onRetry={tma.refetch} />
      ) : (
        <div className={cn('grid grid-cols-2 gap-4', recursos.satisfacao ? 'xl:grid-cols-4' : 'xl:grid-cols-3')}>
          <StatCard
            label="Total de Chamados Fechados"
            value={t && formatNumber(t.totalFechados)}
            icon={<Ticket className="h-5 w-5" />}
            trend={t?.variacaoPct}
            trendLabel="vs período anterior"
            loading={tma.isLoading}
          />
          <StatCard
            label="Tempo Médio de Atendimento"
            value={t && (t.tmaMin === null ? '—' : formatMinutes(t.tmaMin))}
            trend={t?.tmaVariacaoPct}
            invertTrend
            trendLabel="vs período anterior"
            loading={tma.isLoading}
          />
          <StatCard
            label="SLA de Atendimento"
            value={r && (r.kpis.slaCumpridoPct === null ? '—' : `${r.kpis.slaCumpridoPct}%`)}
            trend={r?.kpis.slaVariacaoPct}
            trendUnit=" p.p."
            trendLabel="vs período anterior"
            loading={resumo.isLoading}
          />
          {recursos.satisfacao && (
            <StatCard
              label="Satisfação (CSAT)"
              value={t && (t.csat === null ? '—' : `${t.csat}/5.0`)}
              loading={tma.isLoading}
              footer={
                t?.csat != null && (
                  <span className="flex gap-0.5 text-status-pendente" aria-label={`${t.csat} de 5 estrelas`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} aria-hidden className={cn('h-4 w-4', i < Math.round(t.csat!) && 'fill-current')} />
                    ))}
                  </span>
                )
              }
            />
          )}
        </div>
      )}

      {resumo.isError ? (
        <div className="mt-6">
          <ErrorState message={getErrorMessage(resumo.error)} onRetry={resumo.refetch} />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader title="Movimento dos Últimos 7 Dias" description="Chamados abertos e resolvidos por dia" />
            <CardBody>{r && <StackedBarChart data={r.volumeDiario} labelKey="dia" series={SERIES} height={240} />}</CardBody>
          </Card>
          <Card>
            <CardHeader title="Chamados por Categoria" description={`Abertos no período · ${PERIODO_LABEL[periodo].toLowerCase()}`} />
            <CardBody>
              {r && (categorias.length ? <RankList max={100} items={categorias} /> : <p className="text-sm text-brand-muted">Nenhum chamado aberto no período.</p>)}
            </CardBody>
          </Card>
        </div>
      )}

      {!tma.isError && (
        <>
          <div className={cn('mt-6 grid gap-6', recursos.satisfacao && 'xl:grid-cols-[1fr_360px]')}>
            <Card>
              <CardHeader title="Volume de Encerramentos por Técnico" description="Chamados resolvidos no período por técnico atribuído" />
              <CardBody>
                {t &&
                  (t.analistas.length ? (
                    <RankList tone="primary" items={t.analistas.map((a) => ({ label: a.nome, value: a.fechados, suffix: ' chamados' }))} />
                  ) : (
                    <p className="text-sm text-brand-muted">Nenhum chamado resolvido no período.</p>
                  ))}
              </CardBody>
            </Card>
            {recursos.satisfacao && (
              <Card>
                <CardHeader title="Satisfação do Cliente" description="Média CSAT por atendimento fechado" />
                <CardBody className="space-y-2">
                  {t?.analistas
                    .filter((a) => a.csat !== null)
                    .sort((a, b) => b.csat! - a.csat!)
                    .slice(0, 4)
                    .map((a, i) => (
                      <div key={a.id} className={cn('flex items-center gap-3 rounded-md p-3', i === 0 && 'bg-blue-50')}>
                        <Avatar name={a.nome} size="md" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-brand-darker">{a.nome}</p>
                          <p className="text-xs text-brand-muted">{a.departamento}</p>
                        </div>
                        <div className="text-right">
                          <p className="flex items-center gap-1 font-bold text-brand-darker">
                            <Star aria-hidden className="h-4 w-4 fill-status-pendente text-status-pendente" /> {a.csat}
                          </p>
                          <p className="text-[11px] text-brand-muted">{a.avaliacoes} avaliações</p>
                        </div>
                      </div>
                    ))}
                </CardBody>
              </Card>
            )}
          </div>

          <Card className="mt-6 overflow-hidden">
            <CardHeader
              dark
              title="Matriz Detalhada de Performance Individual"
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Download className="h-4 w-4" />}
                  disabled={!t?.analistas.length}
                  onClick={() =>
                    t &&
                    exportCsv(`performance-tma-${periodo}`, t.analistas, [
                      { header: 'Técnico', value: (a) => a.nome },
                      { header: 'Departamento', value: (a) => a.departamento },
                      { header: 'Fechados', value: (a) => a.fechados },
                      { header: 'TMA (min)', value: (a) => Math.round(a.tmaMin) },
                      { header: 'SLA %', value: (a) => a.slaPct },
                      ...(recursos.satisfacao
                        ? [
                            { header: 'Reaberturas %', value: (a: Analista) => a.reaberturasPct },
                            { header: 'Eficiência %', value: (a: Analista) => a.eficienciaPct },
                          ]
                        : []),
                    ])
                  }
                >
                  CSV
                </Button>
              }
            />
            <DataTable
              columns={matrizColumns}
              data={t?.analistas}
              loading={tma.isLoading}
              rowKey={(a) => a.id}
              emptyMessage="Nenhum técnico com chamados resolvidos no período."
              className="rounded-none border-0 shadow-none"
            />
          </Card>
        </>
      )}

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-base font-semibold text-brand-darker">Relatório Detalhado de Incidentes</h2>
          {pagina && <Badge tone="dark">{pagina.total} {pagina.total === 1 ? 'registro' : 'registros'}</Badge>}
        </div>
        {incidentes.isError ? (
          <ErrorState message={getErrorMessage(incidentes.error)} onRetry={incidentes.refetch} />
        ) : (
          <DataTable
            columns={incidentesColumns}
            data={pagina?.data}
            loading={incidentes.isLoading}
            rowKey={(c) => c.id}
            footer={pagina && <Pagination page={pagina.page} pageSize={PAGE_SIZE} total={pagina.total} onPageChange={setPage} label="entradas" />}
          />
        )}
      </div>
    </>
  );
}
