import type { ID } from './common';

export type Papel = 'ADMIN' | 'GESTOR' | 'TECNICO' | 'SOLICITANTE';
export type StatusUsuario = 'ATIVO' | 'DESATIVADO';

/** Tabela `usuarios` */
export interface Usuario {
  id: ID;
  tenantId: ID;
  nome: string;
  email: string;
  cargo: string;
  departamentoId: ID | null;
  departamentoNome?: string;
  papeis: Papel[];
  status: StatusUsuario;
  avatarUrl?: string | null;
  ultimoAcesso?: string | null;
  criadoEm: string;
}

export interface UsuarioInput {
  nome: string;
  email: string;
  cargo: string;
  departamentoId: ID | null;
  papeis: Papel[];
  status: StatusUsuario;
  senha?: string;
}

export interface LoginInput {
  email: string;
  senha: string;
  lembrar?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  usuario: Usuario;
}
