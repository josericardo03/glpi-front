import { api } from '@/lib/api';
import { request } from '@/lib/http';
import * as db from '@/mocks/db';
import type { Aprovacao, DecisaoInput } from '@/types';

export const aprovacoesService = {
  pendentes: () =>
    request<Aprovacao[]>(() => api.get('/aprovacoes/pendentes'), () => db.aprovacoes.filter((a) => a.status === 'PENDENTE')),

  decidir: (id: number, input: DecisaoInput) =>
    request<Aprovacao>(
      () => api.post(`/aprovacoes/${id}/decisao`, input),
      () => {
        const a = db.aprovacoes.find((x) => x.id === id);
        if (!a) throw new Error('Aprovação não encontrada (HTTP 404).');
        if (a.status !== 'PENDENTE') throw new Error('Esta aprovação já foi decidida (HTTP 409).');
        a.status = input.decisao;
        return a;
      },
    ),
};
