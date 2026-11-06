import type { ID } from './common';

export type Papel = 'ADMIN' | 'GESTOR' | 'TECNICO' | 'SOLICITANTE';
export type StatusUsuario = 'ATIVO' | 'DESATIVADO' | 'PENDENTE_CONFIRMACAO';

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
  criadoEm?: string | null;
  /** Verificação em duas etapas ativa (vem de /auth/me). */
  mfaAtivo?: boolean;
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
  /** Só necessário quando o mesmo e-mail existe em mais de um cliente. */
  idCliente?: number;
  /** Código do aplicativo autenticador (ou de recuperação), quando a conta tem verificação em duas etapas. */
  codigoMfa?: string;
}

export interface AuthResponse {
  accessToken: string;
  usuario: Usuario;
}
