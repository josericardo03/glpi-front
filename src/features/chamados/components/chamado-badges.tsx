import { AlertCircle, ChevronDown, ChevronUp, ChevronsUp, Minus, PauseCircle } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatMinutes } from '@/lib/format';
import type { MotivoPausa, Prioridade, StatusChamado } from '@/types';

export const STATUS_META: Record<StatusChamado, { label: string; tone: BadgeTone; color: string }> = {
  NOVO: { label: 'Novo', tone: 'novo', color: '#3B82F6' },
  EM_ATENDIMENTO: { label: 'Em Atendimento', tone: 'atendimento', color: '#8B5CF6' },
  PENDENTE: { label: 'Pendente', tone: 'pendente', color: '#F59E0B' },
  RESOLVIDO: { label: 'Resolvido', tone: 'resolvido', color: '#10B981' },
  CONCLUIDO: { label: 'Concluído', tone: 'concluido', color: '#059669' },
};

export const PRIORIDADE_META: Record<Prioridade, { label: string; tone: BadgeTone; icon: typeof AlertCircle; text: string }> = {
  CRITICA: { label: 'Crítica', tone: 'danger', icon: AlertCircle, text: 'text-prio-critica' },
  ALTA: { label: 'Alta', tone: 'warning', icon: ChevronsUp, text: 'text-prio-alta' },
  MEDIA: { label: 'Média', tone: 'pendente', icon: ChevronUp, text: 'text-prio-media' },
  BAIXA: { label: 'Baixa', tone: 'neutral', icon: Minus, text: 'text-prio-baixa' },
};

export const STATUS_OPTIONS = (Object.keys(STATUS_META) as StatusChamado[]).map((s) => ({ value: s, label: STATUS_META[s].label }));

/** Máquina de estados do backend (`assertTransicao`). */
export const TRANSICOES: Record<StatusChamado, StatusChamado[]> = {
  NOVO: ['EM_ATENDIMENTO', 'PENDENTE'],
  EM_ATENDIMENTO: ['PENDENTE', 'RESOLVIDO'],
  PENDENTE: ['EM_ATENDIMENTO'],
  RESOLVIDO: ['CONCLUIDO'],
  CONCLUIDO: [],
};

export const MOTIVOS_PAUSA: { value: MotivoPausa; label: string }[] = [
  { value: 'AGUARDANDO_SOLICITANTE', label: 'Aguardando solicitante' },
  { value: 'AGUARDANDO_TERCEIRO', label: 'Aguardando terceiro' },
  { value: 'FORNECEDOR_EXTERNO', label: 'Fornecedor externo' },
  { value: 'MANUTENCAO_PROGRAMADA', label: 'Manutenção programada' },
];
export const PRIORIDADE_OPTIONS = (Object.keys(PRIORIDADE_META) as Prioridade[]).map((p) => ({ value: p, label: PRIORIDADE_META[p].label }));

export function StatusBadge({ status, className }: { status: StatusChamado; className?: string }) {
  const m = STATUS_META[status];
  return (
    <Badge tone={m.tone} dot className={className}>
      {m.label}
    </Badge>
  );
}

export function PriorityBadge({ prioridade, variant = 'badge' }: { prioridade: Prioridade; variant?: 'badge' | 'inline' }) {
  const m = PRIORIDADE_META[prioridade];
  if (variant === 'badge') return <Badge tone={m.tone}>{m.label}</Badge>;
  const Icon = m.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-bold uppercase', m.text)}>
      <Icon className="h-3.5 w-3.5" />
      {m.label}
    </span>
  );
}

export function slaState(restanteMin: number, totalMin: number) {
  if (restanteMin < 0) return { label: 'SLA vencido', tone: 'danger' as const, text: 'text-status-critica' };
  if (restanteMin / totalMin <= 0.25) return { label: 'Perto de vencer', tone: 'warning' as const, text: 'text-status-pendente' };
  return { label: 'No prazo', tone: 'success' as const, text: 'text-emerald-600' };
}

interface SlaIndicatorProps {
  restanteMin: number;
  totalMin: number;
  pausado?: boolean;
  compact?: boolean;
}

/** Barra + tempo restante do SLA (usado na Triagem, Fila e Workspace). */
export function SlaIndicator({ restanteMin, totalMin, pausado, compact }: SlaIndicatorProps) {
  if (pausado) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-pendente">
        <PauseCircle className="h-4 w-4" /> SLA pausado
      </span>
    );
  }
  const s = slaState(restanteMin, totalMin);
  const consumido = Math.min(totalMin, totalMin - restanteMin);
  if (compact) return <span className={cn('font-mono text-sm font-semibold', s.text)}>{formatMinutes(restanteMin)}</span>;
  return (
    <div className="w-40">
      <div className="flex items-center justify-between gap-2">
        <Progress value={consumido} max={totalMin} tone={s.tone} size="sm" className="flex-1" />
        <span className={cn('shrink-0 font-mono text-xs font-bold', s.text)}>{formatMinutes(restanteMin)}</span>
      </div>
      <p className={cn('mt-1 text-[10px] font-semibold uppercase tracking-wide', s.text)}>{s.label}</p>
    </div>
  );
}

export function PrioridadeIcon({ prioridade }: { prioridade: Prioridade }) {
  const Icon = prioridade === 'BAIXA' ? ChevronDown : PRIORIDADE_META[prioridade].icon;
  return <Icon className={cn('h-4 w-4', PRIORIDADE_META[prioridade].text)} />;
}
