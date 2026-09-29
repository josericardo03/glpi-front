'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Download, PlusCircle, Wrench } from 'lucide-react';
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
  Progress,
  SearchInput,
  Select,
  Tabs,
  UserCell,
  type Column,
} from '@/components/ui';
import { useDebounce, useFilters } from '@/hooks/use-filters';
import { getErrorMessage } from '@/lib/api';
import { exportCsv } from '@/lib/csv';
import { formatDate, formatPercent } from '@/lib/format';
import type { Ativo, AtivoFiltros, AtivoInput, StatusAtivo, TipoAtivo } from '@/types';
import { useUsuarioOptions } from '@/features/cadastros/use-cadastros';
import { useAtivos, useCreateAtivo } from '../use-ativos';
import { AtivoIcon, STATUS_ATIVO, STATUS_ATIVO_OPTIONS, StatusAtivoBadge, TIPO_ATIVO, TIPO_OPTIONS } from './ativo-meta';

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
  { key: 'resp', header: 'Responsável', cell: (a) => (a.responsavelNome ? <UserCell name={a.responsavelNome} /> : <span className="text-sm text-brand-muted">Não atribuído</span>) },
  { key: 'status', header: 'Status', cell: (a) => <StatusAtivoBadge status={a.status} /> },
  { key: 'aquisicao', header: 'Aquisição', cell: (a) => <span className="text-sm">{a.dataAquisicao ? formatDate(a.dataAquisicao) : '—'}</span> },
];

const EMPTY: AtivoInput = { codigo: '', nome: '', tipo: 'NOTEBOOK', status: 'ESTOQUE', responsavelId: null, dataAquisicao: '' };
const INITIAL: AtivoFiltros = { page: 1, pageSize: 10, search: '', tipo: '', status: '' };

export function AtivosView() {
  const router = useRouter();
  const { filters, setFilter } = useFilters(INITIAL);
  const search = useDebounce(filters.search);
  const { data, isLoading, isError, error, refetch } = useAtivos({ ...filters, search });
  const create = useCreateAtivo();
  const usuarios = useUsuarioOptions();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AtivoInput>(EMPTY);

  const r = data?.resumo;
  const set = <K extends keyof AtivoInput>(k: K, v: AtivoInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate(form, { onSuccess: () => { setOpen(false); setForm(EMPTY); } });
  }

  const valid = form.nome.trim().length >= 2 && form.codigo.trim().length >= 2;

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
                  { header: 'Responsável', value: (a) => a.responsavelNome ?? '' },
                  { header: 'Status', value: (a) => STATUS_ATIVO[a.status].label },
                  { header: 'Aquisição', value: (a) => (a.dataAquisicao ? formatDate(a.dataAquisicao) : '') },
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
              { value: 'OUTRO', label: 'Outros', count: r?.porTipo.OUTRO },
            ]}
          />
          <div className="flex gap-2 px-2">
            <SearchInput placeholder="Nome ou código" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} className="w-56" />
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
          <CardBody>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Disponibilidade da Frota</p>
            <p className="mt-1 text-3xl font-bold text-brand-darker">{r ? formatPercent(r.disponibilidadePct) : '—'}</p>
            <p className="mb-3 mt-1 text-xs text-brand-muted">Ativos em uso entre os não descartados</p>
            <Progress value={r?.disponibilidadePct ?? 0} tone={(r?.disponibilidadePct ?? 0) >= 80 ? 'success' : 'warning'} size="md" />
          </CardBody>
        </Card>
        <Card className="border-brand-dark bg-brand-darker text-white">
          <CardBody className="relative overflow-hidden">
            <Wrench className="absolute -bottom-3 -right-3 h-24 w-24 text-white/5" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Em Manutenção</p>
            <p className="mt-1 text-3xl font-bold">{r?.emManutencao ?? '—'}</p>
            <button onClick={() => setFilter('status', 'MANUTENCAO')} className="mt-2 text-xs font-bold uppercase tracking-wide text-brand-accent underline">
              Ver ativos
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
          <Field label="Código de Patrimônio" required>
            {(id) => <Input id={id} value={form.codigo} onChange={(e) => set('codigo', e.target.value.toUpperCase())} className="font-mono" placeholder="Ex.: NB-0042" maxLength={50} />}
          </Field>
          <Field label="Nome" required>{(id) => <Input id={id} value={form.nome} onChange={(e) => set('nome', e.target.value)} maxLength={150} />}</Field>
          <Field label="Tipo">{(id) => <Select id={id} options={TIPO_OPTIONS} value={form.tipo} onChange={(e) => set('tipo', e.target.value as TipoAtivo)} />}</Field>
          <Field label="Status">{(id) => <Select id={id} options={STATUS_ATIVO_OPTIONS} value={form.status} onChange={(e) => set('status', e.target.value as StatusAtivo)} />}</Field>
          <Field label="Responsável">
            {(id) => (
              <Select id={id} placeholder="Não atribuído" options={usuarios} value={form.responsavelId ?? ''} onChange={(e) => set('responsavelId', e.target.value ? Number(e.target.value) : null)} />
            )}
          </Field>
          <Field label="Data de Aquisição">{(id) => <Input id={id} type="date" value={form.dataAquisicao} onChange={(e) => set('dataAquisicao', e.target.value)} />}</Field>
        </form>
      </Modal>
    </>
  );
}
