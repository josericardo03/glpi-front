'use client';

import { cn } from '@/lib/utils';
import type { Afetado, Ligacao, Ponta } from '../mapa.service';

const COL_W = 220;
const ROW_H = 78;
const BOX_W = 168;
const BOX_H = 52;
const PAD_X = 28;
const PAD_Y = 56;

interface No {
  id: number;
  nome: string;
}

interface LayoutNo extends No {
  x: number;
  y: number;
}

function ranks(nos: No[], arestas: { de: number; para: number }[]) {
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

export function montarLayout(nos: No[], arestas: { de: number; para: number }[]) {
  const nivel = ranks(nos, arestas);
  const max = Math.max(0, ...[...nivel.values()]);
  const colunas = new Map<number, No[]>();
  for (const no of [...nos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))) {
    const coluna = max - (nivel.get(no.id) ?? 0);
    const lista = colunas.get(coluna) ?? [];
    lista.push(no);
    colunas.set(coluna, lista);
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

export function MapaGrafo({
  ligacoes,
  caidoId,
  afetados,
  onEscolher,
}: {
  ligacoes: Ligacao[];
  caidoId: number | null;
  afetados: Afetado[];
  onEscolher: (id: number) => void;
}) {
  const porId = new Map<number, Ponta>();
  for (const l of ligacoes) {
    porId.set(l.origem.id, l.origem);
    porId.set(l.destino.id, l.destino);
  }
  const nos = [...porId.values()].map((p) => ({ id: p.id, nome: p.nome }));
  const arestas = ligacoes.map((l) => ({ de: l.idOrigem, para: l.idDestino }));
  const layout = montarLayout(nos, arestas);
  const pos = new Map(layout.nos.map((n) => [n.id, n]));
  const niveis = new Map(afetados.map((a) => [a.id, a.nivel]));

  return (
    <div className="overflow-x-auto">
      <div className="relative" style={{ width: layout.largura, height: layout.altura }}>
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
            return (
              <path
                key={`${l.idOrigem}-${l.idDestino}`}
                d={d}
                fill="none"
                stroke={cor}
                strokeWidth={caidoId != null && (l.idDestino === caidoId || niveis.has(l.idOrigem)) ? 2.5 : 1.5}
                markerEnd={marcador}
              />
            );
          })}
        </svg>
        {layout.nos.map((no) => {
          const nivel = niveis.get(no.id);
          const caido = no.id === caidoId;
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
  );
}
