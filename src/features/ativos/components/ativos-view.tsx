'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Download, PlusCircle, AlertTriangle } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  DataTable,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Tabs,
  UserCell,
  type Column,
} from '@/components/ui';
import { useDebounce, useFilters } from '@/hooks/use-filters';
import { getErrorMessage } from '@/lib/api';
import { exportCsv } from '@/lib/csv';
import { formatPercent } from '@/lib/format';
import type { Ativo, AtivoFiltros, AtivoInput, StatusAtivo, TipoAtivo } from '@/types';
import { useAtivos, useCreateAtivo } from '../use-ativos';
import { AtivoIcon, STATUS_ATIVO_OPTIONS, StatusAtivoBadge, TIPO_ATIVO, TIPO_OPTIONS } from './ativo-meta';

const columns: Column<Ativo>[] = [
  {
    key: 'nome',
    header: 'Nome do Ativo',
    cell: (a) => (
      <div className="flex items-center gap-3">
        <AtivoIcon tipo={a.tipo} />
        <div>
          <p className="font-semibold text-brand-darker">{a.nome}</p>
          <p className="text-[11px] font-medium text-brand-muted">ID: {a.codigo}</p>
        </div>
      </div>
    ),
  },
  { key: 'tipo', header: 'Tipo', cell: (a) => TIPO_ATIVO[a.tipo].label },
  { key: 'serie', header: 'Número de Série', cell: (a) => <span className="font-mono text-xs">{a.numeroSerie}</span> },
  { key: 'resp', header: 'Responsável', cell: (a) => <UserCell name={a.responsavelNome} /> },
  { key: 'status', header: 'Status', cell: (a) => <StatusAtivoBadge status={a.status} /> },
  { key: 'loc', header: 'Localização', cell: (a) => <span className="text-sm">{a.localizacao}</span> },
];

const EMPTY: AtivoInput = { nome: '', tipo: 'NOTEBOOK', numeroSerie: '', responsavelNome: '', status: 'ESTOQUE', localizacao: '', fabricante: '', modelo: '' };
const INITIAL: AtivoFiltros = { page: 1, pageSize: 10, search: '', tipo: '', status: '' };

export function AtivosView() {
  const router = useRouter();
  const { filters, setFilter } = useFilters(INITIAL);
  const search = useDebounce(filters.search);
  const { data, isLoading, isError, error, refetch } = useAtivos({ ...filters, search });
  const create = useCreateAtivo();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AtivoInput>(EMPTY);

  const r = data?.resumo;
  const set = <K extends keyof AtivoInput>(k: K, v: AtivoInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate(form, { onSuccess: () => { setOpen(false); setForm(EMPTY); } });
  }

  const valid = form.nome.trim() && form.numeroSerie.trim() && form.responsavelNome.trim();

  return (
    <>
      <PageHeader
        title="Gerenciamento de Ativos (CMDB)"
        description="Inventário centralizado de infraestrutura e softwares."
        actions={
          <>
            <Button
              variant="subtle"
              icon={<Download className="h-4 w-4" />}
              onClick={() =>
                exportCsv('ativos', data?.data ?? [], [
                  { header: 'Código', value: (a) => a.codigo },
                  { header: 'Nome', value: (a) => a.nome },
                  { header: 'Tipo', value: (a) => TIPO_ATIVO[a.tipo].label },
                  { header: 'Série', value: (a) => a.numeroSerie },
                  { header: 'Responsável', value: (a) => a.responsavelNome },
                  { header: 'Status', value: (a) => a.status },
                  { header: 'Localização', value: (a) => a.localizacao },
                ])
              }
            >
              Exportar
            </Button>
            <Button icon={<PlusCircle className="h-4 w-4" />} onClick={() => setOpen(true)}>
              Adicionar Ativo
            </Button>
          </>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 p-2">
          <Tabs
            variant="pills"
            value={(filters.tipo || 'TODOS') as TipoAtivo | 'TODOS'}
            onChange={(v) => setFilter('tipo', v === 'TODOS' ? '' : v)}
            items={[
              { value: 'TODOS', label: 'Todos', count: r?.total },
              { value: 'NOTEBOOK', label: 'Notebooks', count: r?.porTipo.NOTEBOOK },
              { value: 'SERVIDOR', label: 'Servidores', count: r?.porTipo.SERVIDOR },
              { value: 'LICENCA', label: 'Licenças', count: r?.porTipo.LICENCA },
              { value: 'REDE', label: 'Rede', count: r?.porTipo.REDE },
            ]}
          />
          <div className="flex gap-2 px-2">
            <SearchInput placeholder="Nome, código ou série" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} className="w-56" />
            <Select placeholder="Todos os status" options={STATUS_ATIVO_OPTIONS} value={filters.status} onChange={(e) => setFilter('status', e.target.value as StatusAtivo | '')} className="w-44" />
          </div>
        </div>
      </Card>

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          data={data?.data}
          loading={isLoading}
          rowKey={(a) => a.id}
          onRowClick={(a) => router.push(`/ativos/${a.id}`)}
          footer={data && <Pagination page={filters.page!} pageSize={filters.pageSize!} total={data.total} onPageChange={(p) => setFilter('page', p)} label="ativos" />}
        />
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_360px]">
        <Card>
          <CardBody className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Saúde da Frota</p>
              <p className="mt-1 text-3xl font-bold text-brand-darker">{r ? formatPercent(r.saudeFrota) : '—'}</p>
              <p className="mt-1 text-xs text-brand-muted"><span className="font-semibold text-emerald-600">+1,4%</span> em relação ao mês passado</p>
            </div>
            <div className="flex h-16 items-end gap-1.5">
              {[55, 70, 62, 80, 74, 92].map((h, i) => (
                <span key={i} className={i === 5 ? 'w-5 rounded-t bg-status-resolvido' : 'w-5 rounded-t bg-emerald-100'} style={{ height: `${h}%` }} />
              ))}
            </div>
          </CardBody>
        </Card>
        <Card className="border-brand-dark bg-brand-darker text-white">
          <CardBody className="relative overflow-hidden">
            <AlertTriangle className="absolute -bottom-3 -right-3 h-24 w-24 text-white/5" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Licenças Expirando</p>
            <p className="mt-1 text-3xl font-bold">{r?.licencasExpirando ?? '—'}</p>
            <button onClick={() => setFilter('tipo', 'LICENCA')} className="mt-2 text-xs font-bold uppercase tracking-wide text-brand-accent underline">
              Renovar agora
            </button>
          </CardBody>
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Adicionar Ativo"
        description="Cadastre um novo item de configuração no CMDB."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" form="form-ativo" disabled={!valid} loading={create.isPending}>Salvar Ativo</Button>
          </>
        }
      >
        <form id="form-ativo" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" required className="sm:col-span-2">{(id) => <Input id={id} value={form.nome} onChange={(e) => set('nome', e.target.value)} />}</Field>
          <Field label="Tipo">{(id) => <Select id={id} options={TIPO_OPTIONS} value={form.tipo} onChange={(e) => set('tipo', e.target.value as TipoAtivo)} />}</Field>
          <Field label="Status">{(id) => <Select id={id} options={STATUS_ATIVO_OPTIONS} value={form.status} onChange={(e) => set('status', e.target.value as StatusAtivo)} />}</Field>
          <Field label="Número de Série" required>{(id) => <Input id={id} value={form.numeroSerie} onChange={(e) => set('numeroSerie', e.target.value.toUpperCase())} className="font-mono" />}</Field>
          <Field label="Responsável" required>{(id) => <Input id={id} value={form.responsavelNome} onChange={(e) => set('responsavelNome', e.target.value)} />}</Field>
          <Field label="Fabricante">{(id) => <Input id={id} value={form.fabricante} onChange={(e) => set('fabricante', e.target.value)} />}</Field>
          <Field label="Modelo">{(id) => <Input id={id} value={form.modelo} onChange={(e) => set('modelo', e.target.value)} />}</Field>
          <Field label="Localização" className="sm:col-span-2">{(id) => <Input id={id} value={form.localizacao} onChange={(e) => set('localizacao', e.target.value)} />}</Field>
        </form>
      </Modal>
    </>
  );
}
