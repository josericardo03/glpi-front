import type { AtivoInativo, ID } from './common';

/** Tabela `departamentos` */
export interface Departamento {
  id: ID;
  sigla: string;
  nome: string;
  /** Não existe na API; presente apenas nos dados de demonstração. */
  descricao?: string;
  gestorId: ID | null;
  gestorNome: string | null;
  departamentoPaiId: ID | null;
  totalUsuarios: number;
  status: AtivoInativo;
}

export interface DepartamentoInput {
  sigla: string;
  nome: string;
  gestorId: ID | null;
  departamentoPaiId: ID | null;
}

export type AplicacaoCategoria = 'INCIDENTE' | 'REQUISICAO' | 'AMBOS';

/** Tabela `categorias` (auto-relacionamento via categoria_pai_id) */
export interface Categoria {
  id: ID;
  nome: string;
  categoriaPaiId: ID | null;
  aplicacao: AplicacaoCategoria;
  status: AtivoInativo;
}

export interface CategoriaInput {
  nome: string;
  categoriaPaiId: ID | null;
  aplicacao: AplicacaoCategoria;
  status: AtivoInativo;
}

/** Tabela `grupos_suporte` */
export interface GrupoSuporte {
  id: ID;
  nome: string;
  descricao: string;
  status: AtivoInativo;
  membros: MembroGrupo[];
}

/** Tabela `membros_grupos` */
export interface MembroGrupo {
  id: ID;
  grupoId: ID;
  usuarioId: ID;
  nome: string;
  email: string;
  cargo: string;
  /** Carga de trabalho 0..100 (%) */
  cargaTrabalho: number;
  avatarUrl?: string | null;
}

export interface GrupoInput {
  nome: string;
  descricao: string;
  status: AtivoInativo;
}

export interface MembroInput {
  grupoId: ID;
  usuarioId: ID;
  /** Cargo/especialidade do técnico dentro da equipe (opcional). */
  especialidade?: string;
}
