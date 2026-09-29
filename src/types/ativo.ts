import type { ID, PageParams } from './common';
import type { StatusChamado } from './chamado';

export type TipoAtivo = 'NOTEBOOK' | 'SERVIDOR' | 'LICENCA' | 'REDE' | 'DESKTOP';
export type StatusAtivo = 'EM_USO' | 'ESTOQUE' | 'MANUTENCAO' | 'DESCARTADO';

/** Tabela `ativos` */
export interface Ativo {
  id: ID;
  codigo: string;
  nome: string;
  tipo: TipoAtivo;
  numeroSerie: string;
  responsavelNome: string;
  status: StatusAtivo;
  localizacao: string;
  fabricante: string;
  modelo: string;
  dataAquisicao: string;
  garantiaAte: string | null;
  saude: number;
}

export interface AtivoFiltros extends PageParams {
  tipo?: TipoAtivo | '';
  status?: StatusAtivo | '';
}

export interface AtivoInput {
  nome: string;
  tipo: TipoAtivo;
  numeroSerie: string;
  responsavelNome: string;
  status: StatusAtivo;
  localizacao: string;
  fabricante: string;
  modelo: string;
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
  saudeFrota: number;
  licencasExpirando: number;
}
