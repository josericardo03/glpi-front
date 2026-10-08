'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Link2, Network, Plus, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { formatDateTime } from '@/lib/format';
import { MapaGrafo } from './mapa-grafo';
import { useCadastrarSoftware, useDesligar, useImpacto, useLigacoes, useLigar, useSoftwares } from '../use-mapa';

function sugerirCodigo(nome: string) {
  const base = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .slice(0, 46);
  return base ? `SW-${base}` : '';
}

export function MapaSoftwareView() {
  const softwares = useSoftwares();
  const ligacoes = useLigacoes();
  const cadastrar = useCadastrarSoftware();
  const ligar = useLigar();
  const desligar = useDesligar();

  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoEditado, setCodigoEditado] = useState(false);
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [caidoId, setCaidoId] = useState<number | null>(null);

  const impacto = useImpacto(caidoId);
  const lista = softwares.data ?? [];
  const opcoes = lista.map((s) => ({ value: s.id, label: s.nome }));
  const arestas = ligacoes.data ?? [];
  const porNivel = useMemo(() => {
    const grupos = new Map<number, { id: number; nome: string }[]>();
    for (const a of impacto.data?.afetados ?? []) {
      const listaNivel = grupos.get(a.nivel) ?? [];
      listaNivel.push(a);
      grupos.set(a.nivel, listaNivel);
    }
    return [...grupos.entries()].sort((a, b) => a[0] - b[0]);
  }, [impacto.data]);

  const carregando = softwares.isLoading || ligacoes.isLoading;
  const erro = softwares.error ?? ligacoes.error;

  function aoMudarNome(valor: string) {
    setNome(valor);
    if (!codigoEditado) setCodigo(sugerirCodigo(valor));
  }

  function aoCadastrar(e: FormEvent) {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    const codigoLimpo = codigo.trim();
    if (nomeLimpo.length < 2 || codigoLimpo.length < 1) return;
    cadastrar.mutate(
      { nome: nomeLimpo, codigo: codigoLimpo },
      {
        onSuccess: () => {
          setNome('');
          setCodigo('');
          setCodigoEditado(false);
        },
      },
    );
  }

  function aoLigar(e: FormEvent) {
    e.preventDefault();
    if (!origem || !destino) return;
    ligar.mutate({ origem: Number(origem), destino: Number(destino) }, { onSuccess: () => { setOrigem(''); setDestino(''); } });
  }

  return (
    <div>
      <PageHeader
        title="Mapa de software"
        description="A origem depende do destino. A seta sai de quem usa e aponta para o que sustenta. Quando o destino cai, quem depende dele aparece como afetado."
        breadcrumbs={[{ label: 'Operação' }, { label: 'Mapa de software' }]}
      />

      {carregando ? (
        <PageLoader />
      ) : erro ? (
        <ErrorState message="Não foi possível carregar o mapa." onRetry={() => { void softwares.refetch(); void ligacoes.refetch(); }} />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title="Cadastrar software" description="Entra nos dois selects do mapa." icon={<Plus className="h-4 w-4" />} />
                <CardBody>
                  <form className="space-y-3" onSubmit={aoCadastrar}>
                    <Field label="Nome" required>
                      {(id) => <Input id={id} value={nome} maxLength={150} placeholder="Portal" onChange={(e) => aoMudarNome(e.target.value)} required />}
                    </Field>
                    <Field label="Código de patrimônio" required>
                      {(id) => (
                        <Input
                          id={id}
                          value={codigo}
                          maxLength={50}
                          placeholder="SW-PORTAL"
                          onChange={(e) => {
                            setCodigoEditado(true);
                            setCodigo(e.target.value.toUpperCase());
                          }}
                          required
                        />
                      )}
                    </Field>
                    <Button type="submit" disabled={cadastrar.isPending || nome.trim().length < 2 || codigo.trim().length < 1}>
                      {cadastrar.isPending ? 'Salvando…' : 'Cadastrar'}
                    </Button>
                  </form>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Ligar dois softwares" description="Quem depende fica na origem." icon={<Link2 className="h-4 w-4" />} />
                <CardBody>
                  <form className="space-y-3" onSubmit={aoLigar}>
                    <Field label="Origem — quem depende">
                      {(id) => <Select id={id} options={opcoes} placeholder="Selecione" value={origem} onChange={(e) => setOrigem(e.target.value)} />}
                    </Field>
                    <Field label="Destino — do que depende">
                      {(id) => <Select id={id} options={opcoes} placeholder="Selecione" value={destino} onChange={(e) => setDestino(e.target.value)} />}
                    </Field>
                    <Button type="submit" disabled={ligar.isPending || !origem || !destino || lista.length < 1}>
                      {ligar.isPending ? 'Ligando…' : 'Ligar'}
                    </Button>
                  </form>
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader
                title="Mapa"
                description="Clique em um software para ver quem cai junto."
                icon={<Network className="h-4 w-4" />}
              />
              <CardBody>
                {arestas.length === 0 ? (
                  <EmptyState
                    icon={<Network className="h-6 w-6" />}
                    title="Nenhuma dependência"
                    description="Ligue dois softwares para desenhar a seta da origem até o destino."
                  />
                ) : (
                  <>
                    <MapaGrafo ligacoes={arestas} caidoId={caidoId} afetados={impacto.data?.afetados ?? []} onEscolher={setCaidoId} />
                    <ul className="mt-4 flex flex-wrap gap-3 text-xs text-brand-muted">
                      <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-red-400 bg-red-50" /> Caiu</li>
                      <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-amber-400 bg-amber-50" /> Nível 1, depende direto</li>
                      <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-sky-400 bg-sky-50" /> Nível 2 ou mais</li>
                    </ul>
                    <ul className="mt-4 divide-y divide-brand-border border-t border-brand-border">
                      {arestas.map((l) => (
                        <li key={`${l.idOrigem}-${l.idDestino}`} className="flex items-center justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <p className="text-sm text-brand-darker">
                              <span className="font-semibold">{l.origem.nome}</span>
                              <span className="mx-2 text-brand-muted">→</span>
                              <span className="font-semibold">{l.destino.nome}</span>
                            </p>
                            <p className="text-xs text-brand-muted">{l.origem.nome} depende de {l.destino.nome} · {formatDateTime(l.criadaEm)}</p>
                          </div>
                          <Button
                            type="button"
                            variant="danger-outline"
                            size="sm"
                            disabled={desligar.isPending}
                            onClick={() => desligar.mutate({ origem: l.idOrigem, destino: l.idDestino })}
                          >
                            <Unlink className="h-3.5 w-3.5" />
                            Desligar
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardBody>
            </Card>
          </div>

          <Card className="xl:sticky xl:top-4">
            <CardHeader title="Quem cai junto" description="Escolha o software que caiu." />
            <CardBody className="space-y-4">
              <Field label="Software que caiu">
                {(id) => (
                  <Select
                    id={id}
                    options={opcoes}
                    placeholder={lista.length ? 'Selecione' : 'Nenhum software'}
                    value={caidoId == null ? '' : String(caidoId)}
                    onChange={(e) => setCaidoId(e.target.value ? Number(e.target.value) : null)}
                  />
                )}
              </Field>
              {caidoId == null ? (
                <p className="text-sm text-brand-muted">O impacto percorre quem depende dele, direto e indireto.</p>
              ) : impacto.isLoading ? (
                <p className="text-sm text-brand-muted">Calculando impacto…</p>
              ) : impacto.isError ? (
                <ErrorState message="Não foi possível calcular o impacto." onRetry={() => void impacto.refetch()} />
              ) : impacto.data && impacto.data.afetados.length === 0 ? (
                <p className="text-sm text-brand-darker">Nada mais cai junto com {impacto.data.ativo.nome}.</p>
              ) : (
                <div className="space-y-3">
                  {porNivel.map(([nivel, itens]) => (
                    <div key={nivel}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                        Nível {nivel}
                        {nivel === 1 ? ' — depende direto' : ' — depende de alguém do nível anterior'}
                      </p>
                      <ul className="mt-1 space-y-1">
                        {itens.map((a) => (
                          <li key={a.id} className="rounded-md border border-brand-border bg-slate-50 px-3 py-2 text-sm font-medium text-brand-darker">
                            {a.nome}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
