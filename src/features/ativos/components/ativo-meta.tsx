import { HardDrive, KeyRound, Laptop, Network, Server, type LucideIcon } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import type { StatusAtivo, TipoAtivo } from '@/types';

export const TIPO_ATIVO: Record<TipoAtivo, { label: string; icon: LucideIcon }> = {
  NOTEBOOK: { label: 'Notebook', icon: Laptop },
  SERVIDOR: { label: 'Servidor', icon: Server },
  LICENCA: { label: 'Licença de software', icon: KeyRound },
  REDE: { label: 'Rede (switch/roteador)', icon: Network },
  OUTRO: { label: 'Outro', icon: HardDrive },
};

export const STATUS_ATIVO: Record<StatusAtivo, { label: string; tone: BadgeTone }> = {
  EM_USO: { label: 'Em uso', tone: 'success' },
  ESTOQUE: { label: 'Estoque', tone: 'novo' },
  MANUTENCAO: { label: 'Manutenção', tone: 'pendente' },
  DESCARTADO: { label: 'Descartado', tone: 'neutral' },
};

export const TIPO_OPTIONS = (Object.keys(TIPO_ATIVO) as TipoAtivo[]).map((t) => ({ value: t, label: TIPO_ATIVO[t].label }));
export const STATUS_ATIVO_OPTIONS = (Object.keys(STATUS_ATIVO) as StatusAtivo[]).map((s) => ({ value: s, label: STATUS_ATIVO[s].label }));

export function AtivoIcon({ tipo, className = 'h-10 w-10' }: { tipo: TipoAtivo; className?: string }) {
  const Icon = TIPO_ATIVO[tipo]?.icon ?? HardDrive;
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-md bg-slate-100 text-brand-darker ${className}`}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

export function StatusAtivoBadge({ status }: { status: StatusAtivo }) {
  const m = STATUS_ATIVO[status];
  return (
    <Badge tone={m.tone} dot>
      {m.label}
    </Badge>
  );
}
