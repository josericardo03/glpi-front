'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Copy, Link2, Network, Pencil, Plus, Search, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/form';
import { ConfirmModal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/format';
import { MapaBarra } from './mapa-barra';
import { MapaGrafo } from './mapa-grafo';
import { SoftwareCombobox } from './software-combobox';
import { SoftwareEditar } from './software-editar';
import type { Ligacao, Software } from '../mapa.service';
import { useCadastrarSoftware, useDesligar, useImpacto, useLigacoes, useLigar, useMapas } from '../use-mapa';

const CHAVE_MAPA = 'itsm:mapa-aberto';

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
  const toast = useToast();
  const mapas = useMapas();
  const [mapaId, setMapaId] = useState<number | null>(null);
  const listaMapas = mapas.data ?? [];
  // O mapa lembrado pode ter sido apagado: cai no primeiro que existir.
  const mapaAtual = listaMapas.find((m) => m.id === mapaId) ?? listaMapas[0] ?? null;
  const ligacoes = useLigacoes(mapaAtual?.id ?? null);
  const cadastrar = useCadastrarSoftware();
  const ligar = useLigar();
  const desligar = useDesligar();

  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoEditado, setCodigoEditado] = useState(false);
  const [origem, setOrigem] = useState<Software | null>(null);
  const [destino, setDestino] = useState<Software | null>(null);
  const [caidoId, setCaidoId] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const [editandoSoftware, setEditandoSoftware] = useState(false);
  const [desligando, setDesligando] = useState<Ligacao | null>(null);

  const impacto = useImpacto(caidoId, mapaAtual?.id ?? null);
  const arestas = useMemo(() => ligacoes.data ?? [], [ligacoes.data]);
  // Só os softwares que aparecem neste mapa podem ser marcados como "caiu".
  const opcoesDoMapa = useMemo(() => {
    const vistos = new Map<number, string>();
    for (const a of arestas) {
      vistos.set(a.origem.id, a.origem.nome);
      vistos.set(a.destino.id, a.destino.nome);
    }
    return [...vistos.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [arestas]);
  const porNivel = useMemo(() => {
    const grupos = new Map<number, { id: number; nome: string }[]>();
    for (const a of impacto.data?.afetados ?? []) {
      const listaNivel = grupos.get(a.nivel) ?? [];
      listaNivel.push(a);
      grupos.set(a.nivel, listaNivel);
    }
    return [...grupos.entries()].sort((a, b) => a[0] - b[0]);
  }, [impacto.data]);

  const afetados = impacto.data?.afetados ?? [];
  const carregando = mapas.isLoading || (mapaAtual != null && ligacoes.isLoading);
  const erro = mapas.error ?? ligacoes.error;

  useEffect(() => {
    try {
      const salvo = Number(window.localStorage.getItem(CHAVE_MAPA));
      if (salvo > 0) setMapaId(salvo);
    } catch {
      /* sem armazenamento: abre o primeiro mapa */
    }
  }, []);

  function escolherMapa(id: number) {
    setMapaId(id);
    setCaidoId(null);
    setBusca('');
    try {
      window.localStorage.setItem(CHAVE_MAPA, String(id));
    } catch {
      /* preferência opcional */
    }
  }

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
    if (!origem || !destino || !mapaAtual) return;
    ligar.mutate({ origem: origem.id, destino: destino.id, idMapa: mapaAtual.id }, { onSuccess: () => { setOrigem(null); setDestino(null); } });
  }

  function aoConfirmarDesligar() {
    if (!desligando) return;
    desligar.mutate({ origem: desligando.idOrigem, destino: desligando.idDestino }, { onSuccess: () => setDesligando(null) });
  }

  async function copiarImpacto() {
    if (!impacto.data || !mapaAtual) return;
    const linhas = [`Impacto da queda de ${impacto.data.ativo.nome} (mapa ${mapaAtual.nome})`];
    for (const [nivel, itens] of porNivel) linhas.push(`Nível ${nivel}: ${itens.map((i) => i.nome).join(', ')}`);
    linhas.push(`Total: ${afetados.length} software(s) afetado(s)`);
    try {
      await navigator.clipboard.writeText(linhas.join('\n'));
      toast.success('Lista copiada.');
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Mapa de software"
        description="Cada mapa guarda as dependências de um sistema ou área. A origem depende do destino: a seta sai de quem usa e aponta para o que sustenta. Quando o destino cai, quem depende dele aparece como afetado."
        breadcrumbs={[{ label: 'Operação' }, { label: 'Mapa de software' }]}
      />

      {carregando ? (
        <PageLoader />
      ) : erro ? (
        <ErrorState message="Não foi possível carregar o mapa." onRetry={() => { void mapas.refetch(); void ligacoes.refetch(); }} />
      ) : (
        <>
        <MapaBarra mapas={listaMapas} atual={mapaAtual} onEscolher={escolherMapa} />
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader
                  title="Cadastrar software"
                  description="Fica disponível para qualquer mapa."
                  icon={<Plus className="h-4 w-4" />}
                  actions={
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditandoSoftware(true)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  }
                />
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
                <CardHeader title="Ligar dois softwares" description={mapaAtual ? `Entra no mapa "${mapaAtual.nome}". Quem depende fica na origem.` : 'Crie um mapa para ligar softwares.'} icon={<Link2 className="h-4 w-4" />} />
                <CardBody>
                  <form className="space-y-3" onSubmit={aoLigar}>
                    <Field label="Origem — quem depende">
                      {(id) => <SoftwareCombobox id={id} valor={origem} onChange={setOrigem} excluirId={destino?.id} disabled={!mapaAtual} />}
                    </Field>
                    <Field label="Destino — do que depende">
                      {(id) => <SoftwareCombobox id={id} valor={destino} onChange={setDestino} excluirId={origem?.id} disabled={!mapaAtual} />}
                    </Field>
                    <Button type="submit" disabled={ligar.isPending || !origem || !destino || !mapaAtual}>
                      {ligar.isPending ? 'Ligando…' : 'Ligar'}
                    </Button>
                  </form>
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader
                title={mapaAtual ? mapaAtual.nome : 'Mapa'}
                description="Clique em um software para ver quem cai junto."
                icon={<Network className="h-4 w-4" />}
              />
              <CardBody>
                {!mapaAtual ? (
                  <EmptyState
                    icon={<Network className="h-6 w-6" />}
                    title="Nenhum mapa criado"
                    description="Use “Novo mapa” para criar o primeiro, por exemplo um para cada sistema ou área."
                  />
                ) : arestas.length === 0 ? (
                  <EmptyState
                    icon={<Network className="h-6 w-6" />}
                    title="Nenhuma dependência neste mapa"
                    description="Ligue dois softwares para desenhar a seta da origem até o destino."
                  />
                ) : (
                  <>
                    <div className="mb-3">
                      <Input leftIcon={<Search className="h-4 w-4" />} aria-label="Buscar software no mapa" placeholder="Buscar software neste mapa" value={busca} onChange={(e) => setBusca(e.target.value)} />
                    </div>
                    <MapaGrafo ligacoes={arestas} caidoId={caidoId} afetados={afetados} onEscolher={setCaidoId} busca={busca} />
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
                                                        onClick={() => setDesligando(l)}
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
                    options={opcoesDoMapa}
                    placeholder={opcoesDoMapa.length ? 'Selecione' : 'Nenhum software neste mapa'}
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
              ) : impacto.data && afetados.length === 0 ? (
                <p className="text-sm text-brand-darker">Nada mais cai junto com {impacto.data.ativo.nome}.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-brand-darker">
                      {afetados.length} afetado(s)
                      <span className="ml-1 font-normal text-brand-muted">· {afetados.filter((a) => a.nivel === 1).length} direto(s)</span>
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={() => void copiarImpacto()}>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar
                    </Button>
                  </div>
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
        </>
      )}

      {editandoSoftware && <SoftwareEditar onClose={() => setEditandoSoftware(false)} />}

      <ConfirmModal
        open={desligando != null}
        onClose={() => setDesligando(null)}
        onConfirm={aoConfirmarDesligar}
        loading={desligar.isPending}
        title="Desligar dependência"
        confirmLabel="Desligar"
      >
        {desligando && (
          <p>
            Remover a dependência <strong>{desligando.origem.nome}</strong> → <strong>{desligando.destino.nome}</strong>? Os dois softwares continuam cadastrados.
          </p>
        )}
      </ConfirmModal>
    </div>
  );
}
