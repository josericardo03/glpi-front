'use client';

import Link from 'next/link';
import { memo, useMemo, useState, type DragEvent } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Chamado, StatusChamado } from '@/types';
import { PriorityBadge, SlaIndicator, STATUS_META } from './chamado-badges';

const COLUMNS: StatusChamado[] = ['NOVO', 'EM_ATENDIMENTO', 'PENDENTE', 'RESOLVIDO', 'CONCLUIDO'];

interface KanbanBoardProps {
  chamados: Chamado[];
  onMove: (id: number, status: StatusChamado) => void;
}

const KanbanCard = memo(function KanbanCard({ c }: { c: Chamado }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(c.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="cursor-grab rounded-md border border-brand-border bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <Link href={`/chamados/${c.id}`} className="text-xs font-bold text-brand-primary hover:underline">
          #{c.id}
        </Link>
        <PriorityBadge prioridade={c.prioridade} />
      </div>
      <p className="line-clamp-2 text-sm font-medium text-brand-darker">{c.titulo}</p>
      <p className="mt-0.5 truncate text-xs text-brand-muted">{c.categoriaNome}</p>
      <div className="mt-3 flex items-center justify-between">
        {c.tecnicoNome ? <Avatar name={c.tecnicoNome} size="xs" /> : <span className="text-[11px] italic text-brand-muted">Sem técnico</span>}
        {c.status !== 'RESOLVIDO' && c.status !== 'CONCLUIDO' && (
          <SlaIndicator restanteMin={c.slaRestanteMin} totalMin={c.slaTotalMin} pausado={c.slaPausado} compact />
        )}
      </div>
    </div>
  );
});

/** Kanban drag-and-drop com HTML5 DnD nativo (sem bibliotecas extras). */
export function KanbanBoard({ chamados, onMove }: KanbanBoardProps) {
  const [over, setOver] = useState<StatusChamado | null>(null);
  const grouped = useMemo(() => {
    const g = Object.fromEntries(COLUMNS.map((s) => [s, [] as Chamado[]])) as Record<StatusChamado, Chamado[]>;
    chamados.forEach((c) => g[c.status].push(c));
    return g;
  }, [chamados]);

  function onDrop(e: DragEvent, status: StatusChamado) {
    e.preventDefault();
    setOver(null);
    const id = Number(e.dataTransfer.getData('text/plain'));
    const c = chamados.find((x) => x.id === id);
    if (c && c.status !== status) onMove(id, status);
  }

  return (
    <div className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-2">
      {COLUMNS.map((s) => (
        <section
          key={s}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(s);
          }}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => onDrop(e, s)}
          className={cn('flex min-h-[420px] flex-col rounded-lg border-t-4 bg-slate-100/80 p-3 transition-colors', over === s && 'bg-blue-50 ring-2 ring-brand-accent/40')}
          style={{ borderTopColor: STATUS_META[s].color }}
        >
          <header className="mb-3 flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wide text-brand-darker">{STATUS_META[s].label}</h3>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-brand-muted">{grouped[s].length}</span>
          </header>
          <div className="flex flex-1 flex-col gap-2.5">
            {grouped[s].map((c) => (
              <KanbanCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
