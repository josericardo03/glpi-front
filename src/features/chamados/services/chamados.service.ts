import { api } from '@/lib/api';
import { matches, paginate, request } from '@/lib/http';
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
  Paginated,
  PausaSla,
  Worklog,
} from '@/types';
import { calcularPrioridade, SLA_SOLUCAO_MIN } from '../utils/prioridade';

const toResumo = ({ comentarios, worklogs, pausas, anexos, historico, ...c }: ChamadoDetalhe): Chamado => c;
const find = (id: number) => {
  const c = db.chamados.find((x) => x.id === id);
  if (!c) throw new Error('Chamado não encontrado (HTTP 404).');
  return c;
};
const nowIso = () => new Date().toISOString();

function filtrar(f: ChamadoFiltros) {
  return db.chamados
    .filter(
      (c) =>
        (matches(c.titulo, f.search) || matches(String(c.id), f.search) || matches(c.solicitanteNome, f.search)) &&
        (!f.status || c.status === f.status) &&
        (!f.prioridade || c.prioridade === f.prioridade) &&
        (!f.tipo || c.tipo === f.tipo) &&
        (!f.categoriaId || c.categoriaId === Number(f.categoriaId) || db.categorias.find((x) => x.id === c.categoriaId)?.categoriaPaiId === Number(f.categoriaId)) &&
        (!f.tecnicoId || c.tecnicoId === Number(f.tecnicoId)) &&
        (!f.grupoId || c.grupoId === Number(f.grupoId)),
    )
    .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
    .map(toResumo);
}

export const chamadosService = {
  list: (f: ChamadoFiltros) =>
    request<Paginated<Chamado>>(() => api.get('/chamados', { params: f }), () => paginate(filtrar(f), f.page, f.pageSize)),

  triagem: (f: ChamadoFiltros) =>
    request<Paginated<Chamado>>(
      () => api.get('/chamados/triagem', { params: f }),
      () =>
        paginate(
          filtrar(f)
            .filter((c) => c.status === 'NOVO' && !c.tecnicoId)
            .sort((a, b) => a.slaRestanteMin - b.slaRestanteMin),
          f.page,
          f.pageSize,
        ),
    ),

  get: (id: number) => request<ChamadoDetalhe>(() => api.get(`/chamados/${id}`), () => find(id)),

  create: (input: ChamadoInput) =>
    request<Chamado>(
      () => api.post('/chamados', input),
      () => {
        const prioridade = calcularPrioridade(input.impacto, input.urgencia);
        const sla = SLA_SOLUCAO_MIN[prioridade];
        const cat = db.categorias.find((c) => c.id === input.categoriaId);
        const pai = db.categorias.find((c) => c.id === cat?.categoriaPaiId);
        const solicitante = db.usuarios.find((u) => u.id === input.solicitanteId)!;
        const c: ChamadoDetalhe = {
          ...input,
          id: Math.max(...db.chamados.map((x) => x.id)) + 1,
          status: 'NOVO',
          prioridade,
          categoriaNome: pai ? `${pai.nome} / ${cat!.nome}` : (cat?.nome ?? ''),
          solicitanteNome: solicitante.nome,
          grupoNome: db.grupos.find((g) => g.id === input.grupoId)?.nome ?? null,
          tecnicoNome: db.usuarios.find((u) => u.id === input.tecnicoId)?.nome ?? null,
          abertoEm: nowIso(),
          atualizadoEm: nowIso(),
          prazoSla: new Date(Date.now() + sla * 60_000).toISOString(),
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

  uploadAnexo: (id: number, file: File) => {
    const form = new FormData();
    form.append('arquivo', file);
    return request<Anexo>(
      () => api.post(`/chamados/${id}/anexos`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
      () => {
        const a: Anexo = { id: uid(), chamadoId: id, nomeArquivo: file.name, tamanhoBytes: file.size, mimeType: file.type, enviadoPor: 'Você', criadoEm: nowIso() };
        find(id).anexos.push(a);
        return a;
      },
    );
  },

  atualizarStatus: (id: number, input: AtualizarStatusInput) =>
    request<Chamado>(
      () => api.patch(`/chamados/${id}/status`, input),
      () => {
        const c = find(id);
        const changes: string[] = [];
        if (input.status && input.status !== c.status) {
          changes.push(`Status alterado para ${input.status}`);
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
    request<Comentario>(
      () => api.post(`/chamados/${id}/comentarios`, body),
      () => {
        const u = db.usuarios[0]!;
        const cm: Comentario = { id: uid(), chamadoId: id, autorId: u.id, autorNome: u.nome, autorPapel: 'Técnico', ...body, criadoEm: nowIso() };
        find(id).comentarios.push(cm);
        return cm;
      },
    ),

  pausar: (id: number, body: { motivo: string }) =>
    request<PausaSla>(
      () => api.post(`/chamados/${id}/pausas`, body),
      () => {
        const c = find(id);
        const p: PausaSla = { id: uid(), chamadoId: id, motivo: body.motivo, iniciadaEm: nowIso(), finalizadaEm: null };
        c.pausas.push(p);
        c.status = 'PENDENTE';
        c.slaPausado = true;
        c.historico.push({ id: uid(), descricao: `SLA pausado: ${body.motivo}`, autor: 'Você', criadoEm: nowIso() });
        return p;
      },
    ),

  registrarWorklog: (id: number, body: { descricao: string; minutos: number }) =>
    request<Worklog>(
      () => api.post(`/chamados/${id}/worklogs`, body),
      () => {
        const w: Worklog = { id: uid(), chamadoId: id, tecnicoNome: db.usuarios[0]!.nome, ...body, realizadoEm: nowIso() };
        find(id).worklogs.push(w);
        return w;
      },
    ),
};
