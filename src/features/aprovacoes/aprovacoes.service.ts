import { api } from '@/lib/api';
import { byId, lookups } from '@/lib/backend/lookups';
import type { ApiAprovacao, ApiChamado } from '@/lib/backend/types';
import { data, request } from '@/lib/http';
import { chamadosApi } from '@/features/chamados/services/chamado.mapper';
import * as db from '@/mocks/db';
import type { Aprovacao, AprovacaoInput, DecisaoInput, Mudanca, Prioridade } from '@/types';

interface ApiMudanca {
  id: number;
  titulo: string;
  tipo_mudanca: string;
}

const PRIORIDADE_POR_TIPO_MUDANCA: Record<string, Prioridade> = { EMERGENCIAL: 'CRITICA', NORMAL: 'MEDIA', PADRAO: 'BAIXA' };
const STATUS_DA_API: Record<string, Aprovacao['status']> = { PENDENTE: 'PENDENTE', APROVADO: 'APROVADA', REJEITADO: 'REJEITADA' };

/** GET /aprovacoes já devolve apenas as pendentes do tenant. Chamados e mudanças só enriquecem o título. */
async function pendentesReal(): Promise<Aprovacao[]> {
  const [rows, chamados, mudancas, usuarios] = await Promise.all([
    data(api.get<ApiAprovacao[]>('/aprovacoes')),
    chamadosApi().catch(() => [] as ApiChamado[]),
    data(api.get<ApiMudanca[]>('/mudancas')).catch(() => [] as ApiMudanca[]),
    lookups.usuarios(),
  ]);
  const cs = byId(chamados);
  const ms = byId(mudancas);
  const us = byId(usuarios);

  return rows
    .map((a): Aprovacao => {
      const chamado = a.id_chamado ? cs.get(a.id_chamado) : undefined;
      const mudanca = a.id_mudanca ? ms.get(a.id_mudanca) : undefined;
      const prioridade = chamado ? (chamado.prioridade as Prioridade) : (PRIORIDADE_POR_TIPO_MUDANCA[mudanca?.tipo_mudanca ?? ''] ?? 'MEDIA');
      return {
        id: a.id,
        titulo: chamado?.titulo ?? mudanca?.titulo ?? (a.id_chamado ? `Chamado #${a.id_chamado}` : `Mudança #${a.id_mudanca}`),
        descricao: a.descricao,
        origem: a.id_chamado ? 'CHAMADO' : 'MUDANCA',
        chamadoId: a.id_chamado,
        mudancaId: a.id_mudanca,
        solicitanteNome: us.get(a.id_solicitante)?.nome ?? `Usuário #${a.id_solicitante}`,
        prioridade,
        risco: null,
        custoEstimado: null,
        solicitadoEm: a.data_solicitacao,
        status: STATUS_DA_API[a.status] ?? 'PENDENTE',
      };
    })
    .sort((a, b) => a.solicitadoEm.localeCompare(b.solicitadoEm));
}

export const aprovacoesService = {
  pendentes: () => request<Aprovacao[]>(pendentesReal, () => db.aprovacoes.filter((a) => a.status === 'PENDENTE')),

  mudancas: () =>
    request<Mudanca[]>(
      async () => (await data(api.get<ApiMudanca[]>('/mudancas'))).map((m) => ({ id: m.id, titulo: m.titulo })),
      () => [
        { id: 881, titulo: 'Janela de manutenção - Cluster SQL' },
        { id: 882, titulo: 'Migração do firewall de borda' },
      ],
    ),

  criar: (input: AprovacaoInput) =>
    request<unknown>(
      () =>
        data(
          api.post('/aprovacoes', {
            descricao: input.descricao,
            id_aprovador: input.aprovadorId,
            ...(input.chamadoId !== undefined ? { id_chamado: input.chamadoId } : { id_mudanca: input.mudancaId }),
          }),
        ),
      () => {
        const aprovador = db.usuarios.find((u) => u.id === input.aprovadorId);
        if (!aprovador || !aprovador.papeis.some((p) => p === 'GESTOR' || p === 'ADMIN')) {
          throw new Error('O aprovador precisa ser um usuário GESTOR ou ADMIN (HTTP 400).');
        }
        const chamado = input.chamadoId !== undefined ? db.chamados.find((c) => c.id === input.chamadoId) : undefined;
        if (input.chamadoId !== undefined && !chamado) throw new Error('Chamado não encontrado (HTTP 404).');
        const a: Aprovacao = {
          id: Math.max(0, ...db.aprovacoes.map((x) => x.id)) + 1,
          titulo: chamado?.titulo ?? `Mudança #${input.mudancaId}`,
          descricao: input.descricao,
          origem: chamado ? 'CHAMADO' : 'MUDANCA',
          chamadoId: input.chamadoId ?? null,
          mudancaId: input.mudancaId ?? null,
          solicitanteNome: db.usuarios[0]!.nome,
          prioridade: chamado?.prioridade ?? 'MEDIA',
          risco: null,
          custoEstimado: null,
          solicitadoEm: new Date().toISOString(),
          status: 'PENDENTE',
        };
        db.aprovacoes.push(a);
        return a;
      },
    ),

  decidir: (id: number, input: DecisaoInput) =>
    request<unknown>(
      () =>
        data(
          api.post(`/aprovacoes/${id}/decisao`, {
            status: input.decisao === 'APROVADA' ? 'APROVADO' : 'REJEITADO',
            ...(input.justificativa && { justificativa_aprovador: input.justificativa }),
          }),
        ),
      () => {
        const a = db.aprovacoes.find((x) => x.id === id);
        if (!a) throw new Error('Aprovação não encontrada (HTTP 404).');
        if (a.status !== 'PENDENTE') throw new Error('Esta aprovação já foi decidida (HTTP 409).');
        if (input.decisao === 'REJEITADA' && !input.justificativa) throw new Error('A justificativa é obrigatória na rejeição (HTTP 400).');
        a.status = input.decisao;
        return a;
      },
    ),
};
