import { api } from '@/lib/api';
import { currentTenantId } from '@/lib/backend/lookups';
import type { ApiChamado, ApiChamadoDetalhe } from '@/lib/backend/types';
import { data, matches, paginate, request } from '@/lib/http';
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
  MotivoPausa,
  PausaSla,
  Worklog,
} from '@/types';
import { calcularPrioridade, SLA_SOLUCAO_MIN } from '../utils/prioridade';
import { loadCtx, toChamado, toChamadoDetalhe } from './chamado.mapper';

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

async function fetchChamados(url: string, f: ChamadoFiltros) {
  const [rows, ctx] = await Promise.all([data(api.get<ApiChamado[]>(url, { params: f.status ? { status: f.status } : undefined })), loadCtx()]);
  return aplicarFiltros(
    rows.map((r) => toChamado(r, ctx)),
    f,
    (id) => ctx.categorias.get(id)?.id_categoria_pai,
  );
}

const semEndpoint = (recurso: string) => new Error(`${recurso} ainda não está disponível na API.`);

export const chamadosService = {
  list: (f: ChamadoFiltros) =>
    request<Paginated<Chamado>>(
      async () => paginate(await fetchChamados('/chamados', f), f.page, f.pageSize),
      () => paginate(filtrar(f), f.page, f.pageSize),
    ),

  triagem: (f: ChamadoFiltros) =>
    request<Paginated<Chamado>>(
      async () => {
        const rows = (await fetchChamados('/triagem', { ...f, status: '' })).filter((c) => !c.tecnicoId);
        return paginate(rows.sort((a, b) => a.slaRestanteMin - b.slaRestanteMin), f.page, f.pageSize);
      },
      () =>
        paginate(
          filtrar(f)
            .filter((c) => c.status === 'NOVO' && !c.tecnicoId)
            .sort((a, b) => a.slaRestanteMin - b.slaRestanteMin),
          f.page,
          f.pageSize,
        ),
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
    return request<unknown>(
      () => data(api.post(`/chamados/${id}/anexos`, form, { headers: { 'Content-Type': 'multipart/form-data' } })),
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
