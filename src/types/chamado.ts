import type { ID, PageParams } from './common';

export type StatusChamado = 'NOVO' | 'EM_ATENDIMENTO' | 'PENDENTE' | 'RESOLVIDO' | 'CONCLUIDO';
export type Prioridade = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';
export type TipoChamado = 'INCIDENTE' | 'REQUISICAO';
export type Nivel = 'ALTO' | 'MEDIO' | 'BAIXO';
export type Origem = 'PORTAL' | 'EMAIL' | 'TELEFONE' | 'CHAT';

/** Tabela `chamados` */
export interface Chamado {
  id: ID;
  titulo: string;
  descricao: string;
  tipo: TipoChamado;
  origem: Origem;
  status: StatusChamado;
  prioridade: Prioridade;
  impacto: Nivel;
  urgencia: Nivel;
  categoriaId: ID;
  categoriaNome: string;
  solicitanteId: ID;
  solicitanteNome: string;
  grupoId: ID | null;
  grupoNome: string | null;
  tecnicoId: ID | null;
  tecnicoNome: string | null;
  abertoEm: string;
  atualizadoEm: string;
  /** Campos de SLA ficam `null` quando nenhuma política foi aplicada ao chamado. */
  prazoResposta: string | null;
  prazoSla: string | null;
  /** Prazo estourado segundo a API (`sla_vencido`). */
  slaVencido: boolean;
  /** Minutos restantes para o vencimento do SLA (negativo = vencido). */
  slaRestanteMin: number | null;
  slaTotalMin: number | null;
  slaPausado: boolean;
  itensConfiguracao?: { id: ID; nome: string; detalhe: string }[];
}

/** Aplicados pela API (`GET /chamados` e `/triagem`); `search` procura no título, na descrição e no número. */
export interface ChamadoFiltros extends PageParams {
  status?: StatusChamado | '';
  /** Vários status de uma vez (ignorado quando `status` está preenchido). */
  statusIn?: StatusChamado[];
  prioridade?: Prioridade | '';
  tipo?: TipoChamado | '';
  categoriaId?: ID | '';
  /** `'sem'` filtra os chamados sem técnico. */
  tecnicoId?: ID | 'sem' | '';
  grupoId?: ID | '';
  slaVencido?: boolean;
  ordenar?: `${'data_abertura' | 'prioridade' | 'status' | 'id' | 'data_resolucao'}:${'asc' | 'desc'}`;
}

export interface ChamadoInput {
  titulo: string;
  descricao: string;
  tipo: TipoChamado;
  origem: Origem;
  impacto: Nivel;
  urgencia: Nivel;
  categoriaId: ID;
  solicitanteId: ID;
  grupoId: ID | null;
  tecnicoId: ID | null;
  ativoAfetadoId: ID | null;
}

/** `POST /pesquisas-csat`: só para quem abriu o chamado, uma vez, com o chamado resolvido ou concluído. */
export interface CsatInput {
  chamadoId: ID;
  nota: number;
  comentario?: string;
}

export type MotivoPausa = 'AGUARDANDO_SOLICITANTE' | 'AGUARDANDO_TERCEIRO' | 'FORNECEDOR_EXTERNO' | 'MANUTENCAO_PROGRAMADA';

export interface AtualizarStatusInput {
  status?: StatusChamado;
  /** Obrigatória ao resolver. */
  resolucao?: string;
  /** Obrigatório ao pendenciar. */
  motivoPausa?: MotivoPausa;
  grupoId?: ID | null;
  tecnicoId?: ID | null;
}

/** Tabela `chamado_comentarios` */
export interface Comentario {
  id: ID;
  chamadoId: ID;
  autorId: ID;
  autorNome: string;
  autorPapel: string;
  conteudo: string;
  interno: boolean;
  criadoEm: string;
}

/** Tabela `chamado_worklogs` */
export interface Worklog {
  id: ID;
  chamadoId: ID;
  tecnicoNome: string;
  descricao: string;
  minutos: number;
  realizadoEm: string;
}

/** Tabela `chamado_pausas` */
export interface PausaSla {
  id: ID;
  chamadoId: ID;
  motivo: string;
  iniciadaEm: string;
  finalizadaEm: string | null;
}

/** Tabela `chamado_anexos` */
export interface Anexo {
  id: ID;
  chamadoId: ID;
  nomeArquivo: string;
  tamanhoBytes: number;
  mimeType: string;
  enviadoPor: string;
  criadoEm: string;
}

export interface HistoricoEvento {
  id: ID;
  descricao: string;
  autor: string;
  criadoEm: string;
}

/** Problema ou mudança vinculado ao chamado. */
export interface VinculoItil {
  id: ID;
  titulo: string;
  status: string;
}

export type CsatChamado = { avaliado: false } | { avaliado: true; nota: number; comentario: string | null; respondidoEm: string };

export interface ChamadoDetalhe extends Chamado {
  comentarios: Comentario[];
  worklogs: Worklog[];
  pausas: PausaSla[];
  anexos: Anexo[];
  historico: HistoricoEvento[];
  problemas: VinculoItil[];
  mudancas: VinculoItil[];
  csat: CsatChamado;
}

export interface Tecnico {
  id: ID;
  nome: string;
  nivel: string;
  /** `null` quando a API não informa a equipe do técnico. */
  grupoId: ID | null;
  avatarUrl?: string | null;
}
