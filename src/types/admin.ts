import type { ID } from './common';
import type { Prioridade } from './chamado';

/** Tabela `politicas_sla` (metas em minutos) */
export interface PoliticaSla {
  id: ID;
  prioridade: Prioridade;
  nome: string;
  descricao: string;
  tempoRespostaMin: number;
  tempoSolucaoMin: number;
  calendario: '24X7' | 'COMERCIAL';
  horarioComercialId: ID | null;
  notificarGestor: boolean;
  alertaPercentual: number | null;
}

/** Tabela `horarios_comerciais` */
export interface HorarioComercial {
  id: ID;
  nome: string;
  turnos: { dias: string; inicio: string; fim: string }[];
  feriados: { data: string; descricao: string }[];
}

/** Tabela `tenant_branding` */
export interface Branding {
  nomePortal: string;
  fusoHorario: string;
  logoUrl: string | null;
  corPrimaria: string;
  corSecundaria: string;
  corDestaque: string;
  corFundo: string;
}

export type TipoIntegracao = 'LDAP' | 'SMTP' | 'WEBHOOK';

/** Tabela `integracoes` */
export interface Integracao {
  id: ID;
  nome: string;
  tipo: TipoIntegracao;
  host: string;
  porta: number;
  ativo: boolean;
  ultimoTeste: string | null;
  ultimoResultado: 'SUCESSO' | 'FALHA' | null;
  latenciaMs: number | null;
}

export interface IntegracaoInput {
  nome: string;
  tipo: TipoIntegracao;
  host: string;
  porta: number;
  ativo: boolean;
}

export interface TesteIntegracaoResult {
  sucesso: boolean;
  latenciaMs: number;
  mensagem: string;
}

/** Tabela `clientes` (tenants) */
export interface Cliente {
  id: ID;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  dominio: string;
  plano: 'BASICO' | 'PROFISSIONAL' | 'ENTERPRISE';
  totalUsuarios: number;
  status: 'ATIVO' | 'SUSPENSO' | 'TRIAL';
  criadoEm: string;
}

export interface ClienteInput {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  dominio: string;
  plano: Cliente['plano'];
}

export type AcaoAuditoria = 'CREATE' | 'UPDATE' | 'DELETE' | 'CONFIG' | 'LOGIN';

/** Tabela `audit_logs` (deltas em JSONB) */
export interface AuditLog {
  id: ID;
  criadoEm: string;
  usuarioNome: string;
  acao: AcaoAuditoria;
  entidade: string;
  entidadeId: string;
  valorAntigo: Record<string, unknown> | null;
  valorNovo: Record<string, unknown> | null;
  ip: string;
}

export interface AuditoriaFiltros {
  page?: number;
  pageSize?: number;
  search?: string;
  acao?: AcaoAuditoria | '';
}
