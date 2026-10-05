import type { AplicacaoCategoria, Nivel, PoliticaSla, Prioridade, TipoChamado } from '@/types';

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

/** A API recusa (400) categorias de outro tipo; só `AMBOS` ou o mesmo tipo do chamado são aceitas. */
export const categoriaAceitaTipo = (aplicacao: AplicacaoCategoria, tipo: TipoChamado) => aplicacao === 'AMBOS' || aplicacao === tipo;

/** Política ativa que a API aplicará na abertura; sem ela a criação responde 422. */
export const politicaAplicavel = (politicas: PoliticaSla[], prioridade: Prioridade, tipo: TipoChamado) =>
  politicas.find((p) => p.ativa && p.prioridade === prioridade && (p.tipoAlvo === 'AMBOS' || p.tipoAlvo === tipo));
