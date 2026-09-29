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
  prioridade: Prioridade;
  risco: 'BAIXO' | 'MEDIO' | 'ALTO';
  custoEstimado: number | null;
  solicitadoEm: string;
  status: 'PENDENTE' | 'APROVADA' | 'REJEITADA';
}

export interface DecisaoInput {
  decisao: 'APROVADA' | 'REJEITADA';
  justificativa: string;
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
