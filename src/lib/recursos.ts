import { USE_MOCKS } from './http';

/**
 * Funcionalidades que a API ainda não expõe. Na API real a interface esconde ou deixa
 * somente leitura os controles correspondentes; no modo mock tudo fica habilitado.
 */
export const recursos = {
  /** Atribuição de técnico/grupo a um chamado. */
  atribuicaoChamado: USE_MOCKS,
  /** Listagem de worklogs e pausas do chamado (a API só permite registrar). */
  historicoAtendimento: USE_MOCKS,
  /** Listagem de membros das equipes de suporte. */
  membrosGrupo: USE_MOCKS,
  /** Edição de políticas de SLA e horários comerciais. */
  edicaoSla: USE_MOCKS,
  /** Especificações técnicas e manutenções de ativos. */
  detalhesAtivo: USE_MOCKS,
  /** Fuso horário, cor de destaque e upload de logotipo no branding. */
  brandingAvancado: USE_MOCKS,
  /** Pesquisa de satisfação (CSAT) e taxa de reabertura. */
  satisfacao: USE_MOCKS,
  /** Edição do próprio perfil por usuários não administradores. */
  autoatendimentoPerfil: USE_MOCKS,
  /** Contagem de votos "útil / não útil" dos artigos da base de conhecimento. */
  contagemVotosKb: USE_MOCKS,
} as const;
