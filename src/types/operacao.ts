import type { ID } from './common';
import type { Prioridade } from './chamado';

/** Tabela `aprovacoes` — regra XOR: ou vinculada a chamado, ou a mudança. */
export interface Aprovacao {
  id: ID;
  titulo: string;
  descricao: string;
  origem: 'CHAMADO' | 'MUDANCA';
  chamadoId: ID | null;
  mudancaId: ID | null;
  solicitanteNome: string;
  aprovadorNome: string | null;
  prioridade: Prioridade;
  /** `null` quando a API não informa o risco. */
  risco: 'BAIXO' | 'MEDIO' | 'ALTO' | null;
  custoEstimado: number | null;
  solicitadoEm: string;
  status: StatusAprovacao;
  decididoEm: string | null;
  justificativaAprovador: string | null;
}

export type StatusAprovacao = 'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'CANCELADA';

/** Valores aceitos em `GET /aprovacoes?status=` (padrão PENDENTE). */
export type FiltroStatusAprovacao = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'CANCELADO' | 'TODOS';

/** `POST /aprovacoes`: exatamente um entre chamado e mudança; o aprovador deve ser GESTOR ou ADMIN. */
export type AprovacaoInput = { descricao: string; aprovadorId: ID } & (
  | { chamadoId: ID; mudancaId?: never }
  | { mudancaId: ID; chamadoId?: never }
);

export interface DecisaoInput {
  decisao: 'APROVADA' | 'REJEITADA';
  /** Obrigatória apenas na rejeição. */
  justificativa?: string;
}

export type TipoNotificacao = 'CHAMADO' | 'ATUALIZACAO' | 'APROVACAO' | 'SISTEMA' | 'COMENTARIO';

/** Tabela `notificacoes` */
export interface Notificacao {
  id: ID;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  link: string | null;
  urgente: boolean;
  lida: boolean;
  criadaEm: string;
}

/** Tabela `kb_categorias` */
export interface KbCategoria {
  id: ID;
  nome: string;
  descricao: string;
  icone: 'rede' | 'software' | 'rh' | 'hardware' | 'seguranca';
  totalArtigos: number;
}

/** Tabela `kb_artigos` */
export interface KbArtigo {
  id: ID;
  titulo: string;
  resumo: string;
  conteudoMarkdown: string;
  categoriaId: ID;
  categoriaNome: string;
  status: StatusArtigoKb;
  autorId: ID;
  autorNome: string;
  autorCargo: string;
  visualizacoes: number;
  votosUteis: number;
  votosNaoUteis: number;
  tempoLeituraMin: number;
  meuVoto: 'UTIL' | 'NAO_UTIL' | null;
  publicadoEm: string;
  atualizadoEm: string;
}

export type KbArtigoResumo = Omit<KbArtigo, 'conteudoMarkdown'>;

/** A base pública só lista PUBLICADO; técnicos consultam os demais com `?status=` ou `?meus=true`. */
export type StatusArtigoKb = 'RASCUNHO' | 'REVISAO' | 'PUBLICADO' | 'ARQUIVADO';

export interface KbArtigoInput {
  categoriaId: ID;
  titulo: string;
  conteudo: string;
  status: StatusArtigoKb;
}

export interface KbCategoriaInput {
  nome: string;
  descricao?: string;
}
