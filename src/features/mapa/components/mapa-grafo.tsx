'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Afetado, Ligacao, Ponta } from '../mapa.service';

const COL_W = 220;
const ROW_H = 78;
const BOX_W = 168;
const BOX_H = 52;
const PAD_X = 28;
const PAD_Y = 56;

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 1.6;
const ZOOM_PASSO = 0.1;

interface No {
  id: number;
  nome: string;
}

interface LayoutNo extends No {
  x: number;
  y: number;
}

type Aresta = { de: number; para: number };

function ranks(nos: No[], arestas: Aresta[]) {
  const saidas = new Map<number, number[]>();
  for (const a of arestas) {
    const lista = saidas.get(a.de) ?? [];
    lista.push(a.para);
    saidas.set(a.de, lista);
  }
  const memo = new Map<number, number>();
  const visitando = new Set<number>();
  const rank = (id: number): number => {
    const ja = memo.get(id);
    if (ja != null) return ja;
    if (visitando.has(id)) return 0;
    visitando.add(id);
    const destinos = saidas.get(id) ?? [];
    const valor = destinos.length ? 1 + Math.max(...destinos.map(rank)) : 0;
    visitando.delete(id);
    memo.set(id, valor);
    return valor;
  };
  nos.forEach((n) => rank(n.id));
  return memo;
}

const porNome = (a: No, b: No) => a.nome.localeCompare(b.nome, 'pt-BR');

/**
 * Distribui os nós em colunas (quem sustenta fica à direita) e ordena cada coluna pela posição média dos
 * vizinhos (método do baricentro), o que reduz o cruzamento de setas em mapas maiores.
 */
export function montarLayout(nos: No[], arestas: Aresta[]) {
  const nivel = ranks(nos, arestas);
  const max = Math.max(0, ...[...nivel.values()]);
  const colunaDe = new Map<number, number>();
  const colunas = new Map<number, No[]>();
  for (const no of [...nos].sort(porNome)) {
    const coluna = max - (nivel.get(no.id) ?? 0);
    colunaDe.set(no.id, coluna);
    const lista = colunas.get(coluna) ?? [];
    lista.push(no);
    colunas.set(coluna, lista);
  }

  const vizinhos = new Map<number, number[]>();
  for (const a of arestas) {
    vizinhos.set(a.de, [...(vizinhos.get(a.de) ?? []), a.para]);
    vizinhos.set(a.para, [...(vizinhos.get(a.para) ?? []), a.de]);
  }
  const indices = [...colunas.keys()].sort((a, b) => a - b);

  // Posição vertical normalizada (0..1) de cada nó na ordem atual, comparável entre colunas de tamanhos diferentes.
  const posicaoNormalizada = () => {
    const mapa = new Map<number, number>();
    for (const lista of colunas.values()) {
      lista.forEach((no, i) => mapa.set(no.id, lista.length > 1 ? i / (lista.length - 1) : 0.5));
    }
    return mapa;
  };

  const ordenarColuna = (coluna: number, sentido: 'esquerda' | 'direita') => {
    const lista = colunas.get(coluna);
    if (!lista || lista.length < 2) return;
    const pos = posicaoNormalizada();
    const peso = new Map<number, number>();
    for (const no of lista) {
      const alvo = (vizinhos.get(no.id) ?? []).filter((v) => {
        const c = colunaDe.get(v) ?? coluna;
        return sentido === 'esquerda' ? c < coluna : c > coluna;
      });
      peso.set(no.id, alvo.length ? alvo.reduce((soma, v) => soma + (pos.get(v) ?? 0.5), 0) / alvo.length : (pos.get(no.id) ?? 0.5));
    }
    lista.sort((a, b) => (peso.get(a.id)! - peso.get(b.id)!) || porNome(a, b));
  };

  for (let volta = 0; volta < 4; volta++) {
    for (const c of indices) ordenarColuna(c, 'esquerda');
    for (const c of [...indices].reverse()) ordenarColuna(c, 'direita');
  }

  const maiorColuna = Math.max(1, ...[...colunas.values()].map((c) => c.length));
  const pos = new Map<number, LayoutNo>();
  for (const [coluna, lista] of colunas) {
    const folga = ((maiorColuna - lista.length) * ROW_H) / 2;
    lista.forEach((no, i) => {
      pos.set(no.id, {
        ...no,
        x: PAD_X + coluna * COL_W + BOX_W / 2,
        y: PAD_Y + folga + i * ROW_H + BOX_H / 2,
      });
    });
  }
  return {
    nos: [...pos.values()],
    largura: PAD_X * 2 + Math.max(1, colunas.size) * COL_W - (COL_W - BOX_W),
    altura: PAD_Y * 2 + maiorColuna * ROW_H - (ROW_H - BOX_H),
  };
}

function corAresta(l: Ligacao, caidoId: number | null, niveis: Map<number, number>) {
  if (caidoId == null) return '#94a3b8';
  if (l.idDestino === caidoId) return '#dc2626';
  const nivel = niveis.get(l.idOrigem);
  if (nivel != null && nivel > 1) return '#d97706';
  return '#cbd5e1';
}

const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export function MapaGrafo({
  ligacoes,
  caidoId,
  afetados,
  onEscolher,
  busca = '',
}: {
  ligacoes: Ligacao[];
  caidoId: number | null;
  afetados: Afetado[];
  onEscolher: (id: number) => void;
  /** Texto digitado na busca do mapa: destaca os softwares que combinam e esmaece os demais. */
  busca?: string;
}) {
  const layout = useMemo(() => {
    const porId = new Map<number, Ponta>();
    for (const l of ligacoes) {
      porId.set(l.origem.id, l.origem);
      porId.set(l.destino.id, l.destino);
    }
    const nos = [...porId.values()].map((p) => ({ id: p.id, nome: p.nome }));
    return montarLayout(nos, ligacoes.map((l) => ({ de: l.idOrigem, para: l.idDestino })));
  }, [ligacoes]);
  const pos = useMemo(() => new Map(layout.nos.map((n) => [n.id, n])), [layout]);
  const niveis = useMemo(() => new Map(afetados.map((a) => [a.id, a.nivel])), [afetados]);

  const termo = normalizar(busca);
  const combinam = useMemo(
    () => new Set(termo ? layout.nos.filter((n) => normalizar(n.nome).includes(termo)).map((n) => n.id) : []),
    [layout, termo],
  );

  const [zoom, setZoom] = useState(1);
  const area = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [arrastando, setArrastando] = useState(false);

  const ajustar = useCallback(() => {
    const largura = area.current?.clientWidth;
    if (!largura) return;
    setZoom(Math.min(1, Math.max(ZOOM_MIN, Number(((largura - 4) / layout.largura).toFixed(2)))));
    area.current?.scrollTo({ left: 0, top: 0 });
  }, [layout.largura]);

  const mudarZoom = (delta: number) => setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number((z + delta).toFixed(2)))));

  // Ao buscar, leva o primeiro software encontrado para o centro da área visível.
  useEffect(() => {
    if (!termo || !area.current) return;
    const primeiro = layout.nos.filter((n) => combinam.has(n.id)).sort((a, b) => a.x - b.x || a.y - b.y)[0];
    if (!primeiro) return;
    area.current.scrollTo({
      left: Math.max(0, primeiro.x * zoom - area.current.clientWidth / 2),
      top: Math.max(0, primeiro.y * zoom - area.current.clientHeight / 2),
      behavior: 'smooth',
    });
    // zoom fora das dependências de propósito: mexer no zoom não deve reposicionar a rolagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo, combinam, layout]);

  function aoPressionar(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button') || !area.current) return;
    arrasto.current = { x: e.clientX, y: e.clientY, left: area.current.scrollLeft, top: area.current.scrollTop };
    setArrastando(true);
    area.current.setPointerCapture(e.pointerId);
  }

  function aoMover(e: PointerEvent<HTMLDivElement>) {
    const a = arrasto.current;
    if (!a || !area.current) return;
    area.current.scrollLeft = a.left - (e.clientX - a.x);
    area.current.scrollTop = a.top - (e.clientY - a.y);
  }

  function aoSoltar(e: PointerEvent<HTMLDivElement>) {
    arrasto.current = null;
    setArrastando(false);
    if (area.current?.hasPointerCapture(e.pointerId)) area.current.releasePointerCapture(e.pointerId);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-brand-muted">
          {termo ? (combinam.size ? `${combinam.size} encontrado(s)` : 'Nenhum software com esse nome neste mapa') : 'Arraste o fundo para mover o desenho.'}
        </p>
        <div className="flex items-center gap-1" role="group" aria-label="Zoom do mapa">
          <Button type="button" variant="outline" size="sm" aria-label="Diminuir zoom" disabled={zoom <= ZOOM_MIN} onClick={() => mudarZoom(-ZOOM_PASSO)}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-11 text-center text-xs tabular-nums text-brand-muted" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <Button type="button" variant="outline" size="sm" aria-label="Aumentar zoom" disabled={zoom >= ZOOM_MAX} onClick={() => mudarZoom(ZOOM_PASSO)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="outline" size="sm" aria-label="Ajustar à largura" title="Ajustar à largura" onClick={ajustar}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div
        ref={area}
        className={cn('max-h-[640px] overflow-auto rounded-md border border-brand-border/60', arrastando ? 'cursor-grabbing select-none' : 'cursor-grab')}
        onPointerDown={aoPressionar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
      >
        <div style={{ width: layout.largura * zoom, height: layout.altura * zoom }}>
          <div className="relative origin-top-left" style={{ width: layout.largura, height: layout.altura, transform: `scale(${zoom})` }}>
            <svg className="absolute inset-0" width={layout.largura} height={layout.altura} aria-hidden>
              <defs>
                <marker id="mapa-seta" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="#94a3b8" />
                </marker>
                <marker id="mapa-seta-red" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="#dc2626" />
                </marker>
                <marker id="mapa-seta-amber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="#d97706" />
                </marker>
              </defs>
              {ligacoes.map((l) => {
                const de = pos.get(l.idOrigem);
                const para = pos.get(l.idDestino);
                if (!de || !para) return null;
                const x1 = de.x + BOX_W / 2;
                const x2 = para.x - BOX_W / 2 - 2;
                const cor = corAresta(l, caidoId, niveis);
                const marcador = cor === '#dc2626' ? 'url(#mapa-seta-red)' : cor === '#d97706' ? 'url(#mapa-seta-amber)' : 'url(#mapa-seta)';
                const salta = Math.abs(x2 - x1) > COL_W;
                const d = salta
                  ? `M ${x1} ${de.y} C ${x1 + 48} ${de.y - 42}, ${x2 - 48} ${para.y - 42}, ${x2} ${para.y}`
                  : `M ${x1} ${de.y} L ${x2} ${para.y}`;
                const esmaecida = termo !== '' && !combinam.has(l.idOrigem) && !combinam.has(l.idDestino);
                return (
                  <path
                    key={`${l.idOrigem}-${l.idDestino}`}
                    d={d}
                    fill="none"
                    stroke={cor}
                    strokeWidth={caidoId != null && (l.idDestino === caidoId || niveis.has(l.idOrigem)) ? 2.5 : 1.5}
                    opacity={esmaecida ? 0.25 : 1}
                    markerEnd={marcador}
                  />
                );
              })}
            </svg>
            {layout.nos.map((no) => {
              const nivel = niveis.get(no.id);
              const caido = no.id === caidoId;
              const achado = combinam.has(no.id);
              return (
                <button
                  key={no.id}
                  type="button"
                  onClick={() => onEscolher(no.id)}
                  className={cn(
                    'absolute flex items-center justify-center rounded-lg border px-3 text-center text-sm font-semibold shadow-sm transition-colors',
                    caido && 'border-red-400 bg-red-50 text-red-900 ring-2 ring-red-200',
                    !caido && nivel === 1 && 'border-amber-400 bg-amber-50 text-amber-950',
                    !caido && nivel != null && nivel > 1 && 'border-sky-400 bg-sky-50 text-sky-950',
                    !caido && nivel == null && 'border-brand-border bg-white text-brand-darker hover:border-brand-primary',
                    achado && 'ring-2 ring-brand-accent',
                    termo !== '' && !achado && !caido && nivel == null && 'opacity-40',
                  )}
                  style={{ width: BOX_W, height: BOX_H, left: no.x - BOX_W / 2, top: no.y - BOX_H / 2 }}
                  aria-pressed={caido}
                >
                  <span className="line-clamp-2 leading-tight">{no.nome}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
