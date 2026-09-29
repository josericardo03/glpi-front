import type { Nivel, Prioridade } from '@/types';

const MATRIZ: Record<Nivel, Record<Nivel, Prioridade>> = {
  ALTO: { ALTO: 'CRITICA', MEDIO: 'ALTA', BAIXO: 'MEDIA' },
  MEDIO: { ALTO: 'ALTA', MEDIO: 'MEDIA', BAIXO: 'BAIXA' },
  BAIXO: { ALTO: 'MEDIA', MEDIO: 'BAIXA', BAIXO: 'BAIXA' },
};

/** Matriz ITIL Impacto x Urgência. */
export function calcularPrioridade(impacto: Nivel, urgencia: Nivel): Prioridade {
  return MATRIZ[impacto][urgencia];
}

/** Meta de solução padrão (min) por prioridade — espelha `politicas_sla`. */
export const SLA_SOLUCAO_MIN: Record<Prioridade, number> = {
  CRITICA: 240,
  ALTA: 480,
  MEDIA: 1440,
  BAIXA: 2400,
};
