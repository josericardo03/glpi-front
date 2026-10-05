import { USE_MOCKS } from './http';

/**
 * Funcionalidades que a API ainda não expõe. Na API real a interface esconde ou deixa
 * somente leitura os controles correspondentes; no modo mock tudo fica habilitado.
 */
export const recursos = {
  /** Atribuição de técnico/grupo a um chamado. */
  atribuicaoChamado: USE_MOCKS,
  /** Listagem de membros das equipes de suporte. */
  membrosGrupo: USE_MOCKS,
  /** Ações automáticas das políticas de SLA (notificar gestor, alerta preventivo). */
  alertasSla: USE_MOCKS,
  /** Especificações técnicas e manutenções de ativos. */
  detalhesAtivo: USE_MOCKS,
  /** Fuso horário, cor de destaque e upload de logotipo no branding. */
  brandingAvancado: USE_MOCKS,
  /** Pesquisa de satisfação (CSAT) e taxa de reabertura. */
  satisfacao: USE_MOCKS,
  /** Edição do próprio perfil por usuários não administradores. */
  autoatendimentoPerfil: USE_MOCKS,
} as const;
