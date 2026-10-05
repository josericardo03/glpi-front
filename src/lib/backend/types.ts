/** Formato bruto (snake_case) das linhas retornadas pela API NestJS/Prisma. */

export type PerfilApi = 'ADMIN' | 'GESTOR' | 'TECNICO' | 'SOLICITANTE';

export interface ApiTenantResumo {
  id: number;
  razao_social: string;
  nome_fantasia: string;
  status: string;
}

export interface ApiAuthUser {
  id: number;
  id_cliente: number;
  email: string;
  nome: string;
  perfil: PerfilApi;
  cargo: string;
  status: string;
  tenant?: ApiTenantResumo;
}

export interface ApiLoginResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: ApiAuthUser;
}

export interface ApiUsuario {
  id: number;
  id_cliente: number;
  nome: string;
  email: string;
  cargo: string;
  perfil: PerfilApi;
  status: string;
  id_departamento: number | null;
  avatar_url: string | null;
  data_cadastro: string;
  ultimo_login: string | null;
}

export interface ApiDepartamento {
  id: number;
  codigo_sigla: string;
  nome: string;
  id_responsavel: number | null;
  id_departamento_pai: number | null;
  status: string;
  data_criacao: string;
}

export interface ApiCategoria {
  id: number;
  nome: string;
  id_categoria_pai: number | null;
  tipo_aplicacao: 'INCIDENTE' | 'REQUISICAO' | 'AMBOS';
  status: string;
}

export interface ApiGrupo {
  id: number;
  nome: string;
  descricao: string | null;
  status: string;
}

export interface ApiChamado {
  id: number;
  id_cliente: number;
  id_solicitante: number;
  id_tecnico_atribuido: number | null;
  id_grupo_responsavel: number | null;
  id_categoria: number;
  id_politica_sla: number | null;
  titulo: string;
  descricao: string;
  tipo: string;
  origem: string;
  prioridade: string;
  status: string;
  data_abertura: string;
  data_previsao_resposta: string | null;
  data_previsao_resolucao: string | null;
  data_resolucao: string | null;
  data_fechamento: string | null;
  resolucao: string | null;
  tempo_acumulado_pausa_s: number;
  sla_vencido: boolean;
}

export interface ApiComentario {
  id: number;
  id_chamado: number;
  id_autor: number;
  mensagem: string;
  tipo_visibilidade: 'PUBLICO' | 'INTERNO';
  data_criacao: string;
}

export interface ApiAnexo {
  id: number;
  id_chamado: number;
  nome_arquivo: string;
  tipo_mime: string;
  tamanho_bytes: number;
  data_upload: string;
}

export interface ApiVinculoItil {
  id: number;
  titulo: string;
  status: string;
}

export interface ApiChamadoDetalhe extends ApiChamado {
  comentarios_chamados: ApiComentario[];
  anexos_chamados: ApiAnexo[];
  ativos: { id: number; nome: string; codigo_patrimonio: string; tipo: string }[];
  id_ativo_afetado: number | null;
  problemas: ApiVinculoItil[];
  mudancas: ApiVinculoItil[];
  csat: { avaliado: false } | { avaliado: true; nota_satisfacao: number; comentarios: string | null; data_resposta: string };
  worklogs: {
    id: number;
    id_chamado: number;
    id_tecnico: number;
    descricao_atividade: string;
    tempo_trabalhado_min: number;
    data_execucao: string;
    data_registro: string;
  }[];
  pausas_sla: {
    id: number;
    id_chamado: number;
    id_historico_origem: number | null;
    motivo_pausa: string;
    data_pausa: string;
    data_retomada: string | null;
    tempo_pausado_seg: number | null;
  }[];
  historico_status_chamados: {
    id: number;
    status_anterior: string | null;
    status_novo: string;
    id_usuario_alterou: number | null;
    data_alteracao: string;
  }[];
}

export interface ApiAtivo {
  id: number;
  codigo_patrimonio: string;
  nome: string;
  tipo_ativo: string;
  id_usuario_atribuido: number | null;
  status: string;
  data_aquisicao: string | null;
  data_cadastro: string;
}

export interface ApiArtigoKb {
  id: number;
  id_categoria: number;
  titulo: string;
  conteudo: string;
  id_autor: number;
  status: string;
  visualizacoes: number;
  data_criacao: string;
  data_atualizacao: string;
  votos_uteis?: number;
  votos_nao_uteis?: number;
  /** `true` = útil, `false` = não útil, `null` = o usuário ainda não votou. */
  meu_voto?: boolean | null;
}

export interface ApiCategoriaKb {
  id: number;
  id_cliente: number;
  nome: string;
  descricao: string | null;
  data_criacao: string;
  total_artigos: number;
}

export interface ApiAprovacao {
  id: number;
  id_chamado: number | null;
  id_mudanca: number | null;
  id_solicitante: number;
  id_aprovador: number;
  descricao: string;
  status: string;
  data_solicitacao: string;
  data_decisao?: string | null;
  justificativa_aprovador?: string | null;
}

export interface ApiIntervalo {
  id: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
}

export interface ApiHorarioComercial {
  id: number;
  nome: string;
  fuso_horario: string;
  status: string;
  intervalos: ApiIntervalo[];
}

export interface ApiFeriado {
  id: number;
  id_cliente: number;
  nome: string;
  dia: number;
  mes: number;
  ano: number | null;
}

export interface ApiProblema {
  id: number;
  titulo: string;
  descricao: string;
  id_tecnico_atribuido: number | null;
  causa_raiz: string | null;
  solucao_contorno: string | null;
  status: string;
  prioridade: string;
  data_identificacao: string;
  data_resolucao: string | null;
  chamados?: ApiVinculoItil[];
}

export interface ApiMudanca {
  id: number;
  titulo: string;
  descricao: string;
  justificativa: string;
  plano_impacto: string;
  plano_testes: string;
  plano_retorno: string;
  tipo_mudanca: string;
  id_solicitante: number;
  status: string;
  janela_inicio: string;
  janela_fim: string;
  data_criacao: string;
  chamados?: ApiVinculoItil[];
}

export interface ApiNotificacao {
  id: number;
  titulo: string;
  mensagem: string;
  lida: boolean;
  data_criacao: string;
}

export interface ApiPoliticaSla {
  id: number;
  nome: string;
  prioridade_alvo: string;
  tipo_chamado_alvo: string;
  tempo_resposta_min: number;
  tempo_resolucao_min: number;
  id_horario_comercial: number;
  status: string;
}

export interface ApiBranding {
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  cor_fundo: string | null;
  nome_portal: string | null;
}

export interface ApiIntegracao {
  id: number;
  nome: string;
  tipo: string;
  configuracoes: Record<string, unknown>;
  status: string;
}

export interface ApiHistoricoIntegracao {
  status: 'SUCESSO' | 'FALHA';
  dados_log: string | null;
  data_execucao: string;
}

export interface ApiCliente {
  id: number;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  status: string;
  data_contratacao: string;
}

export interface ApiAuditLog {
  id: number;
  id_usuario: number | null;
  acao: string;
  tabela_afetada: string;
  registro_id: number | null;
  valor_anterior: Record<string, unknown> | null;
  valor_novo: Record<string, unknown> | null;
  endereco_ip: string | null;
  data_criacao: string;
}
