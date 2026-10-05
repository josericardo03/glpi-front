import type { MotivoPausa, StatusChamado } from '@/types';

export const STATUS_LABEL: Record<StatusChamado, string> = {
  NOVO: 'Novo',
  EM_ATENDIMENTO: 'Em Atendimento',
  PENDENTE: 'Pendente',
  RESOLVIDO: 'Resolvido',
  CONCLUIDO: 'Concluído',
};

export const MOTIVO_PAUSA_LABEL: Record<MotivoPausa, string> = {
  AGUARDANDO_SOLICITANTE: 'Aguardando solicitante',
  AGUARDANDO_TERCEIRO: 'Aguardando terceiro',
  FORNECEDOR_EXTERNO: 'Fornecedor externo',
  MANUTENCAO_PROGRAMADA: 'Manutenção programada',
};

/** Máquina de estados do backend (`assertTransicao`). */
export const TRANSICOES: Record<StatusChamado, StatusChamado[]> = {
  NOVO: ['EM_ATENDIMENTO', 'PENDENTE'],
  EM_ATENDIMENTO: ['PENDENTE', 'RESOLVIDO'],
  PENDENTE: ['EM_ATENDIMENTO'],
  RESOLVIDO: ['CONCLUIDO'],
  CONCLUIDO: [],
};

export const STATUS_ABERTOS: StatusChamado[] = ['NOVO', 'EM_ATENDIMENTO', 'PENDENTE'];
export const STATUS_FINALIZADOS: StatusChamado[] = ['RESOLVIDO', 'CONCLUIDO'];

export const isFinalizado = (status: StatusChamado) => STATUS_FINALIZADOS.includes(status);

/** Destinos válidos para todos os status informados (ações em lote). */
export function transicoesComuns(statuses: StatusChamado[]): StatusChamado[] {
  if (!statuses.length) return [];
  return TRANSICOES[statuses[0]!].filter((s) => statuses.every((st) => TRANSICOES[st].includes(s)));
}
