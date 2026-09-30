import type { ID, PageParams } from './common';
import type { StatusChamado } from './chamado';

export type TipoAtivo = 'NOTEBOOK' | 'SERVIDOR' | 'LICENCA' | 'ROTEADOR' | 'SWITCH' | 'OUTRO';
export type StatusAtivo = 'EM_USO' | 'ESTOQUE' | 'MANUTENCAO' | 'DESCARTADO';

/** Tabela `ativos_cmdb`. Campos `null` não são expostos pela API atual. */
export interface Ativo {
  id: ID;
  codigo: string;
  nome: string;
  tipo: TipoAtivo;
  numeroSerie: string | null;
  responsavelId: ID | null;
  responsavelNome: string | null;
  status: StatusAtivo;
  localizacao: string | null;
  fabricante: string | null;
  modelo: string | null;
  dataAquisicao: string | null;
  garantiaAte: string | null;
  saude: number | null;
}

export interface AtivoFiltros extends PageParams {
  tipo?: TipoAtivo | '';
  status?: StatusAtivo | '';
}

export interface AtivoInput {
  codigo: string;
  nome: string;
  tipo: TipoAtivo;
  status: StatusAtivo;
  responsavelId: ID | null;
  /** yyyy-mm-dd */
  dataAquisicao: string;
}

/** Tabela `ativo_especificacoes` (chave/valor) */
export interface Especificacao {
  id: ID;
  chave: string;
  valor: string;
}

/** Tabela `ativo_manutencoes` */
export interface Manutencao {
  id: ID;
  descricao: string;
  tipo: 'PREVENTIVA' | 'CORRETIVA';
  custo: number;
  realizadaEm: string;
  responsavel: string;
}

export interface Dependencia {
  id: ID;
  codigo: string;
  nome: string;
  tipo: TipoAtivo;
  relacao: 'DEPENDE_DE' | 'SUPORTA';
}

export interface AtivoDetalhe extends Ativo {
  especificacoes: Especificacao[];
  manutencoes: Manutencao[];
  dependencias: Dependencia[];
  chamadosVinculados: { id: ID; titulo: string; status: StatusChamado }[];
}

export interface AtivosResumo {
  total: number;
  porTipo: Record<TipoAtivo, number>;
  /** % dos ativos não descartados que estão em uso. */
  disponibilidadePct: number;
  emManutencao: number;
}
