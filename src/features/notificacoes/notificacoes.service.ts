import { api } from '@/lib/api';
import { request } from '@/lib/http';
import * as db from '@/mocks/db';
import type { Notificacao } from '@/types';

export const notificacoesService = {
  list: () =>
    request<Notificacao[]>(
      () => api.get('/notificacoes'),
      () => [...db.notificacoes].sort((a, b) => b.criadaEm.localeCompare(a.criadaEm)),
    ),

  marcarLida: (id: number) =>
    request<void>(
      () => api.patch(`/notificacoes/${id}/ler`),
      () => {
        const n = db.notificacoes.find((x) => x.id === id);
        if (n) n.lida = true;
      },
    ),

  marcarTodas: () =>
    request<void>(
      () => api.patch('/notificacoes/ler-todas'),
      () => db.notificacoes.forEach((n) => (n.lida = true)),
    ),
};
