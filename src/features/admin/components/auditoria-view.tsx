'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Download, FileSearch, FilterX, Lock, Monitor } from 'lucide-react';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
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
  Tabs,
  UserCell,
  type BadgeTone,
  type Column,
} from '@/components/ui';
import { useDebounce, useFilters } from '@/hooks/use-filters';
import { getErrorMessage } from '@/lib/api';
import { exportCsv } from '@/lib/csv';
import { formatDateTime, formatNumber } from '@/lib/format';
import { paginate } from '@/lib/http';
import type { AcaoAuditoria, AuditLog, AuditoriaFiltros } from '@/types';
import { useUsuarios } from '@/features/cadastros/use-cadastros';
import { filtrarAuditoria } from '../admin.service';
import { AUDITORIA_MAX_EVENTOS } from '../admin.service';
import { useAuditoria } from '../use-admin';

const ACOES: Record<AcaoAuditoria, { label: string; tone: BadgeTone }> = {
  CREATE: { label: 'Criação', tone: 'success' },
  UPDATE: { label: 'Alteração', tone: 'primary' },
  DELETE: { label: 'Exclusão', tone: 'danger' },
  CONFIG: { label: 'Configuração', tone: 'atendimento' },
  LOGIN: { label: 'Login', tone: 'neutral' },
};

const TAB_ITEMS = [
  { value: '' as const, label: 'Todas' },
  ...(Object.keys(ACOES) as AcaoAuditoria[]).map((a) => ({ value: a, label: ACOES[a].label })),
];

const INITIAL: AuditoriaFiltros = { page: 1, pageSize: 10, search: '', acao: '', dataInicio: '', dataFim: '', usuarioId: '', codigoAcao: '' };

/**
 * Códigos gravados pela API, somados aos que aparecem no resultado atual. Os códigos em português
 * (CREATE_USUARIO, CREATE_ARTIGO...) só existem em registros antigos, anteriores à unificação.
 */
const CODIGOS_ACAO = [
  'CREATE_CHAMADO', 'UPDATE_STATUS', 'ADD_COMENTARIO', 'ADD_ANEXO', 'ADD_WORKLOG', 'PAUSE_SLA', 'RESUME_SLA', 'LINK_ATIVO',
  'SUBMIT_CSAT', 'CREATE_PROBLEMA', 'UPDATE_PROBLEMA', 'CREATE_MUDANCA', 'UPDATE_MUDANCA', 'CREATE_APPROVAL', 'APPROVAL_DECISION',
  'CREATE_USER', 'CREATE_USUARIO', 'UPDATE_USER', 'UPDATE_USUARIO', 'CREATE_DEPARTMENT', 'CREATE_DEPARTAMENTO', 'CREATE_SUPPORT_GROUP',
  'CREATE_GRUPO', 'ADD_MEMBRO_GRUPO', 'CREATE_CATEGORIA', 'CREATE_ATIVO', 'CREATE_KB_CATEGORY', 'CREATE_CATEGORIA_KB', 'CREATE_KB_ARTICLE',
  'CREATE_ARTIGO', 'UPDATE_KB_ARTICLE', 'ADD_KB_FEEDBACK', 'FEEDBACK_ARTIGO', 'CREATE_NOTIFICATION', 'READ_NOTIFICATION', 'UPDATE_NOTIFICACAO',
  'CREATE_CLIENT', 'CREATE_BUSINESS_HOURS', 'CREATE_INTERVAL', 'CREATE_HOLIDAY', 'CREATE_SLA_POLICY', 'UPSERT_BRANDING',
  'UPDATE_BRANDING', 'CREATE_INTEGRATION', 'EXECUTE_INTEGRATION',
];

const fmt = (v: unknown) => (v === undefined ? '—' : typeof v === 'string' ? v : JSON.stringify(v));

function diffKeys(log: AuditLog) {
  return Array.from(new Set([...Object.keys(log.valorAntigo ?? {}), ...Object.keys(log.valorNovo ?? {})]));
}

/** Resumo inline do delta JSONB: valor antigo (vermelho) → valor novo (verde). */
const InlineDiff = memo(function InlineDiff({ log }: { log: AuditLog }) {
  const keys = diffKeys(log);
  if (!keys.length) return <span className="text-brand-muted">—</span>;
  return (
    <div className="space-y-1">
      {keys.slice(0, 2).map((k) => (
        <div key={k} className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          <span className="text-brand-muted">{k}:</span>
          {log.valorAntigo && k in log.valorAntigo && <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700 line-through">{fmt(log.valorAntigo[k])}</span>}
          {log.valorAntigo && log.valorNovo && <ArrowRight className="h-3 w-3 text-brand-muted" />}
          {log.valorNovo && k in log.valorNovo && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{fmt(log.valorNovo[k])}</span>}
        </div>
      ))}
      {keys.length > 2 && <span className="text-[11px] text-brand-muted">+{keys.length - 2} campos</span>}
    </div>
  );
});

function JsonPanel({ title, value, tone }: { title: string; value: Record<string, unknown> | null; tone: 'old' | 'new' }) {
  const cls = tone === 'old' ? 'border-red-200 bg-red-50/60 text-red-800' : 'border-emerald-200 bg-emerald-50/60 text-emerald-800';
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">{title}</p>
      <pre className={`max-h-72 overflow-auto rounded-md border p-3 font-mono text-xs ${cls}`}>{value ? JSON.stringify(value, null, 2) : 'null'}</pre>
    </div>
  );
}

const columns: Column<AuditLog>[] = [
  { key: 'data', header: 'Data/Hora', cell: (l) => <span className="whitespace-nowrap font-mono text-xs">{formatDateTime(l.criadoEm)}</span> },
  { key: 'usuario', header: 'Usuário', cell: (l) => <UserCell name={l.usuarioNome} /> },
  {
    key: 'acao',
    header: 'Ação',
    cell: (l) => (
      <div className="flex flex-col items-start gap-1">
        <Badge tone={ACOES[l.acao].tone}>{ACOES[l.acao].label}</Badge>
        {l.acaoDetalhe && <span className="font-mono text-[10px] text-brand-muted">{l.acaoDetalhe}</span>}
      </div>
    ),
  },
  { key: 'entidade', header: 'Entidade', cell: (l) => <div><p className="font-semibold text-brand-darker">{l.entidade}</p><p className="font-mono text-xs text-brand-muted">{l.entidadeId}</p></div> },
  { key: 'diff', header: 'Alteração (JSONB)', cell: (l) => <InlineDiff log={l} /> },
  { key: 'ip', header: 'IP', cell: (l) => <span className="font-mono text-xs text-brand-muted">{l.ip}</span> },
];

export function AuditoriaView() {
  const { filters, setFilter, setFilters } = useFilters(INITIAL);
  const [term, setTerm] = useState('');
  const search = useDebounce(term);
  const { dataInicio, dataFim, usuarioId, codigoAcao } = filters;
  const filtrosApi = useMemo(() => ({ dataInicio, dataFim, usuarioId, codigoAcao }), [dataInicio, dataFim, usuarioId, codigoAcao]);
  const { data, isLoading, isFetching, isError, error, refetch } = useAuditoria(filtrosApi);
  const { data: usuarios } = useUsuarios();
  const [detalhe, setDetalhe] = useState<AuditLog | null>(null);
  const periodoInvalido = !!dataInicio && !!dataFim && dataFim < dataInicio;
  const filtrandoNaApi = !!(dataInicio || dataFim || usuarioId || codigoAcao);

  useEffect(() => setFilter('search', search), [search, setFilter]);

  const codigos = useMemo(
    () => Array.from(new Set([...CODIGOS_ACAO, ...(data ?? []).flatMap((l) => (l.acaoDetalhe ? [l.acaoDetalhe] : []))])).sort(),
    [data],
  );
  const usuarioOptions = useMemo(() => (usuarios ?? []).map((u) => ({ value: u.id, label: u.nome })).sort((a, b) => a.label.localeCompare(b.label)), [usuarios]);

  const filtrados = useMemo(() => filtrarAuditoria(data ?? [], { search: filters.search, acao: filters.acao }), [data, filters.search, filters.acao]);
  const pagina = paginate(filtrados, filters.page, filters.pageSize);

  function onExport() {
    exportCsv(`auditoria-${new Date().toISOString().slice(0, 10)}`, filtrados, [
      { header: 'Data/Hora', value: (l) => formatDateTime(l.criadoEm) },
      { header: 'Usuário', value: (l) => l.usuarioNome },
      { header: 'Ação', value: (l) => l.acaoDetalhe ?? ACOES[l.acao].label },
      { header: 'Entidade', value: (l) => l.entidade },
      { header: 'ID', value: (l) => l.entidadeId },
      { header: 'Valor Antigo', value: (l) => JSON.stringify(l.valorAntigo) },
      { header: 'Valor Novo', value: (l) => JSON.stringify(l.valorNovo) },
      { header: 'IP', value: (l) => l.ip },
    ]);
  }

  return (
    <>
      <PageHeader
        title="Trilha de Auditoria"
        description="Registro imutável de todas as operações sensíveis, com o delta dos dados antes e depois de cada alteração."
        breadcrumbs={[{ label: 'Administração' }, { label: 'Auditoria' }]}
        actions={
          <Button variant="outline" icon={<Download className="h-4 w-4" />} disabled={!filtrados.length} onClick={onExport}>
            Exportar CSV
          </Button>
        }
      />

      <Tabs variant="pills" aria-label="Filtrar por tipo de ação" value={filters.acao ?? ''} onChange={(v) => setFilter('acao', v)} items={TAB_ITEMS} className="mb-4 border border-brand-border" />

      <Card className="mb-4">
        <CardBody className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr_1.4fr_auto] xl:items-end">
          <Field label="De">
            {(id) => <Input id={id} type="date" value={dataInicio} max={dataFim || undefined} onChange={(e) => setFilter('dataInicio', e.target.value)} />}
          </Field>
          <Field label="Até" error={periodoInvalido ? 'Antes da data inicial.' : undefined}>
            {(id) => <Input id={id} type="date" value={dataFim} min={dataInicio || undefined} onChange={(e) => setFilter('dataFim', e.target.value)} invalid={periodoInvalido} />}
          </Field>
          <Field label="Usuário">
            {(id) => <Select id={id} placeholder="Todos" options={usuarioOptions} value={usuarioId} onChange={(e) => setFilter('usuarioId', e.target.value ? Number(e.target.value) : '')} />}
          </Field>
          <Field label="Código da ação">
            {(id) => <Select id={id} placeholder="Todos" options={codigos.map((c) => ({ value: c, label: c }))} value={codigoAcao} onChange={(e) => setFilter('codigoAcao', e.target.value)} />}
          </Field>
          <Button variant="ghost" icon={<FilterX className="h-4 w-4" />} disabled={!filtrandoNaApi} onClick={() => setFilters({ ...filters, page: 1, dataInicio: '', dataFim: '', usuarioId: '', codigoAcao: '' })}>
            Limpar
          </Button>
        </CardBody>
      </Card>

      <FilterBar>
        <SearchInput aria-label="Buscar eventos" placeholder="Buscar por usuário, entidade, ação ou ID do registro..." value={term} onChange={(e) => setTerm(e.target.value)} />
      </FilterBar>

      {data && data.length >= AUDITORIA_MAX_EVENTOS && (
        <p className="mb-3 text-xs text-brand-muted" role="status">
          Exibindo os {formatNumber(AUDITORIA_MAX_EVENTOS)} eventos mais recentes{filtrandoNaApi ? ' para estes filtros' : ''}. Refine o período para ver eventos mais antigos.
        </p>
      )}

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          data={data ? pagina.data : undefined}
          loading={isLoading || (isFetching && !data)}
          className={isFetching ? 'opacity-70 transition-opacity' : undefined}
          caption="Eventos de auditoria"
          rowKey={(l) => l.id}
          onRowClick={setDetalhe}
          emptyMessage="Nenhum evento encontrado para os filtros aplicados."
          footer={data && <Pagination page={pagina.page} pageSize={filters.pageSize!} total={pagina.total} onPageChange={(p) => setFilter('page', p)} label="eventos" />}
        />
      )}

      <Callout tone="dark" title="Registros imutáveis" icon={<Lock className="h-5 w-5" />} className="mt-6">
        Os logs de auditoria são somente leitura e retidos conforme a política de compliance. Nenhum perfil pode alterá-los ou excluí-los.
      </Callout>

      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} size="lg" title="Detalhe do Evento" description={detalhe && `${detalhe.entidade} · ${detalhe.entidadeId}`}>
        {detalhe && (
          <div className="space-y-5">
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Usuário</p>
                <UserCell name={detalhe.usuarioNome} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Ação</p>
                <Badge tone={ACOES[detalhe.acao].tone} className="mt-1.5">{ACOES[detalhe.acao].label}</Badge>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Origem</p>
                <p className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-xs"><Monitor className="h-3.5 w-3.5" />{detalhe.ip}</p>
                <p className="text-xs text-brand-muted">{formatDateTime(detalhe.criadoEm)}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <JsonPanel title="Valor Antigo" value={detalhe.valorAntigo} tone="old" />
              <JsonPanel title="Valor Novo" value={detalhe.valorNovo} tone="new" />
            </div>
            {diffKeys(detalhe).length > 0 && (
              <div className="overflow-hidden rounded-md border border-brand-border">
                <table className="w-full text-xs">
                  <thead className="bg-brand-dark text-left text-[11px] uppercase tracking-wide text-white">
                    <tr>
                      <th scope="col" className="px-3 py-2">Campo</th>
                      <th scope="col" className="px-3 py-2">Antes</th>
                      <th scope="col" className="px-3 py-2">Depois</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border font-mono">
                    {diffKeys(detalhe).map((k) => (
                      <tr key={k}>
                        <td className="px-3 py-2 font-semibold text-brand-darker">{k}</td>
                        <td className="px-3 py-2 text-red-700">{fmt(detalhe.valorAntigo?.[k])}</td>
                        <td className="px-3 py-2 text-emerald-700">{fmt(detalhe.valorNovo?.[k])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!detalhe.valorAntigo && !detalhe.valorNovo && (
              <p className="flex items-center gap-2 text-sm text-brand-muted"><FileSearch className="h-4 w-4" /> Evento sem delta de dados.</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
