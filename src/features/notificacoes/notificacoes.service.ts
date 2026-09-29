import { api } from '@/lib/api';
import type { ApiNotificacao } from '@/lib/backend/types';
import { data, request } from '@/lib/http';
import * as db from '@/mocks/db';
import type { Notificacao, TipoNotificacao } from '@/types';

/** A tabela `notificacoes` não guarda tipo nem link; ambos são inferidos do texto. */
function inferirTipo(texto: string): TipoNotificacao {
  if (/aprova/i.test(texto)) return 'APROVACAO';
  if (/coment|follow-?up/i.test(texto)) return 'COMENTARIO';
  if (/atualiz|status/i.test(texto)) return 'ATUALIZACAO';
  if (/chamado|ticket|#\d+/i.test(texto)) return 'CHAMADO';
  return 'SISTEMA';
}

function toNotificacao(n: ApiNotificacao): Notificacao {
  const texto = `${n.titulo} ${n.mensagem}`;
  const chamado = texto.match(/#(\d+)/)?.[1];
  return {
    id: n.id,
    tipo: inferirTipo(texto),
    titulo: n.titulo,
    mensagem: n.mensagem,
    link: chamado ? `/chamados/${chamado}` : null,
    urgente: /urgente|cr[ií]tic|sla (vencido|violado)/i.test(texto),
    lida: n.lida,
    criadaEm: n.data_criacao,
  };
}

export const notificacoesService = {
  list: () =>
    request<Notificacao[]>(
      async () => (await data(api.get<ApiNotificacao[]>('/notificacoes'))).map(toNotificacao),
      () => [...db.notificacoes].sort((a, b) => b.criadaEm.localeCompare(a.criadaEm)),
    ),

  marcarLida: (id: number) =>
    request<void>(
      async () => {
        await api.patch(`/notificacoes/${id}/ler`);
      },
      () => {
        const n = db.notificacoes.find((x) => x.id === id);
        if (n) n.lida = true;
      },
    ),

  marcarTodas: () =>
    request<void>(
      async () => {
        await api.patch('/notificacoes/ler-todas');
      },
      () => db.notificacoes.forEach((n) => (n.lida = true)),
    ),
};
