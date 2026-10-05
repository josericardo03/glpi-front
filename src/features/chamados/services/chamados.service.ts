import { isAxiosError } from 'axios';
import { api } from '@/lib/api';
import { currentTenantId } from '@/lib/backend/lookups';
import type { ApiChamado, ApiChamadoDetalhe } from '@/lib/backend/types';
import { contar, data, getAll, getPagina, matches, paginate, request, TETO_PAGINA } from '@/lib/http';
import { uid } from '@/lib/utils';
import * as db from '@/mocks/db';
import type {
  Anexo,
  AtualizarStatusInput,
  Chamado,
  ChamadoDetalhe,
  ChamadoFiltros,
  ChamadoInput,
  Comentario,
  CsatInput,
  MotivoPausa,
  Paginated,
  PausaSla,
  Worklog,
} from '@/types';
import { ANEXO_MAX_BYTES } from '../utils/anexos';
import { calcularPrioridade, categoriaAceitaTipo, politicaAplicavel } from '../utils/prioridade';
import { STATUS_LABEL, TRANSICOES } from '../utils/transicoes';
import { loadCtx, toChamado, toChamadoDetalhe } from './chamado.mapper';

const toResumo = ({ comentarios, worklogs, pausas, anexos, historico, problemas, mudancas, csat, ...c }: ChamadoDetalhe): Chamado => c;
const find = (id: number) => {
  const c = db.chamados.find((x) => x.id === id);
  if (!c) throw new Error('Chamado não encontrado (HTTP 404).');
  return c;
};
const nowIso = () => new Date().toISOString();

const statusDoFiltro = (f: ChamadoFiltros) => (f.status ? [f.status] : f.statusIn);

function paramsChamados(f: ChamadoFiltros): Record<string, unknown> {
  const status = statusDoFiltro(f);
  return {
    ...(status?.length && { status: status.join(',') }),
    ...(f.prioridade && { prioridade: f.prioridade }),
    ...(f.tipo && { tipo: f.tipo }),
    ...(f.categoriaId && { id_categoria: f.categoriaId }),
    ...(f.tecnicoId && { id_tecnico: f.tecnicoId }),
    ...(f.grupoId && { id_grupo: f.grupoId }),
    ...(f.slaVencido !== undefined && { sla_vencido: f.slaVencido }),
    ...(f.search?.trim() && { busca: f.search.trim() }),
    ...(f.ordenar && { ordenar: f.ordenar }),
  };
}

/** `statusIn: []` significa "nenhum status": a resposta é vazia sem consultar a API. */
const semResultado = (f: ChamadoFiltros) => statusDoFiltro(f)?.length === 0;
const paginaVazia = (f: ChamadoFiltros): Paginated<Chamado> => ({ data: [], total: 0, page: f.page ?? 1, pageSize: f.pageSize ?? 10 });

function filtrarMock(f: ChamadoFiltros) {
  const status = statusDoFiltro(f);
  return db.chamados
    .map(toResumo)
    .filter(
      (c) =>
        (matches(c.titulo, f.search) || matches(c.descricao, f.search) || matches(String(c.id), f.search)) &&
        (!status || status.includes(c.status)) &&
        (!f.prioridade || c.prioridade === f.prioridade) &&
        (!f.tipo || c.tipo === f.tipo) &&
        (!f.categoriaId || c.categoriaId === Number(f.categoriaId)) &&
        (!f.tecnicoId || (f.tecnicoId === 'sem' ? !c.tecnicoId : c.tecnicoId === Number(f.tecnicoId))) &&
        (!f.grupoId || c.grupoId === Number(f.grupoId)) &&
        (f.slaVencido === undefined || c.slaVencido === f.slaVencido),
    )
    .sort((a, b) => b.abertoEm.localeCompare(a.abertoEm));
}

const semEndpoint = (recurso: string) => new Error(`${recurso} ainda não está disponível na API.`);

async function paginaReal(url: '/chamados' | '/triagem', f: ChamadoFiltros, teto: number): Promise<Paginated<Chamado>> {
  if (semResultado(f)) return paginaVazia(f);
  const p = await getPagina<ApiChamado>(url, paramsChamados(f), f.page ?? 1, Math.min(f.pageSize ?? 10, teto));
  return { ...p, data: p.data.map((r) => toChamado(r)) };
}

/** Filtros, ordenação e paginação são aplicados pela API. */
export const chamadosService = {
  list: (f: ChamadoFiltros) =>
    request<Paginated<Chamado>>(
      () => paginaReal('/chamados', f, TETO_PAGINA.chamados),
      () => (semResultado(f) ? paginaVazia(f) : paginate(filtrarMock(f), f.page, f.pageSize)),
    ),

  contar: (f: ChamadoFiltros) =>
    request<number>(
      async () => (semResultado(f) ? 0 : contar('/chamados', paramsChamados(f))),
      () => (semResultado(f) ? 0 : filtrarMock(f).length),
    ),

  /** Todos os chamados do filtro, para exportação. */
  exportar: (f: ChamadoFiltros) =>
    request<Chamado[]>(
      async () => (semResultado(f) ? [] : (await getAll<ApiChamado>('/chamados', TETO_PAGINA.chamados, paramsChamados(f))).map((r) => toChamado(r))),
      () => filtrarMock(f),
    ),

  /** Chamados novos sem técnico, os mais urgentes primeiro. */
  triagem: (f: ChamadoFiltros) => {
    const filtros: ChamadoFiltros = { ...f, status: '', statusIn: undefined, tecnicoId: 'sem', ordenar: f.ordenar ?? 'prioridade:desc' };
    return request<Paginated<Chamado>>(
      () => paginaReal('/triagem', filtros, TETO_PAGINA.triagem),
      () => paginate(filtrarMock({ ...filtros, statusIn: ['NOVO'] }), f.page, f.pageSize),
    );
  },

  get: (id: number) =>
    request<ChamadoDetalhe>(
      async () => {
        const [row, ctx] = await Promise.all([data(api.get<ApiChamadoDetalhe>(`/chamados/${currentTenantId()}/${id}`)), loadCtx()]);
        return toChamadoDetalhe(row, ctx);
      },
      () => find(id),
    ),

  create: (input: ChamadoInput) =>
    request<Pick<Chamado, 'id'>>(
      async () => {
        const r = await data(
          api.post<{ id: number }>('/chamados', {
            titulo: input.titulo,
            descricao: input.descricao,
            id_categoria: input.categoriaId,
            tipo: input.tipo,
            origem: input.origem,
            prioridade: calcularPrioridade(input.impacto, input.urgencia),
            ...(input.ativoAfetadoId && { id_ativo_afetado: input.ativoAfetadoId }),
          }),
        );
        return { id: r.id };
      },
      () => {
        const prioridade = calcularPrioridade(input.impacto, input.urgencia);
        const cat = db.categorias.find((c) => c.id === input.categoriaId);
        if (!cat) throw new Error('Categoria não encontrada (HTTP 404).');
        if (!categoriaAceitaTipo(cat.aplicacao, input.tipo)) throw new Error('A categoria não se aplica a este tipo de chamado (HTTP 400).');
        const politica = politicaAplicavel(db.politicasSla, prioridade, input.tipo);
        if (!politica) throw new Error('Não há política de SLA ativa para esta prioridade e tipo de chamado (HTTP 422).');
        const sla = politica.tempoSolucaoMin;
        const pai = db.categorias.find((c) => c.id === cat.categoriaPaiId);
        const solicitante = db.usuarios.find((u) => u.id === input.solicitanteId)!;
        const c: ChamadoDetalhe = {
          ...input,
          id: Math.max(...db.chamados.map((x) => x.id)) + 1,
          status: 'NOVO',
          prioridade,
          categoriaNome: pai ? `${pai.nome} / ${cat.nome}` : cat.nome,
          solicitanteNome: solicitante.nome,
          grupoNome: db.grupos.find((g) => g.id === input.grupoId)?.nome ?? null,
          tecnicoNome: db.usuarios.find((u) => u.id === input.tecnicoId)?.nome ?? null,
          abertoEm: nowIso(),
          atualizadoEm: nowIso(),
          prazoResposta: new Date(Date.now() + politica.tempoRespostaMin * 60_000).toISOString(),
          prazoSla: new Date(Date.now() + sla * 60_000).toISOString(),
          slaVencido: false,
          slaRestanteMin: sla,
          slaTotalMin: sla,
          slaPausado: false,
          comentarios: [],
          worklogs: [],
          pausas: [],
          anexos: [],
          historico: [{ id: 1, descricao: 'Chamado aberto', autor: solicitante.nome, criadoEm: nowIso() }],
          itensConfiguracao: db.ativos.filter((a) => a.id === input.ativoAfetadoId).map((a) => ({ id: a.id, nome: a.nome, detalhe: a.codigo })),
          problemas: [],
          mudancas: [],
          csat: { avaliado: false },
        };
        db.chamados.unshift(c);
        return toResumo(c);
      },
    ),

  /**
   * Multipart com o campo `arquivo`. O Content-Type explícito impede o axios de serializar o FormData
   * como JSON (padrão da instância); no navegador ele é trocado pelo valor com boundary.
   */
  uploadAnexo: (id: number, file: File) => {
    if (file.size > ANEXO_MAX_BYTES) return Promise.reject(new Error(`"${file.name}" excede o limite de 20 MB.`));
    const form = new FormData();
    form.append('arquivo', file, file.name);
    return request<unknown>(
      () => data(api.post(`/chamados/${id}/anexos`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 })),
      () => {
        const a: Anexo = { id: uid(), chamadoId: id, nomeArquivo: file.name, tamanhoBytes: file.size, mimeType: file.type, enviadoPor: 'Você', criadoEm: nowIso() };
        find(id).anexos.push(a);
        return a;
      },
    );
  },

  baixarAnexo: (anexo: Anexo) =>
    request<Blob>(
      () => data(api.get<Blob>(`/chamados/${anexo.chamadoId}/anexos/${anexo.id}`, { responseType: 'blob' })),
      () => new Blob([`Arquivo de demonstração: ${anexo.nomeArquivo}`], { type: 'text/plain' }),
    ),

  atualizarStatus: (id: number, input: AtualizarStatusInput) =>
    request<unknown>(
      async () => {
        if (input.grupoId !== undefined || input.tecnicoId !== undefined) throw semEndpoint('A atribuição de técnico/grupo');
        if (!input.status) return null;
        return data(
          api.patch(`/chamados/${id}/status`, {
            status_novo: input.status,
            ...(input.status === 'RESOLVIDO' && { resolucao: input.resolucao }),
            ...(input.status === 'PENDENTE' && { motivo_pausa: input.motivoPausa }),
          }),
        );
      },
      () => {
        const c = find(id);
        const changes: string[] = [];
        if (input.status && input.status !== c.status) {
          if (!TRANSICOES[c.status].includes(input.status)) throw new Error(`Transição inválida: ${c.status} → ${input.status}.`);
          if (input.status === 'RESOLVIDO' && !input.resolucao?.trim()) throw new Error('resolucao é obrigatória para RESOLVIDO.');
          if (input.status === 'PENDENTE' && !input.motivoPausa) throw new Error('motivo_pausa é obrigatório para PENDENTE.');
          changes.push(`Status alterado para ${STATUS_LABEL[input.status]}`);
          c.status = input.status;
          c.slaPausado = input.status === 'PENDENTE';
        }
        if (input.grupoId !== undefined) {
          c.grupoId = input.grupoId;
          c.grupoNome = db.grupos.find((g) => g.id === input.grupoId)?.nome ?? null;
          changes.push(`Encaminhado ao grupo ${c.grupoNome}`);
        }
        if (input.tecnicoId !== undefined) {
          c.tecnicoId = input.tecnicoId;
          c.tecnicoNome = db.usuarios.find((u) => u.id === input.tecnicoId)?.nome ?? null;
          changes.push(`Atribuído a ${c.tecnicoNome}`);
          if (c.status === 'NOVO' && c.tecnicoId) c.status = 'EM_ATENDIMENTO';
        }
        c.atualizadoEm = nowIso();
        changes.forEach((d) => c.historico.push({ id: uid(), descricao: d, autor: 'Você', criadoEm: nowIso() }));
        return toResumo(c);
      },
    ),

  comentar: (id: number, body: { conteudo: string; interno: boolean }) =>
    request<unknown>(
      () => data(api.post(`/chamados/${id}/comentarios`, { mensagem: body.conteudo, tipo_visibilidade: body.interno ? 'INTERNO' : 'PUBLICO' })),
      () => {
        const u = db.usuarios[0]!;
        const cm: Comentario = { id: uid(), chamadoId: id, autorId: u.id, autorNome: u.nome, autorPapel: 'Técnico', ...body, criadoEm: nowIso() };
        find(id).comentarios.push(cm);
        return cm;
      },
    ),

  pausar: (id: number, body: { motivo: MotivoPausa }) =>
    request<unknown>(
      () => data(api.post(`/chamados/${id}/pausas`, { motivo_pausa: body.motivo })),
      () => {
        const c = find(id);
        if (!TRANSICOES[c.status].includes('PENDENTE')) throw new Error('Só é possível pausar chamados novos ou em atendimento.');
        const p: PausaSla = { id: uid(), chamadoId: id, motivo: body.motivo, iniciadaEm: nowIso(), finalizadaEm: null };
        c.pausas.push(p);
        c.status = 'PENDENTE';
        c.slaPausado = true;
        c.historico.push({ id: uid(), descricao: `SLA pausado: ${body.motivo}`, autor: 'Você', criadoEm: nowIso() });
        return p;
      },
    ),

  retomar: (id: number) =>
    request<unknown>(
      () => data(api.patch(`/chamados/${id}/pausas/retomar`)),
      () => {
        const c = find(id);
        if (c.status !== 'PENDENTE') throw new Error('O chamado não está pausado (HTTP 400).');
        const pausa = c.pausas.find((p) => !p.finalizadaEm);
        if (pausa) pausa.finalizadaEm = nowIso();
        c.status = 'EM_ATENDIMENTO';
        c.slaPausado = false;
        c.historico.push({ id: uid(), descricao: 'Atendimento retomado; SLA voltou a contar', autor: 'Você', criadoEm: nowIso() });
        return toResumo(c);
      },
    ),

  vincularAtivo: (id: number, ativoId: number) =>
    request<unknown>(
      () => data(api.post(`/chamados/${id}/ativos`, { id_ativo: ativoId })),
      () => {
        const c = find(id);
        const a = db.ativos.find((x) => x.id === ativoId);
        if (!a) throw new Error('Ativo não encontrado (HTTP 404).');
        c.itensConfiguracao ??= [];
        if (c.itensConfiguracao.some((ic) => ic.id === ativoId)) throw new Error('Este ativo já está vinculado ao chamado (HTTP 409).');
        c.itensConfiguracao.push({ id: a.id, nome: a.nome, detalhe: a.codigo });
        return a;
      },
    ),

  /** Retorna `false` quando o chamado já havia sido avaliado (HTTP 409). */
  avaliar: ({ chamadoId, nota, comentario }: CsatInput) =>
    request<boolean>(
      async () => {
        try {
          await api.post('/pesquisas-csat', { id_chamado: chamadoId, nota_satisfacao: nota, ...(comentario?.trim() && { comentarios: comentario.trim() }) });
          return true;
        } catch (err) {
          if (isAxiosError(err) && err.response?.status === 409) return false;
          throw err;
        }
      },
      () => {
        const c = find(chamadoId);
        if (c.status !== 'RESOLVIDO' && c.status !== 'CONCLUIDO') throw new Error('Só é possível avaliar chamados resolvidos ou concluídos (HTTP 422).');
        if (c.csat.avaliado) return false;
        c.csat = { avaliado: true, nota, comentario: comentario?.trim() || null, respondidoEm: nowIso() };
        return true;
      },
    ),

  registrarWorklog: (id: number, body: { descricao: string; minutos: number }) =>
    request<unknown>(
      () =>
        data(
          api.post(`/chamados/${id}/worklogs`, {
            descricao_atividade: body.descricao,
            tempo_trabalhado_min: body.minutos,
            data_execucao: nowIso(),
          }),
        ),
      () => {
        const w: Worklog = { id: uid(), chamadoId: id, tecnicoNome: db.usuarios[0]!.nome, ...body, realizadoEm: nowIso() };
        find(id).worklogs.push(w);
        return w;
      },
    ),
};
