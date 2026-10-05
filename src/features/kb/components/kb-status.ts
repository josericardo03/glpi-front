import type { BadgeTone } from '@/components/ui';
import type { StatusArtigoKb } from '@/types';

export const STATUS_ARTIGO: Record<StatusArtigoKb, { label: string; tone: BadgeTone; descricao: string }> = {
  PUBLICADO: { label: 'Publicado', tone: 'success', descricao: 'Visível para todos imediatamente.' },
  REVISAO: { label: 'Em revisão', tone: 'pendente', descricao: 'Aguarda revisão de outro técnico antes de publicar.' },
  RASCUNHO: { label: 'Rascunho', tone: 'neutral', descricao: 'Fica salvo, mas só técnicos veem.' },
  ARQUIVADO: { label: 'Arquivado', tone: 'dark', descricao: 'Sai da base de conhecimento, mas continua guardado.' },
};
