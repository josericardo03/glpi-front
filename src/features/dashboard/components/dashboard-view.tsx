'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { AlertTriangle, ArrowRight, Hourglass, Inbox, Activity, UserRound, UsersRound, Timer, ShieldCheck, Gauge } from 'lucide-react';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  DonutChart,
  ErrorState,
  PageHeader,
  Progress,
  RankList,
  StackedBarChart,
  StatCard,
  UserCell,
  loadTone,
  type Column,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { formatMinutes } from '@/lib/format';
import { useAuth } from '@/features/auth/auth-provider';
import { chamadoColumns } from '@/features/chamados/components/chamado-columns';
import { STATUS_META } from '@/features/chamados/components/chamado-badges';
import type { DashboardResumo, StatusChamado } from '@/types';
import { useDashboardResumo, useTenant } from '../use-dashboard';

type TecnicoRow = DashboardResumo['tecnicos'][number];

const ultimosColumns = chamadoColumns(['id', 'assunto', 'prioridade', 'status', 'ver']);

const tecnicoColumns: Column<TecnicoRow>[] = [
  { key: 'nome', header: 'Técnico', cell: (t) => <UserCell name={t.nome} subtitle={t.nivel} /> },
  { key: 'ativos', header: 'Chamados Ativos', cell: (t) => t.ativos },
  { key: 'resolvidos', header: 'Resolvidos (Hoje)', cell: (t) => t.resolvidosHoje },
  { key: 'sla', header: 'SLA Atual', cell: (t) => <Badge tone={t.slaPct >= 95 ? 'success' : t.slaPct >= 90 ? 'pendente' : 'danger'}>{t.slaPct}%</Badge> },
  {
    key: 'carga',
    header: 'Carga de Trabalho',
    cell: (t) => (
      <div className="flex items-center gap-2">
        <Progress value={t.carga} tone={loadTone(t.carga)} className="w-24" />
        <span className="text-xs text-brand-muted">{t.carga}%</span>
      </div>
    ),
  },
];

const SERIES = [
  { key: 'fechados', label: 'Fechados', className: 'bg-status-resolvido' },
  { key: 'atendimento', label: 'Em Atendimento', className: 'bg-status-atendimento' },
  { key: 'abertos', label: 'Abertos', className: 'bg-brand-primary' },
];

export function DashboardView() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: tenant } = useTenant();
  const { data, isLoading, isError, error, refetch } = useDashboardResumo();
  const k = data?.kpis;

  const donut = useMemo(
    () =>
      data
        ? (Object.keys(data.porStatus) as StatusChamado[]).map((s) => ({ label: STATUS_META[s].label, value: data.porStatus[s], color: STATUS_META[s].color }))
        : [],
    [data],
  );

  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title={`Olá, ${user?.nome.split(' ')[0] ?? ''} 👋`}
        description={`Visão consolidada da operação e saúde do SLA${tenant ? ` · ${tenant.nome}` : ''}.`}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Tickets Abertos" value={k?.abertos} icon={<Inbox className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Atribuídos a Mim" value={k?.atribuidosAMim} icon={<UserRound className="h-5 w-5" />} tone="primary" loading={isLoading} />
        <StatCard label="Do Meu Grupo" value={k?.doMeuGrupo} icon={<UsersRound className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Pendentes" value={k?.pendentes} icon={<Hourglass className="h-5 w-5" />} tone="warning" loading={isLoading} />
        <StatCard label="SLA Crítico" value={k?.slaCritico} icon={<AlertTriangle className="h-5 w-5" />} tone="danger" loading={isLoading} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="SLA Cumprido" value={k && `${k.slaCumpridoPct}%`} icon={<ShieldCheck className="h-5 w-5" />} tone="success" trend={k?.slaVariacaoPct} trendLabel="vs mês anterior" loading={isLoading} />
        <StatCard
          label="MTTR (Tempo Médio de Resolução)"
          value={k && formatMinutes(k.mttrMin)}
          icon={<Timer className="h-5 w-5" />}
          loading={isLoading}
          footer={k && <span className="font-medium text-status-critica">{formatMinutes(k.mttrMin - k.mttrMetaMin)} acima da meta</span>}
        />
        <StatCard label="Média Tickets / Técnico" value={k?.mediaPorTecnico} icon={<Gauge className="h-5 w-5" />} loading={isLoading} footer="Distribuição equilibrada na fila" />
        <StatCard label="Resolvidos Hoje" value={k?.resolvidosHoje} icon={<Activity className="h-5 w-5" />} tone="dark" loading={isLoading} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-brand-darker">Últimos Tickets Atualizados</h2>
            <Link href="/chamados" className="flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline">
              Ver todos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <DataTable columns={ultimosColumns} data={data?.ultimosChamados} loading={isLoading} rowKey={(c) => c.id} onRowClick={(c) => router.push(`/chamados/${c.id}`)} />
        </div>
        <Card>
          <CardHeader title="Distribuição por Status" />
          <CardBody>{data && <DonutChart segments={donut} centerLabel="Tickets" />}</CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader title="Performance ao Longo do Tempo" description="Volume diário de chamados por status" />
          <CardBody>{data && <StackedBarChart data={data.volumeDiario} labelKey="dia" series={SERIES} />}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Categorias Mais Comuns" actions={<Link href="/relatorios" className="text-xs font-semibold text-brand-primary hover:underline">Relatório completo</Link>} />
          <CardBody>{data && <RankList numbered items={data.categoriasTop.map((c) => ({ label: c.nome, value: c.total }))} />}</CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="overflow-hidden">
          <CardHeader dark title="Performance de Técnicos" actions={<Badge tone="primary">Tempo real</Badge>} />
          <DataTable columns={tecnicoColumns} data={data?.tecnicos} loading={isLoading} rowKey={(t) => t.id} className="rounded-none border-0 shadow-none" />
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-brand-primary">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-brand-darker">Status da Infraestrutura</p>
              <p className="text-sm text-brand-muted">Todos os serviços principais estão operacionais.</p>
            </div>
          </div>
          <div className="flex gap-6">
            {data?.infraestrutura.map((s) => (
              <div key={s.servico} className="text-center">
                <p className={s.up ? 'font-bold text-status-resolvido' : 'font-bold text-status-critica'}>{s.up ? 'UP' : 'DOWN'}</p>
                <p className="text-xs text-brand-muted">{s.servico}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
