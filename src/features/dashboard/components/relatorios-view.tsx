'use client';

import { useState } from 'react';
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
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { chamadoColumns } from '@/features/chamados/components/chamado-columns';
import { useChamados } from '@/features/chamados/hooks/use-chamados';
import type { RelatorioTma } from '@/types';
import type { Periodo } from '../dashboard.service';
import { useDashboardResumo, useRelatorioTma } from '../use-dashboard';

type Analista = RelatorioTma['analistas'][number];

const matrizColumns: Column<Analista>[] = [
  { key: 'nome', header: 'Técnico', cell: (a) => <span className="font-semibold">{a.nome}</span> },
  { key: 'dep', header: 'Departamento', cell: (a) => a.departamento },
  { key: 'tma', header: 'Média Tempo (TMA)', cell: (a) => <span className={cn(a.tmaMin > 50 && 'font-semibold text-status-critica')}>{a.tmaMin}m</span> },
  { key: 'reab', header: 'Reaberturas', cell: (a) => `${a.reaberturasPct}%` },
  {
    key: 'sla',
    header: 'SLA Comprometido',
    cell: (a) => (
      <div className="flex items-center gap-2">
        <Progress value={a.slaPct} tone={a.slaPct >= 95 ? 'success' : 'warning'} className="w-20" />
        <span className="text-xs">{a.slaPct}%</span>
      </div>
    ),
  },
  { key: 'efic', header: 'Eficiência', align: 'right', cell: (a) => <strong>{a.eficienciaPct}%</strong> },
];

const incidentesColumns = chamadoColumns(['id', 'assunto', 'prioridade', 'status', 'tecnico', 'abertoEm']);

const SERIES = [
  { key: 'abertos', label: 'Aberto', className: 'bg-brand-darker' },
  { key: 'atendimento', label: 'Em Atendimento', className: 'bg-status-atendimento/70' },
  { key: 'fechados', label: 'Fechado', className: 'bg-slate-300' },
];

function categoriasPct(cats: { nome: string; total: number }[]) {
  const total = cats.reduce((s, c) => s + c.total, 0) || 1;
  return cats.map((c) => ({ label: c.nome, value: Math.round((c.total / total) * 100), suffix: '%' }));
}

export function RelatoriosView() {
  const [periodo, setPeriodo] = useState<Periodo>('30d');
  const [page, setPage] = useState(1);
  const tma = useRelatorioTma(periodo);
  const resumo = useDashboardResumo(periodo);
  const incidentes = useChamados({ page, pageSize: 5, tipo: 'INCIDENTE' });

  if (tma.isError) return <ErrorState message={getErrorMessage(tma.error)} onRetry={tma.refetch} />;
  const t = tma.data;
  const r = resumo.data;
  const loading = tma.isLoading || resumo.isLoading;

  return (
    <>
      <PageHeader
        title="Análise de Performance"
        breadcrumbs={[{ label: 'Relatórios' }, { label: 'Performance & TMA' }]}
        actions={
          <>
            <ToggleGroup
              value={periodo}
              onChange={setPeriodo}
              options={[
                { value: '30d', label: 'Últimos 30 dias' },
                { value: 'trimestre', label: 'Trimestre' },
                { value: 'ano', label: 'Ano' },
              ]}
            />
            <Button icon={<FileDown className="h-4 w-4" />} onClick={() => window.print()}>
              Exportar PDF
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total de Chamados Fechados" value={t && formatNumber(t.totalFechados)} icon={<Ticket className="h-5 w-5" />} trend={t?.variacaoPct} trendLabel="vs período anterior" loading={loading} />
        <StatCard label="Tempo Médio de Atendimento" value={t && `${t.tmaMin}m`} trend={t?.tmaVariacaoPct} invertTrend trendLabel="(melhoria)" loading={loading} />
        <StatCard label="SLA de Atendimento" value={r && `${r.kpis.slaCumpridoPct}%`} trend={r?.kpis.slaVariacaoPct} trendLabel="vs período anterior" loading={loading} />
        <StatCard
          label="Satisfação (CSAT)"
          value={t && (t.csat ? `${t.csat}/5.0` : '—')}
          loading={loading}
          footer={
            <span className="flex gap-0.5 text-status-pendente">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className={cn('h-4 w-4', t && i < Math.round(t.csat) && 'fill-current')} />
              ))}
            </span>
          }
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title="Volumetria Diária por Status" />
          <CardBody>{r && <StackedBarChart data={r.volumeDiario} labelKey="dia" series={SERIES} height={240} />}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Chamados por Categoria" />
          <CardBody>
            {r && <RankList max={100} items={categoriasPct(r.categoriasTop)} />}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title="Volume de Encerramentos por Técnico" description="Comparação de produtividade bruta por indivíduo" />
          <CardBody>{t && <RankList tone="primary" items={t.analistas.map((a) => ({ label: a.nome, value: a.fechados, suffix: ' chamados' }))} />}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Satisfação do Cliente" description="Média CSAT por atendimento fechado" />
          <CardBody className="space-y-2">
            {t?.analistas
              .slice()
              .sort((a, b) => b.csat - a.csat)
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
                      <Star className="h-4 w-4 fill-status-pendente text-status-pendente" /> {a.csat}
                    </p>
                    <p className="text-[11px] text-brand-muted">{a.avaliacoes} avaliações</p>
                  </div>
                </div>
              ))}
          </CardBody>
        </Card>
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
              onClick={() =>
                t &&
                exportCsv('performance-tma', t.analistas, [
                  { header: 'Técnico', value: (a) => a.nome },
                  { header: 'Departamento', value: (a) => a.departamento },
                  { header: 'TMA (min)', value: (a) => a.tmaMin },
                  { header: 'Reaberturas %', value: (a) => a.reaberturasPct },
                  { header: 'SLA %', value: (a) => a.slaPct },
                  { header: 'Eficiência %', value: (a) => a.eficienciaPct },
                ])
              }
            >
              CSV
            </Button>
          }
        />
        <DataTable columns={matrizColumns} data={t?.analistas} loading={loading} rowKey={(a) => a.id} className="rounded-none border-0 shadow-none" />
      </Card>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-base font-semibold text-brand-darker">Relatório Detalhado de Incidentes</h2>
          {incidentes.data && <Badge tone="dark">{incidentes.data.total} registros</Badge>}
        </div>
        <DataTable
          columns={incidentesColumns}
          data={incidentes.data?.data}
          loading={incidentes.isLoading}
          rowKey={(c) => c.id}
          footer={incidentes.data && <Pagination page={page} pageSize={5} total={incidentes.data.total} onPageChange={setPage} label="entradas" />}
        />
      </div>
    </>
  );
}
