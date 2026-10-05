import type { ID } from './common';
import type { Prioridade, VinculoItil } from './chamado';

export type StatusProblema = 'SOB_INVESTIGACAO' | 'ERRO_CONHECIDO' | 'RESOLVIDO' | 'FECHADO';

/** Tabela `problemas` (gestão de problemas ITIL). */
export interface Problema {
  id: ID;
  titulo: string;
  descricao: string;
  prioridade: Prioridade;
  status: StatusProblema;
  causaRaiz: string | null;
  solucaoContorno: string | null;
  tecnicoId: ID | null;
  tecnicoNome: string | null;
  identificadoEm: string;
  resolvidoEm: string | null;
}

/** `GET /problemas/:id`: inclui os chamados vinculados. */
export interface ProblemaDetalhe extends Problema {
  chamados: VinculoItil[];
}

export interface ProblemaInput {
  titulo: string;
  descricao: string;
  prioridade: Prioridade;
  causaRaiz?: string;
  solucaoContorno?: string;
  chamadoId?: ID;
}

/** Ao passar para RESOLVIDO ou FECHADO, a API grava a data de resolução. */
export interface ProblemaUpdate {
  status?: StatusProblema;
  causaRaiz?: string;
  solucaoContorno?: string;
  /** `null` remove o responsável; texto vazio em causa/contorno limpa o campo. */
  tecnicoId?: ID | null;
}

export type TipoMudanca = 'PADRAO' | 'NORMAL' | 'EMERGENCIAL';

/** Decidir a aprovação de uma mudança leva a AGENDADA (aprovada) ou CANCELADA (rejeitada). */
export type StatusMudanca = 'RASCUNHO' | 'AVALIACAO' | 'APROVACAO' | 'AGENDADA' | 'EM_IMPLEMENTACAO' | 'CONCLUIDA' | 'CANCELADA';

/** Tabela `mudancas` (RFC). */
export interface Mudanca {
  id: ID;
  titulo: string;
  descricao: string;
  justificativa: string;
  planoImpacto: string;
  planoTestes: string;
  planoRetorno: string;
  tipo: TipoMudanca;
  status: StatusMudanca;
  solicitanteNome: string;
  janelaInicio: string;
  janelaFim: string;
  criadaEm: string;
}

/** `GET /mudancas/:id`: inclui os chamados vinculados. */
export interface MudancaDetalhe extends Mudanca {
  chamados: VinculoItil[];
}

export interface MudancaInput {
  titulo: string;
  descricao: string;
  justificativa: string;
  planoImpacto: string;
  planoTestes: string;
  planoRetorno: string;
  tipo: TipoMudanca;
  /** ISO 8601; `janelaFim` precisa ser posterior a `janelaInicio`. */
  janelaInicio: string;
  janelaFim: string;
  chamadoId?: ID;
}

export interface MudancaUpdate {
  status?: StatusMudanca;
  janelaInicio?: string;
  janelaFim?: string;
}
