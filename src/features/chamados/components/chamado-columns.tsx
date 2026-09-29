import Link from 'next/link';
import { Eye } from 'lucide-react';
import { CellStack, type Column } from '@/components/ui/data-table';
import { formatDateTime } from '@/lib/format';
import type { Chamado } from '@/types';
import { PriorityBadge, SlaIndicator, StatusBadge } from './chamado-badges';

type Key = 'id' | 'assunto' | 'solicitante' | 'tecnico' | 'prioridade' | 'prioridadeInline' | 'status' | 'sla' | 'slaCompact' | 'abertoEm' | 'ver';

const ALL: Record<Key, Column<Chamado>> = {
  id: { key: 'id', header: 'ID', cell: (c) => <span className="font-bold">#{c.id}</span>, className: 'w-24' },
  assunto: {
    key: 'assunto',
    header: 'Assunto',
    cell: (c) => <CellStack title={c.titulo} subtitle={c.categoriaNome} className="max-w-[320px]" />,
  },
  solicitante: { key: 'solicitante', header: 'Solicitante', cell: (c) => c.solicitanteNome },
  tecnico: {
    key: 'tecnico',
    header: 'Técnico',
    cell: (c) => c.tecnicoNome ?? <span className="italic text-brand-muted">Não atribuído</span>,
  },
  prioridade: { key: 'prioridade', header: 'Prioridade', cell: (c) => <PriorityBadge prioridade={c.prioridade} /> },
  prioridadeInline: { key: 'prioridade', header: 'Prioridade', cell: (c) => <PriorityBadge prioridade={c.prioridade} variant="inline" /> },
  status: { key: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
  sla: {
    key: 'sla',
    header: 'SLA',
    cell: (c) =>
      c.status === 'RESOLVIDO' || c.status === 'CONCLUIDO' ? (
        <span className="text-xs text-brand-muted">Encerrado</span>
      ) : (
        <SlaIndicator restanteMin={c.slaRestanteMin} totalMin={c.slaTotalMin} pausado={c.slaPausado} />
      ),
  },
  slaCompact: {
    key: 'sla',
    header: 'SLA',
    cell: (c) =>
      c.status === 'RESOLVIDO' || c.status === 'CONCLUIDO' ? (
        <span className="text-xs text-brand-muted">Resolvido</span>
      ) : (
        <SlaIndicator restanteMin={c.slaRestanteMin} totalMin={c.slaTotalMin} pausado={c.slaPausado} compact />
      ),
  },
  abertoEm: { key: 'abertoEm', header: 'Data Abertura', cell: (c) => <span className="text-xs">{formatDateTime(c.abertoEm)}</span>, align: 'right' },
  ver: {
    key: 'ver',
    header: <span className="sr-only">Ações</span>,
    align: 'right',
    cell: (c) => (
      <Link href={`/chamados/${c.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex rounded-md p-1.5 text-brand-muted hover:bg-slate-100 hover:text-brand-primary" aria-label={`Abrir chamado ${c.id}`}>
        <Eye className="h-4 w-4" />
      </Link>
    ),
  },
};

/** Monta colunas de chamados reutilizáveis na Fila, Triagem, Dashboard e Relatórios. */
export function chamadoColumns(keys: Key[]): Column<Chamado>[] {
  return keys.map((k) => ALL[k]);
}
