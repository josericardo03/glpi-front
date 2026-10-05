import { api } from '@/lib/api';
import type { ApiNotificacao } from '@/lib/backend/types';
import { data, getAll, request, TETO_PAGINA } from '@/lib/http';
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

function inferirLink(tipo: TipoNotificacao, texto: string) {
  if (tipo === 'APROVACAO') return '/aprovacoes';
  const chamado = texto.match(/#(\d+)/)?.[1];
  return chamado && tipo !== 'SISTEMA' ? `/chamados/${chamado}` : null;
}

function toNotificacao(n: ApiNotificacao): Notificacao {
  const texto = `${n.titulo} ${n.mensagem}`;
  const tipo = inferirTipo(texto);
  return {
    id: n.id,
    tipo,
    titulo: n.titulo,
    mensagem: n.mensagem,
    link: inferirLink(tipo, texto),
    urgente: /urgente|cr[ií]tic|sla (vencido|violado)/i.test(texto),
    lida: n.lida,
    criadaEm: n.data_criacao,
  };
}

export const notificacoesService = {
  list: () =>
    request<Notificacao[]>(
      async () =>
        (await getAll<ApiNotificacao>('/notificacoes', TETO_PAGINA.notificacoes)).map(toNotificacao).sort((a, b) => b.criadaEm.localeCompare(a.criadaEm)),
      () => [...db.notificacoes].sort((a, b) => b.criadaEm.localeCompare(a.criadaEm)),
    ),

  naoLidas: () =>
    request<number>(
      async () => (await data(api.get<{ total: number }>('/notificacoes/nao-lidas/total'))).total,
      () => db.notificacoes.filter((n) => !n.lida).length,
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
