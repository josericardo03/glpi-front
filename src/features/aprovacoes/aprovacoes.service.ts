import { api } from '@/lib/api';
import type { ApiAprovacao } from '@/lib/backend/types';
import { data, getAll, request, TETO_PAGINA } from '@/lib/http';
import * as db from '@/mocks/db';
import type { Aprovacao, AprovacaoInput, DecisaoInput, FiltroStatusAprovacao, Prioridade } from '@/types';

const PRIORIDADE_POR_TIPO_MUDANCA: Record<string, Prioridade> = { EMERGENCIAL: 'CRITICA', NORMAL: 'MEDIA', PADRAO: 'BAIXA' };
const STATUS_DA_API: Record<string, Aprovacao['status']> = { PENDENTE: 'PENDENTE', APROVADO: 'APROVADA', REJEITADO: 'REJEITADA', CANCELADO: 'CANCELADA' };
const FILTRO_MOCK: Record<FiltroStatusAprovacao, Aprovacao['status'] | null> = {
  PENDENTE: 'PENDENTE',
  APROVADO: 'APROVADA',
  REJEITADO: 'REJEITADA',
  CANCELADO: 'CANCELADA',
  TODOS: null,
};

const PRIORIDADES = new Set<string>(['CRITICA', 'ALTA', 'MEDIA', 'BAIXA']);

/** A API devolve a prioridade do chamado ou, para mudanças, o `tipo_mudanca`. */
const prioridadeDe = (a: ApiAprovacao): Prioridade =>
  a.prioridade && PRIORIDADES.has(a.prioridade) ? (a.prioridade as Prioridade) : (PRIORIDADE_POR_TIPO_MUDANCA[a.prioridade ?? ''] ?? 'MEDIA');

/** GET /aprovacoes?status=: todas do tenant para técnicos e gestores, só as próprias para o solicitante. */
async function listaReal(filtro: FiltroStatusAprovacao): Promise<Aprovacao[]> {
  const rows = await getAll<ApiAprovacao>('/aprovacoes', TETO_PAGINA.aprovacoes, { status: filtro });
  return rows
    .map(
      (a): Aprovacao => ({
        id: a.id,
        titulo: a.titulo_chamado ?? a.titulo_mudanca ?? (a.id_chamado ? `Chamado #${a.id_chamado}` : `Mudança #${a.id_mudanca}`),
        descricao: a.descricao,
        origem: a.id_chamado ? 'CHAMADO' : 'MUDANCA',
        chamadoId: a.id_chamado,
        mudancaId: a.id_mudanca,
        solicitanteNome: a.solicitante?.nome ?? `Usuário #${a.id_solicitante}`,
        aprovadorNome: a.aprovador?.nome ?? `Usuário #${a.id_aprovador}`,
        prioridade: prioridadeDe(a),
        risco: null,
        custoEstimado: null,
        solicitadoEm: a.data_solicitacao,
        status: STATUS_DA_API[a.status] ?? 'PENDENTE',
        decididoEm: a.data_decisao ?? null,
        justificativaAprovador: a.justificativa_aprovador ?? null,
      }),
    )
    .sort(ordenar);
}

/** Pendentes: mais antigas primeiro (fila); decididas: mais recentes primeiro. */
const ordenar = (a: Aprovacao, b: Aprovacao) =>
  a.status === 'PENDENTE' && b.status === 'PENDENTE'
    ? a.solicitadoEm.localeCompare(b.solicitadoEm)
    : (b.decididoEm ?? b.solicitadoEm).localeCompare(a.decididoEm ?? a.solicitadoEm);

export const aprovacoesService = {
  list: (filtro: FiltroStatusAprovacao) =>
    request<Aprovacao[]>(
      () => listaReal(filtro),
      () => db.aprovacoes.filter((a) => !FILTRO_MOCK[filtro] || a.status === FILTRO_MOCK[filtro]).sort(ordenar),
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
        const mudanca = input.mudancaId !== undefined ? db.mudancas.find((m) => m.id === input.mudancaId) : undefined;
        const a: Aprovacao = {
          id: Math.max(0, ...db.aprovacoes.map((x) => x.id)) + 1,
          titulo: chamado?.titulo ?? mudanca?.titulo ?? `Mudança #${input.mudancaId}`,
          descricao: input.descricao,
          origem: chamado ? 'CHAMADO' : 'MUDANCA',
          chamadoId: input.chamadoId ?? null,
          mudancaId: input.mudancaId ?? null,
          solicitanteNome: db.usuarios[0]!.nome,
          aprovadorNome: aprovador.nome,
          prioridade: chamado?.prioridade ?? 'MEDIA',
          risco: null,
          custoEstimado: null,
          solicitadoEm: new Date().toISOString(),
          status: 'PENDENTE',
          decididoEm: null,
          justificativaAprovador: null,
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
        Object.assign(a, { status: input.decisao, decididoEm: new Date().toISOString(), justificativaAprovador: input.justificativa ?? null });
        const mudanca = db.mudancas.find((m) => m.id === a.mudancaId);
        if (mudanca) mudanca.status = input.decisao === 'APROVADA' ? 'AGENDADA' : 'CANCELADA';
        return a;
      },
    ),
};
