import type { Papel, StatusUsuario, Usuario } from '@/types';
import type { ApiAuthUser, ApiDepartamento, ApiUsuario, PerfilApi } from './types';

/** Hierarquia do backend (roles.ts): um perfil inclui as permissões dos perfis abaixo dele. */
export const PERFIL_RANK: Record<Papel, number> = { SOLICITANTE: 1, TECNICO: 2, GESTOR: 3, ADMIN: 4 };

export const PAPEL_LABEL: Record<Papel, string> = { ADMIN: 'Administrador', GESTOR: 'Gestor', TECNICO: 'Técnico', SOLICITANTE: 'Solicitante' };

export const perfilPrincipal = (papeis: Papel[]): Papel =>
  papeis.reduce<Papel>((a, b) => (PERFIL_RANK[b] > PERFIL_RANK[a] ? b : a), 'SOLICITANTE');

/**
 * Para o SOLICITANTE, GET /usuarios devolve só `id`, `nome` e `perfil` dos gestores/administradores
 * (aprovadores); os demais campos ficam com valores neutros, e a ausência de status significa ativo.
 */
export function toUsuario(u: ApiUsuario | Pick<ApiUsuario, 'id' | 'nome' | 'perfil'>, departamentos?: Map<number, ApiDepartamento>): Usuario {
  const c: Partial<ApiUsuario> = u;
  return {
    id: u.id,
    tenantId: c.id_cliente ?? 0,
    nome: u.nome,
    email: c.email ?? '',
    cargo: c.cargo ?? '',
    departamentoId: c.id_departamento ?? null,
    departamentoNome: c.id_departamento ? departamentos?.get(c.id_departamento)?.nome : undefined,
    papeis: [u.perfil],
    status: (c.status ?? 'ATIVO') as StatusUsuario,
    avatarUrl: c.avatar_url ?? null,
    ultimoAcesso: c.ultimo_login ?? null,
    criadoEm: c.data_cadastro ?? null,
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
    ultimoAcesso: null,
    criadoEm: null,
  };
}
