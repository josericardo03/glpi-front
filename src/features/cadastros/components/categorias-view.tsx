'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronRight, CornerDownRight, FileText, Folder, FolderOpen, FolderPlus, Info, PlusCircle } from 'lucide-react';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  ErrorState,
  Field,
  Input,
  PageHeader,
  SearchInput,
  Select,
  Skeleton,
  StatCard,
  Switch,
  type BadgeTone,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { matches } from '@/lib/http';
import { cn } from '@/lib/utils';
import { textoInvalido } from '@/lib/validation';
import type { AplicacaoCategoria, Categoria, CategoriaInput } from '@/types';
import { useCategorias, useCreateCategoria } from '../use-cadastros';

const APLICACAO: Record<AplicacaoCategoria, { label: string; tone: BadgeTone }> = {
  AMBOS: { label: 'Ambos', tone: 'neutral' },
  INCIDENTE: { label: 'Incidente', tone: 'danger' },
  REQUISICAO: { label: 'Requisição', tone: 'primary' },
};
const MAX_NIVEL = 3;

interface Node extends Categoria {
  children: Node[];
  nivel: number;
}

function buildTree(list: Categoria[]): Node[] {
  const map = new Map<number, Node>(list.map((c) => [c.id, { ...c, children: [], nivel: 1 }]));
  const roots: Node[] = [];
  map.forEach((n) => {
    const parent = n.categoriaPaiId ? map.get(n.categoriaPaiId) : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n);
  });
  const setLevel = (nodes: Node[], lvl: number) => nodes.forEach((n) => { n.nivel = lvl; setLevel(n.children, lvl + 1); });
  setLevel(roots, 1);
  return roots;
}

function TreeRow({ node, expanded, toggle }: { node: Node; expanded: Set<number>; toggle: (id: number) => void }) {
  const open = expanded.has(node.id);
  const inativo = node.status === 'INATIVO';
  const hasChildren = node.children.length > 0;
  return (
    <>
      <tr className={cn('border-b border-brand-border hover:bg-slate-50', inativo && 'text-brand-muted')}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: (node.nivel - 1) * 24 }}>
            {node.nivel > 1 && <CornerDownRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />}
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggle(node.id)}
                className="rounded p-0.5 hover:bg-slate-200"
                aria-expanded={open}
                aria-label={`${open ? 'Recolher' : 'Expandir'} ${node.nome}`}
              >
                {open ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
              </button>
            ) : (
              node.nivel === 1 && <span className="w-5" />
            )}
            <span aria-hidden>{hasChildren ? open ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span>
            <span className={cn(node.nivel === 1 ? 'font-semibold' : 'text-sm', inativo && 'italic')}>{node.nome}</span>
          </div>
        </td>
        <td className="px-4 py-3"><Badge tone={APLICACAO[node.aplicacao].tone}>{APLICACAO[node.aplicacao].label}</Badge></td>
        <td className="px-4 py-3">
          <span className="flex items-center gap-1.5 text-xs">
            <span aria-hidden className={cn('h-2 w-2 rounded-full', inativo ? 'bg-slate-300' : 'bg-status-resolvido')} />
            {inativo ? 'Inativo' : 'Ativo'}
          </span>
        </td>
      </tr>
      {open && node.children.map((c) => <TreeRow key={c.id} node={c} expanded={expanded} toggle={toggle} />)}
    </>
  );
}

const EMPTY: CategoriaInput = { nome: '', categoriaPaiId: null, aplicacao: 'INCIDENTE', status: 'ATIVO' };

export function CategoriasView() {
  const { data, isLoading, isError, error, refetch } = useCategorias();
  const create = useCreateCategoria();
  const [term, setTerm] = useState('');
  const [tipo, setTipo] = useState<AplicacaoCategoria | ''>('');
  /** `null` = estado inicial com todos os níveis expandidos. */
  const [expanded, setExpanded] = useState<Set<number> | null>(null);
  const [form, setForm] = useState<CategoriaInput>(EMPTY);
  const [inc, setInc] = useState(true);
  const [req, setReq] = useState(false);
  const erroNome = form.nome ? textoInvalido(form.nome, { rotulo: 'O nome' }) : undefined;

  const filtrado = useMemo(() => {
    const list = data ?? [];
    if (!term && !tipo) return list;
    const porId = new Map(list.map((c) => [c.id, c]));
    const ids = new Set<number>();
    list
      .filter((c) => matches(c.nome, term) && (!tipo || c.aplicacao === tipo))
      .forEach((c) => {
        for (let atual: Categoria | undefined = c; atual && !ids.has(atual.id); atual = atual.categoriaPaiId ? porId.get(atual.categoriaPaiId) : undefined) {
          ids.add(atual.id);
        }
      });
    return list.filter((c) => ids.has(c.id));
  }, [data, term, tipo]);

  const tree = useMemo(() => buildTree(filtrado), [filtrado]);
  const nivelDe = useMemo(() => {
    const m = new Map<number, number>();
    const walk = (ns: Node[]) => ns.forEach((n) => { m.set(n.id, n.nivel); walk(n.children); });
    walk(buildTree(data ?? []));
    return m;
  }, [data]);

  const todosIds = useMemo(() => new Set((data ?? []).map((c) => c.id)), [data]);
  const abertos = term || tipo ? new Set(filtrado.map((c) => c.id)) : (expanded ?? todosIds);
  const toggle = (id: number) =>
    setExpanded((s) => {
      const n = new Set(s ?? todosIds);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const paiOptions = (data ?? [])
    .filter((c) => (nivelDe.get(c.id) ?? 1) < MAX_NIVEL && c.status === 'ATIVO')
    .map((c) => ({ value: c.id, label: c.nome }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const valido = !textoInvalido(form.nome) && (inc || req);

  function limpar() {
    setForm(EMPTY);
    setInc(true);
    setReq(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    const aplicacao: AplicacaoCategoria = inc && req ? 'AMBOS' : req ? 'REQUISICAO' : 'INCIDENTE';
    const paiId = form.categoriaPaiId;
    create.mutate(
      { ...form, nome: form.nome.trim(), aplicacao },
      {
        onSuccess: () => {
          if (paiId) setExpanded((s) => new Set(s ?? todosIds).add(paiId));
          limpar();
        },
      },
    );
  }

  const count = (a: AplicacaoCategoria) => data?.filter((c) => c.aplicacao === a || c.aplicacao === 'AMBOS').length ?? 0;

  return (
    <>
      <PageHeader title="Gestão de Categorias" description="Organize e configure a taxonomia dos atendimentos técnicos." breadcrumbs={[{ label: 'Admin' }, { label: 'Categorias de Chamados' }]} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total de Categorias" value={data?.length} loading={isLoading} />
        <StatCard label="Categorias Ativas" value={data?.filter((c) => c.status === 'ATIVO').length} tone="success" loading={isLoading} />
        <StatCard label="Tipo: Incidentes" value={count('INCIDENTE')} tone="danger" loading={isLoading} />
        <StatCard label="Tipo: Requisições" value={count('REQUISICAO')} tone="primary" loading={isLoading} />
      </div>

      <Card className="mb-4">
        <CardBody className="flex flex-wrap gap-3 p-3">
          <SearchInput aria-label="Filtrar categorias" placeholder="Filtrar por nome..." value={term} onChange={(e) => setTerm(e.target.value)} className="min-w-[280px]" />
          <Select aria-label="Tipo de aplicação" placeholder="Todos os Tipos" options={Object.entries(APLICACAO).map(([v, m]) => ({ value: v, label: m.label }))} value={tipo} onChange={(e) => setTipo(e.target.value as AplicacaoCategoria | '')} className="w-44" />
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {isError ? (
          <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-brand-border bg-white shadow-card">
            <table className="w-full text-sm" aria-busy={isLoading || undefined}>
              <caption className="sr-only">Árvore de categorias de chamados</caption>
              <thead>
                <tr className="bg-brand-darker text-left text-[11px] font-semibold uppercase tracking-wider text-slate-200">
                  <th scope="col" className="px-4 py-3">Estrutura de Categorias</th>
                  <th scope="col" className="px-4 py-3">Tipo</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={3} className="p-4">
                      <Skeleton className="h-32" />
                    </td>
                  </tr>
                )}
                {!isLoading && !tree.length && (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-sm text-brand-muted" role="status">
                      {term || tipo ? 'Nenhuma categoria corresponde ao filtro.' : 'Nenhuma categoria cadastrada.'}
                    </td>
                  </tr>
                )}
                {tree.map((n) => (
                  <TreeRow key={n.id} node={n} expanded={abertos} toggle={toggle} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Configurar Nova Categoria" icon={<FolderPlus className="h-4 w-4" />} />
            <CardBody>
              <form onSubmit={onSubmit} noValidate className="space-y-4">
                <Field label="Nome da Categoria" required error={erroNome}>
                  {(id) => <Input id={id} maxLength={100} placeholder="Ex: Suporte a Hardware" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />}
                </Field>
                <Field label="Categoria Pai (opcional)" hint={`Máximo de ${MAX_NIVEL} níveis de profundidade.`}>
                  {(id) => <Select id={id} placeholder="Nenhuma (Categoria Raiz)" options={paiOptions} value={form.categoriaPaiId ?? ''} onChange={(e) => setForm({ ...form, categoriaPaiId: e.target.value ? Number(e.target.value) : null })} />}
                </Field>
                <fieldset>
                  <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Aplicação</legend>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-brand-border px-3 py-2"><Checkbox label="Incidentes" checked={inc} onChange={(e) => setInc(e.target.checked)} /></div>
                    <div className="rounded-md border border-brand-border px-3 py-2"><Checkbox label="Requisições" checked={req} onChange={(e) => setReq(e.target.checked)} /></div>
                  </div>
                  {!inc && !req && <p className="mt-1 text-xs text-status-critica" role="alert">Selecione ao menos um tipo.</p>}
                </fieldset>
                <div className="rounded-md bg-slate-50 p-3">
                  <Switch label="Status Ativo" description="Visível para usuários" checked={form.status === 'ATIVO'} onChange={(v) => setForm({ ...form, status: v ? 'ATIVO' : 'INATIVO' })} />
                </div>
                <Button type="submit" className="w-full" icon={<PlusCircle className="h-4 w-4" />} disabled={!valido} loading={create.isPending}>
                  Salvar Categoria
                </Button>
                <Button variant="ghost" className="w-full" onClick={limpar}>
                  Limpar
                </Button>
              </form>
            </CardBody>
          </Card>
          <Callout tone="dark" icon={<Info className="h-5 w-5" />}>
            Mantenha a hierarquia com no máximo 3 níveis de profundidade para garantir que os usuários finais consigam classificar chamados rapidamente no Portal de Autoatendimento.
          </Callout>
        </aside>
      </div>
    </>
  );
}
