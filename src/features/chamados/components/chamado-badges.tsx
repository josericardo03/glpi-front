import { AlertCircle, ChevronUp, ChevronsUp, Minus, PauseCircle } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatMinutes } from '@/lib/format';
import type { Chamado, MotivoPausa, Prioridade, StatusChamado } from '@/types';
import { STATUS_LABEL } from '../utils/transicoes';

export const STATUS_META: Record<StatusChamado, { label: string; tone: BadgeTone; color: string }> = {
  NOVO: { label: STATUS_LABEL.NOVO, tone: 'novo', color: '#3B82F6' },
  EM_ATENDIMENTO: { label: STATUS_LABEL.EM_ATENDIMENTO, tone: 'atendimento', color: '#8B5CF6' },
  PENDENTE: { label: STATUS_LABEL.PENDENTE, tone: 'pendente', color: '#F59E0B' },
  RESOLVIDO: { label: STATUS_LABEL.RESOLVIDO, tone: 'resolvido', color: '#10B981' },
  CONCLUIDO: { label: STATUS_LABEL.CONCLUIDO, tone: 'concluido', color: '#059669' },
};

export const PRIORIDADE_META: Record<Prioridade, { label: string; tone: BadgeTone; icon: typeof AlertCircle; text: string }> = {
  CRITICA: { label: 'Crítica', tone: 'danger', icon: AlertCircle, text: 'text-prio-critica' },
  ALTA: { label: 'Alta', tone: 'warning', icon: ChevronsUp, text: 'text-prio-alta' },
  MEDIA: { label: 'Média', tone: 'pendente', icon: ChevronUp, text: 'text-prio-media' },
  BAIXA: { label: 'Baixa', tone: 'neutral', icon: Minus, text: 'text-prio-baixa' },
};

export const STATUS_OPTIONS = (Object.keys(STATUS_META) as StatusChamado[]).map((s) => ({ value: s, label: STATUS_META[s].label }));

export { isFinalizado, TRANSICOES, transicoesComuns } from '../utils/transicoes';

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
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {m.label}
    </span>
  );
}

export const slaVencido = (c: Pick<Chamado, 'slaVencido' | 'slaRestanteMin'>) => c.slaVencido || (c.slaRestanteMin !== null && c.slaRestanteMin < 0);

export function slaState(restanteMin: number, totalMin: number) {
  if (restanteMin < 0) return { label: 'SLA vencido', tone: 'danger' as const, text: 'text-status-critica' };
  if (restanteMin / totalMin <= 0.25) return { label: 'Perto de vencer', tone: 'warning' as const, text: 'text-status-pendente' };
  return { label: 'No prazo', tone: 'success' as const, text: 'text-emerald-600' };
}

interface SlaIndicatorProps {
  restanteMin: number | null;
  totalMin: number | null;
  pausado?: boolean;
  compact?: boolean;
}

/** Barra + tempo restante do SLA (usado na Triagem, Fila e Workspace). */
export function SlaIndicator({ restanteMin, totalMin, pausado, compact }: SlaIndicatorProps) {
  if (pausado) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-pendente">
        <PauseCircle aria-hidden className="h-4 w-4" /> SLA pausado
      </span>
    );
  }
  if (restanteMin === null || totalMin === null) return <span className="text-xs text-brand-muted">Sem SLA</span>;
  const s = slaState(restanteMin, totalMin);
  const consumido = Math.min(totalMin, totalMin - restanteMin);
  const tempo = restanteMin < 0 ? `há ${formatMinutes(-restanteMin)}` : formatMinutes(restanteMin);
  if (compact) return <span className={cn('font-mono text-sm font-semibold', s.text)}>{tempo}</span>;
  return (
    <div className="w-40">
      <div className="flex items-center justify-between gap-2">
        <Progress value={consumido} max={totalMin} tone={s.tone} size="sm" className="flex-1" />
        <span className={cn('shrink-0 font-mono text-xs font-bold', s.text)}>{tempo}</span>
      </div>
      <p className={cn('mt-1 text-[10px] font-semibold uppercase tracking-wide', s.text)}>{s.label}</p>
    </div>
  );
}