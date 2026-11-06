import { USE_MOCKS } from './http';

/**
 * Funcionalidades que a API ainda não expõe. Na API real a interface esconde ou deixa
 * somente leitura os controles correspondentes; no modo mock tudo fica habilitado.
 */
export const recursos = {
  /** Atribuição de técnico a um chamado (`PATCH /chamados/:id`). */
  atribuicaoTecnico: true,
  /** Atribuição de grupo (`PATCH /chamados/:id` com `id_grupo_responsavel`). */
  atribuicaoGrupo: true,
  /** Listagem de membros das equipes de suporte (`GET /grupos-suporte/membros`). */
  membrosGrupo: true,
  /** Ações automáticas das políticas de SLA (notificar gestor, alerta preventivo). */
  alertasSla: USE_MOCKS,
  /** Especificações, dependências, manutenções e chamados do ativo (`GET /ativos/:id`). */
  detalhesAtivo: true,
  /** Fuso horário, cor de destaque e upload de logotipo no branding. */
  brandingAvancado: USE_MOCKS,
  /** Pesquisa de satisfação (CSAT) e taxa de reabertura: `/pesquisas-csat` e `/relatorios/tma` já entregam os dados. */
  satisfacao: true,
  /** Edição do próprio perfil por usuários não administradores. */
  autoatendimentoPerfil: USE_MOCKS,
} as const;
