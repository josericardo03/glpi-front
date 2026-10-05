'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { AlertTriangle, ArrowRight, Hourglass, Inbox, Activity, UserRound, UserX, Timer, ShieldCheck, Gauge } from 'lucide-react';
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
import { formatMinutes, plural } from '@/lib/format';
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
  {
    key: 'sla',
    header: 'SLA Atual',
    cell: (t) =>
      t.slaPct === null ? (
        <span className="text-xs text-brand-muted">Sem resolvidos</span>
      ) : (
        <Badge tone={t.slaPct >= 95 ? 'success' : t.slaPct >= 90 ? 'pendente' : 'danger'}>{t.slaPct}%</Badge>
      ),
  },
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
  { key: 'fechados', label: 'Resolvidos no dia', className: 'bg-status-resolvido' },
  { key: 'abertos', label: 'Abertos no dia', className: 'bg-brand-primary' },
];

export function DashboardView() {
  const router = useRouter();
  const { user, hasRole } = useAuth();
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

  const infraFora = data?.infraestrutura.filter((s) => !s.up) ?? [];

  return (
    <>
      <PageHeader
        title={`Olá, ${user?.nome.split(' ')[0] ?? ''}`}
        description={`Visão consolidada da operação e saúde do SLA${tenant ? ` · ${tenant.nome}` : ''}.`}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Tickets Abertos" value={k?.abertos} icon={<Inbox className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Atribuídos a Mim" value={k?.atribuidosAMim} icon={<UserRound className="h-5 w-5" />} tone="primary" loading={isLoading} />
        <StatCard label="Sem Técnico" value={k?.naoAtribuidos} icon={<UserX className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Pendentes" value={k?.pendentes} icon={<Hourglass className="h-5 w-5" />} tone="warning" loading={isLoading} />
        <StatCard
          label="SLA Crítico"
          value={k?.slaCritico}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="danger"
          loading={isLoading}
          footer="Vencidos ou vencendo em até 4h"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="SLA Cumprido (30 dias)"
          value={k && (k.slaCumpridoPct === null ? '—' : `${k.slaCumpridoPct}%`)}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="success"
          trend={k?.slaVariacaoPct}
          trendUnit=" p.p."
          trendLabel="vs 30 dias anteriores"
          loading={isLoading}
          footer={k?.slaCumpridoPct === null ? 'Nenhum chamado resolvido no período.' : undefined}
        />
        <StatCard
          label="MTTR (Tempo Médio de Resolução)"
          value={k && (k.mttrMin === null ? '—' : formatMinutes(k.mttrMin))}
          icon={<Timer className="h-5 w-5" />}
          loading={isLoading}
          footer={k?.mttrMin === null ? 'Nenhum chamado resolvido no período.' : 'Chamados resolvidos nos últimos 30 dias'}
        />
        <StatCard
          label="Média Tickets / Técnico"
          value={k && (k.mediaPorTecnico ?? '—')}
          icon={<Gauge className="h-5 w-5" />}
          loading={isLoading}
          footer="Chamados abertos atribuídos ÷ técnicos ativos"
        />
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
          <CardHeader title="Movimento dos Últimos 7 Dias" description="Chamados abertos e resolvidos por dia" />
          <CardBody>{data && <StackedBarChart data={data.volumeDiario} labelKey="dia" series={SERIES} />}</CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Categorias Mais Comuns"
            description="Chamados abertos nos últimos 30 dias"
            actions={
              hasRole('GESTOR') && (
                <Link href="/relatorios" className="text-xs font-semibold text-brand-primary hover:underline">
                  Relatório completo
                </Link>
              )
            }
          />
          <CardBody>
            {data &&
              (data.categoriasTop.length ? (
                <RankList numbered items={data.categoriasTop.map((c) => ({ label: c.nome, value: c.total }))} />
              ) : (
                <p className="text-sm text-brand-muted">Nenhum chamado aberto no período.</p>
              ))}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="overflow-hidden">
          <CardHeader dark title="Performance de Técnicos" description="Atualizado a cada minuto" />
          <DataTable
            columns={tecnicoColumns}
            data={data?.tecnicos}
            loading={isLoading}
            rowKey={(t) => t.id}
            emptyMessage="Nenhum técnico com chamados atribuídos."
            className="rounded-none border-0 shadow-none"
          />
        </Card>
      </div>

      {!!data?.infraestrutura.length && (
        <Card className="mt-6">
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-brand-primary">
                <Activity className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-brand-darker">Status das Integrações</p>
                <p className="text-sm text-brand-muted">
                  {infraFora.length
                    ? `${plural(infraFora.length, 'integração inativa', 'integrações inativas')}: ${infraFora.map((s) => s.servico).join(', ')}.`
                    : 'Todas as integrações cadastradas estão ativas.'}
                </p>
              </div>
            </div>
            <ul className="flex flex-wrap gap-6">
              {data.infraestrutura.map((s) => (
                <li key={s.servico} className="text-center">
                  <p className={s.up ? 'font-bold text-status-resolvido' : 'font-bold text-status-critica'}>{s.up ? 'ATIVA' : 'INATIVA'}</p>
                  <p className="text-xs text-brand-muted">{s.servico}</p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </>
  );
}
