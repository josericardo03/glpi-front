'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ArrowRight, BadgeCheck, Eye, Laptop, Network, Search, ShieldCheck, TerminalSquare, TrendingUp, UserRoundCheck, X, type LucideIcon } from 'lucide-react';
import { Badge, Button, buttonVariants, Card, CardBody, EmptyState, Skeleton } from '@/components/ui';
import { formatNumber, timeAgo } from '@/lib/format';
import type { KbArtigoResumo, KbCategoria } from '@/types';
import { useKbArtigos, useKbCategorias } from '../use-kb';

const ICONES: Record<KbCategoria['icone'], LucideIcon> = {
  rede: Network,
  software: TerminalSquare,
  rh: UserRoundCheck,
  hardware: Laptop,
  seguranca: ShieldCheck,
};

function ArtigoItem({ a, index }: { a: KbArtigoResumo; index?: number }) {
  return (
    <Link href={`/kb/artigos/${a.id}`} className="flex gap-3 rounded-md bg-white p-4 shadow-card ring-1 ring-brand-border transition hover:ring-brand-accent">
      {index !== undefined && <span className="text-sm font-bold text-slate-300">{String(index + 1).padStart(2, '0')}</span>}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-brand-darker">{a.titulo}</p>
        <p className="mt-0.5 truncate text-sm text-brand-muted">{a.resumo}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-brand-muted">
          <Badge tone="dark">{a.categoriaNome}</Badge>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {formatNumber(a.visualizacoes)} visualizações</span>
        </div>
      </div>
    </Link>
  );
}

export function KbHomeView() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | undefined>();
  const filtrando = !!search || !!categoriaId;

  const categorias = useKbCategorias();
  const populares = useKbArtigos({ ordem: 'populares', limit: 3 });
  const recentes = useKbArtigos({ ordem: 'recentes', limit: 3 });
  const resultados = useKbArtigos({ search, categoriaId });

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setSearch(input.trim());
  }

  const limpar = () => {
    setInput('');
    setSearch('');
    setCategoriaId(undefined);
  };

  return (
    <>
      <section className="-mx-4 -mt-4 mb-8 bg-brand-darker px-4 py-14 text-center md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8">
        <h1 className="text-3xl font-bold text-white">Como podemos ajudar você hoje?</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
          Busque em nossa base de conhecimento por guias passo a passo, soluções de problemas conhecidos e políticas da empresa.
        </p>
        <form onSubmit={onSearch} className="mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-lg bg-white p-2 shadow-pop">
          <Search className="ml-2 h-5 w-5 text-brand-muted" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pesquisar por erro, software, configuração de rede..."
            className="h-10 flex-1 bg-transparent text-sm text-brand-darker placeholder:text-brand-muted focus:outline-none"
          />
          <Button type="submit">Buscar</Button>
        </form>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {categorias.isLoading && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-40" />)}
        {categorias.data?.map((c) => {
          const Icon = ICONES[c.icone];
          const active = categoriaId === c.id;
          return (
            <button key={c.id} onClick={() => setCategoriaId(active ? undefined : c.id)} className="text-left">
              <Card className={`h-full transition hover:-translate-y-0.5 hover:shadow-md ${active ? 'ring-2 ring-brand-primary' : ''}`}>
                <CardBody>
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-darker text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-4 font-semibold text-brand-darker">{c.nome}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-brand-muted">{c.descricao}</p>
                  <p className="mt-3 flex items-center gap-1 text-sm font-medium text-brand-primary">
                    Ver {c.totalArtigos} artigos <ArrowRight className="h-3.5 w-3.5" />
                  </p>
                </CardBody>
              </Card>
            </button>
          );
        })}
      </div>

      {filtrando ? (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-darker">
              {resultados.data?.length ?? 0} resultado(s){search && <> para “{search}”</>}
            </h2>
            <Button variant="ghost" size="sm" icon={<X className="h-4 w-4" />} onClick={limpar}>
              Limpar busca
            </Button>
          </div>
          <div className="space-y-3">
            {resultados.data?.map((a) => <ArtigoItem key={a.id} a={a} />)}
            {resultados.data?.length === 0 && <Card><EmptyState title="Nenhum artigo encontrado" description="Tente outros termos ou abra um chamado." /></Card>}
          </div>
        </section>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-darker">
              <TrendingUp className="h-5 w-5" /> Artigos Mais Lidos
            </h2>
            <div className="space-y-3">
              {populares.isLoading && <Skeleton className="h-64" />}
              {populares.data?.map((a, i) => <ArtigoItem key={a.id} a={a} index={i} />)}
            </div>
          </section>
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-darker">
              <BadgeCheck className="h-5 w-5" /> Adicionados Recentemente
            </h2>
            <div className="space-y-3">
              {recentes.isLoading && <Skeleton className="h-64" />}
              {recentes.data?.map((a) => (
                <Link key={a.id} href={`/kb/artigos/${a.id}`} className="block border-l-4 border-brand-primary bg-white p-4 shadow-card transition hover:bg-slate-50">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">{timeAgo(a.publicadoEm)}</p>
                  <p className="mt-1 font-medium text-brand-darker">{a.titulo}</p>
                  <p className="text-sm text-brand-muted">{a.resumo}</p>
                  <p className="mt-2 text-xs text-brand-muted">Publicado por {a.autorNome}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      <Card className="mt-10 bg-slate-100">
        <CardBody className="flex flex-wrap items-center justify-between gap-4 p-8">
          <div>
            <h3 className="text-lg font-semibold text-brand-darker">Não encontrou o que precisava?</h3>
            <p className="mt-1 max-w-lg text-sm text-brand-muted">
              Nossa equipe de suporte está pronta para ajudar. Se você leu os artigos e ainda tem dúvidas, abra um chamado técnico agora mesmo.
            </p>
          </div>
          <Link href="/chamados/novo" className={buttonVariants({ size: 'lg' })}>
            Novo Chamado
          </Link>
        </CardBody>
      </Card>
    </>
  );
}
