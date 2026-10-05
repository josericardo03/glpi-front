import { api } from '@/lib/api';
import { currentTenantId } from '@/lib/backend/lookups';
import type { ApiChamado, ApiChamadoDetalhe } from '@/lib/backend/types';
import { data, matches, request } from '@/lib/http';
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
  MotivoPausa,
  PausaSla,
  Worklog,
} from '@/types';
import { ANEXO_MAX_BYTES } from '../utils/anexos';
import { calcularPrioridade, categoriaAceitaTipo, politicaAplicavel } from '../utils/prioridade';
import { STATUS_LABEL, TRANSICOES } from '../utils/transicoes';
import { listarChamados, loadCtx, toChamado, toChamadoDetalhe } from './chamado.mapper';

const toResumo = ({ comentarios, worklogs, pausas, anexos, historico, ...c }: ChamadoDetalhe): Chamado => c;
const find = (id: number) => {
  const c = db.chamados.find((x) => x.id === id);
  if (!c) throw new Error('Chamado não encontrado (HTTP 404).');
  return c;
};
const nowIso = () => new Date().toISOString();

function aplicarFiltros(rows: Chamado[], f: ChamadoFiltros, categoriaPai: (id: number) => number | null | undefined) {
  return rows.filter(
    (c) =>
      (matches(c.titulo, f.search) || matches(String(c.id), f.search) || matches(c.solicitanteNome, f.search)) &&
      (!f.status || c.status === f.status) &&
      (!f.prioridade || c.prioridade === f.prioridade) &&
      (!f.tipo || c.tipo === f.tipo) &&
      (!f.categoriaId || c.categoriaId === Number(f.categoriaId) || categoriaPai(c.categoriaId) === Number(f.categoriaId)) &&
      (!f.tecnicoId || c.tecnicoId === Number(f.tecnicoId)) &&
      (!f.grupoId || c.grupoId === Number(f.grupoId)),
  );
}

function filtrar(f: ChamadoFiltros) {
  return aplicarFiltros(db.chamados.map(toResumo), f, (id) => db.categorias.find((x) => x.id === id)?.categoriaPaiId).sort((a, b) =>
    b.atualizadoEm.localeCompare(a.atualizadoEm),
  );
}

const porSla = (a: Chamado, b: Chamado) => (a.slaRestanteMin ?? Infinity) - (b.slaRestanteMin ?? Infinity);

const semEndpoint = (recurso: string) => new Error(`${recurso} ainda não está disponível na API.`);

/** Listagens devolvem o conjunto filtrado completo; a paginação é feita na tela. */
export const chamadosService = {
  list: (f: ChamadoFiltros) =>
    request<Chamado[]>(
      async () => {
        const [rows, ctx] = await Promise.all([listarChamados(), loadCtx()]);
        return aplicarFiltros(rows, f, (id) => ctx.categorias.get(id)?.id_categoria_pai).sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
      },
      () => filtrar(f),
    ),

  triagem: (f: ChamadoFiltros) =>
    request<Chamado[]>(
      async () => {
        const [rows, ctx] = await Promise.all([data(api.get<ApiChamado[]>('/triagem')), loadCtx()]);
        return aplicarFiltros(
          rows.map((r) => toChamado(r, ctx)),
          { ...f, status: '' },
          (id) => ctx.categorias.get(id)?.id_categoria_pai,
        )
          .filter((c) => !c.tecnicoId)
          .sort(porSla);
      },
      () => filtrar({ ...f, status: '' }).filter((c) => c.status === 'NOVO' && !c.tecnicoId).sort(porSla),
    ),

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
