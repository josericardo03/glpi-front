import type { Papel, StatusUsuario, Usuario } from '@/types';
import type { ApiAuthUser, ApiDepartamento, ApiUsuario, PerfilApi } from './types';

/** Hierarquia do backend (roles.ts): um perfil inclui as permissões dos perfis abaixo dele. */
export const PERFIL_RANK: Record<Papel, number> = { SOLICITANTE: 1, TECNICO: 2, GESTOR: 3, ADMIN: 4 };

export const perfilPrincipal = (papeis: Papel[]): Papel =>
  papeis.reduce<Papel>((a, b) => (PERFIL_RANK[b] > PERFIL_RANK[a] ? b : a), 'SOLICITANTE');

export function toUsuario(u: ApiUsuario, departamentos?: Map<number, ApiDepartamento>): Usuario {
  return {
    id: u.id,
    tenantId: u.id_cliente,
    nome: u.nome,
    email: u.email,
    cargo: u.cargo,
    departamentoId: u.id_departamento,
    departamentoNome: u.id_departamento ? departamentos?.get(u.id_departamento)?.nome : undefined,
    papeis: [u.perfil],
    status: u.status as StatusUsuario,
    avatarUrl: u.avatar_url,
    ultimoAcesso: u.ultimo_login,
    criadoEm: u.data_cadastro,
  };
}

export function authUserToUsuario(u: ApiAuthUser): Usuario {
  return {
    id: u.id,
    tenantId: u.id_cliente,
    nome: u.nome,
    email: u.email,
    cargo: u.cargo,
    departamentoId: null,
    papeis: [u.perfil as PerfilApi],
    status: u.status as StatusUsuario,
    avatarUrl: null,
    ultimoAcesso: new Date().toISOString(),
    criadoEm: new Date().toISOString(),
  };
}
