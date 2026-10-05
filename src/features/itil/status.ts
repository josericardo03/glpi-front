import type { BadgeTone } from '@/components/ui';
import type { StatusMudanca, StatusProblema, TipoMudanca } from '@/types';

type MetaStatus = { label: string; tone: BadgeTone; descricao: string };

export const STATUS_PROBLEMA: Record<StatusProblema, MetaStatus> = {
  SOB_INVESTIGACAO: { label: 'Sob investigação', tone: 'atendimento', descricao: 'A causa raiz ainda está sendo analisada.' },
  ERRO_CONHECIDO: { label: 'Erro conhecido', tone: 'pendente', descricao: 'Causa identificada; há contorno documentado enquanto a correção definitiva não sai.' },
  RESOLVIDO: { label: 'Resolvido', tone: 'success', descricao: 'Correção definitiva aplicada. A data de resolução é registrada.' },
  FECHADO: { label: 'Fechado', tone: 'neutral', descricao: 'Encerrado sem novas ações.' },
};

export const STATUS_MUDANCA: Record<StatusMudanca, MetaStatus> = {
  RASCUNHO: { label: 'Rascunho', tone: 'neutral', descricao: 'RFC em elaboração.' },
  AVALIACAO: { label: 'Em avaliação', tone: 'novo', descricao: 'Análise técnica de risco e impacto.' },
  APROVACAO: { label: 'Em aprovação', tone: 'pendente', descricao: 'Aguardando decisão do aprovador (CAB).' },
  AGENDADA: { label: 'Agendada', tone: 'primary', descricao: 'Aprovada, aguardando a janela de execução.' },
  EM_IMPLEMENTACAO: { label: 'Em implementação', tone: 'atendimento', descricao: 'Execução em andamento.' },
  CONCLUIDA: { label: 'Concluída', tone: 'success', descricao: 'Implementada e validada.' },
  CANCELADA: { label: 'Cancelada', tone: 'danger', descricao: 'Rejeitada ou desistida.' },
};

const STATUS: Record<string, MetaStatus> = { ...STATUS_PROBLEMA, ...STATUS_MUDANCA };

/** Rótulo e cor de status de problema ou mudança; códigos desconhecidos caem num rótulo genérico. */
export function statusItil(codigo: string) {
  const conhecido = STATUS[codigo];
  if (conhecido) return conhecido;
  const texto = codigo.toLowerCase().replace(/_/g, ' ');
  return { label: texto.charAt(0).toUpperCase() + texto.slice(1), tone: 'neutral' as BadgeTone, descricao: '' };
}

/** Problemas sem data de resolução e status fora dos encerrados contam como abertos. */
export const problemaAberto = (status: string, resolvidoEm: string | null) => !resolvidoEm && !['RESOLVIDO', 'FECHADO'].includes(status);

/** Mudanças que ainda não foram agendadas, encerradas ou canceladas. */
export const mudancaEmPreparo = (status: string) => ['RASCUNHO', 'AVALIACAO', 'APROVACAO'].includes(status);

export const TIPO_MUDANCA: Record<TipoMudanca, { label: string; tone: BadgeTone; descricao: string }> = {
  PADRAO: { label: 'Padrão', tone: 'success', descricao: 'Pré-aprovada, baixo risco e procedimento repetível.' },
  NORMAL: { label: 'Normal', tone: 'primary', descricao: 'Passa pela avaliação do CAB antes da execução.' },
  EMERGENCIAL: { label: 'Emergencial', tone: 'danger', descricao: 'Restaura serviço crítico; aprovação acelerada.' },
};
