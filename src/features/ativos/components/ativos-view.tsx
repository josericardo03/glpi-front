'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
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
import { paginate } from '@/lib/http';
import { textoInvalido } from '@/lib/validation';
import type { Ativo, AtivoFiltros, AtivoInput, StatusAtivo, TipoAtivo } from '@/types';
import { useUsuarioOptions } from '@/features/cadastros/use-cadastros';
import { filtrarAtivos, resumirAtivos } from '../ativos.service';
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
const TIPO_TABS: { value: TipoAtivo; label: string }[] = [
  { value: 'NOTEBOOK', label: 'Notebooks' },
  { value: 'SERVIDOR', label: 'Servidores' },
  { value: 'LICENCA', label: 'Licenças' },
  { value: 'ROTEADOR', label: 'Roteadores' },
  { value: 'SWITCH', label: 'Switches' },
  { value: 'OUTRO', label: 'Outros' },
];
const hoje = () => new Date().toLocaleDateString('en-CA');

export function AtivosView() {
  const router = useRouter();
  const { filters, setFilter } = useFilters(INITIAL);
  const search = useDebounce(filters.search);
  const { data, isLoading, isError, error, refetch } = useAtivos();
  const create = useCreateAtivo();
  const usuarios = useUsuarioOptions();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AtivoInput>(EMPTY);

  const r = useMemo(() => (data ? resumirAtivos(data) : undefined), [data]);
  const filtrados = useMemo(() => filtrarAtivos(data ?? [], { search, tipo: filters.tipo, status: filters.status }), [data, search, filters.tipo, filters.status]);
  const pagina = paginate(filtrados, filters.page, filters.pageSize);
  const set = <K extends keyof AtivoInput>(k: K, v: AtivoInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const erros = {
    codigo: form.codigo ? textoInvalido(form.codigo, { rotulo: 'O código', min: 1, max: 50 }) : undefined,
    nome: form.nome ? textoInvalido(form.nome, { rotulo: 'O nome', max: 150 }) : undefined,
    data: form.dataAquisicao && form.dataAquisicao > hoje() ? 'A data de aquisição não pode estar no futuro.' : undefined,
  };
  const valid = !textoInvalido(form.codigo, { min: 1, max: 50 }) && !textoInvalido(form.nome, { max: 150 }) && !erros.data;

  function fechar() {
    setOpen(false);
    setForm(EMPTY);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (valid) create.mutate(form, { onSuccess: fechar });
  }

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
              disabled={!filtrados.length}
              onClick={() =>
                exportCsv('ativos', filtrados, [
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
            aria-label="Filtrar por tipo de ativo"
            value={(filters.tipo || 'TODOS') as TipoAtivo | 'TODOS'}
            onChange={(v) => setFilter('tipo', v === 'TODOS' ? '' : v)}
            items={[{ value: 'TODOS' as const, label: 'Todos', count: r?.total }, ...TIPO_TABS.map((t) => ({ ...t, count: r?.porTipo[t.value] }))]}
          />
          <div className="flex gap-2 px-2">
            <SearchInput aria-label="Buscar ativos" placeholder="Nome ou código" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} className="w-56" />
            <Select
              aria-label="Status do ativo"
              placeholder="Todos os status"
              options={STATUS_ATIVO_OPTIONS}
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value as StatusAtivo | '')}
              className="w-44"
            />
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
          caption="Inventário de ativos"
          rowKey={(a) => a.id}
          onRowClick={(a) => router.push(`/ativos/${a.id}`)}
          emptyMessage="Nenhum ativo encontrado para os filtros aplicados."
          footer={data && <Pagination page={pagina.page} pageSize={filters.pageSize!} total={pagina.total} onPageChange={(p) => setFilter('page', p)} label="ativos" />}
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
            <Wrench className="absolute -bottom-3 -right-3 h-24 w-24 text-white/5" aria-hidden />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Em Manutenção</p>
            <p className="mt-1 text-3xl font-bold">{r?.emManutencao ?? '—'}</p>
            <button type="button" onClick={() => setFilter('status', 'MANUTENCAO')} className="mt-2 text-xs font-bold uppercase tracking-wide text-brand-accent underline">
              Ver ativos
            </button>
          </CardBody>
        </Card>
      </div>

      <Modal
        open={open}
        onClose={fechar}
        title="Adicionar Ativo"
        description="Cadastre um novo item de configuração no CMDB."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={fechar}>Cancelar</Button>
            <Button type="submit" form="form-ativo" disabled={!valid} loading={create.isPending}>
              Salvar Ativo
            </Button>
          </>
        }
      >
        <form id="form-ativo" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label="Código de Patrimônio" required error={erros.codigo}>
            {(id) => <Input id={id} value={form.codigo} onChange={(e) => set('codigo', e.target.value.toUpperCase())} className="font-mono" placeholder="Ex.: NB-0042" maxLength={50} />}
          </Field>
          <Field label="Nome" required error={erros.nome}>
            {(id) => <Input id={id} value={form.nome} onChange={(e) => set('nome', e.target.value)} maxLength={150} />}
          </Field>
          <Field label="Tipo">{(id) => <Select id={id} options={TIPO_OPTIONS} value={form.tipo} onChange={(e) => set('tipo', e.target.value as TipoAtivo)} />}</Field>
          <Field label="Status">{(id) => <Select id={id} options={STATUS_ATIVO_OPTIONS} value={form.status} onChange={(e) => set('status', e.target.value as StatusAtivo)} />}</Field>
          <Field label="Responsável">
            {(id) => (
              <Select id={id} placeholder="Não atribuído" options={usuarios} value={form.responsavelId ?? ''} onChange={(e) => set('responsavelId', e.target.value ? Number(e.target.value) : null)} />
            )}
          </Field>
          <Field label="Data de Aquisição" error={erros.data}>
            {(id) => <Input id={id} type="date" max={hoje()} value={form.dataAquisicao} onChange={(e) => set('dataAquisicao', e.target.value)} />}
          </Field>
        </form>
      </Modal>
    </>
  );
}
