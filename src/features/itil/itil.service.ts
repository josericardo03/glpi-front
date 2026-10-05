import { api } from '@/lib/api';
import { byId, lookups } from '@/lib/backend/lookups';
import type { ApiMudanca, ApiProblema, ApiUsuario } from '@/lib/backend/types';
import { data, getAll, request, TETO_PAGINA } from '@/lib/http';
import * as db from '@/mocks/db';
import type {
  Mudanca,
  MudancaDetalhe,
  MudancaInput,
  MudancaUpdate,
  Prioridade,
  Problema,
  ProblemaDetalhe,
  ProblemaInput,
  ProblemaUpdate,
  StatusMudanca,
  StatusProblema,
  TipoMudanca,
  VinculoItil,
} from '@/types';

/** Listagens trazem o nome embutido; os detalhes dependem do lookup de usuários. */
const nomeUsuario = (id: number, embutido?: { nome: string } | null, usuarios?: Map<number, { nome: string }>) =>
  embutido?.nome ?? usuarios?.get(id)?.nome ?? `Usuário #${id}`;
const texto = (v?: string) => v?.trim() || undefined;

function toProblema(p: ApiProblema, us?: Map<number, ApiUsuario>): Problema {
  return {
    id: p.id,
    titulo: p.titulo,
    descricao: p.descricao,
    prioridade: p.prioridade as Prioridade,
    status: p.status as StatusProblema,
    causaRaiz: p.causa_raiz,
    solucaoContorno: p.solucao_contorno,
    tecnicoId: p.id_tecnico_atribuido,
    tecnicoNome: p.id_tecnico_atribuido ? nomeUsuario(p.id_tecnico_atribuido, p.tecnico, us) : null,
    identificadoEm: p.data_identificacao,
    resolvidoEm: p.data_resolucao,
  };
}

function toMudanca(m: ApiMudanca, us?: Map<number, ApiUsuario>): Mudanca {
  return {
    id: m.id,
    titulo: m.titulo,
    descricao: m.descricao,
    justificativa: m.justificativa,
    planoImpacto: m.plano_impacto,
    planoTestes: m.plano_testes,
    planoRetorno: m.plano_retorno,
    tipo: m.tipo_mudanca as TipoMudanca,
    status: m.status as StatusMudanca,
    solicitanteNome: nomeUsuario(m.id_solicitante, m.solicitante, us),
    janelaInicio: m.janela_inicio,
    janelaFim: m.janela_fim,
    criadaEm: m.data_criacao,
  };
}

const toVinculos = (rows: ApiProblema['chamados']): VinculoItil[] => (rows ?? []).map((c) => ({ id: c.id, titulo: c.titulo, status: c.status }));

/** Chamados de exemplo vinculados no modo mock: os que citam o problema/mudança. */
const vinculosMock = (campo: 'problemas' | 'mudancas', id: number): VinculoItil[] =>
  db.chamados.filter((c) => c[campo].some((v) => v.id === id)).map((c) => ({ id: c.id, titulo: c.titulo, status: c.status }));

const problemasRecentes = (a: Problema, b: Problema) => b.identificadoEm.localeCompare(a.identificadoEm);
const mudancasRecentes = (a: Mudanca, b: Mudanca) => b.criadaEm.localeCompare(a.criadaEm);

const acharProblema = (id: number) => {
  const p = db.problemas.find((x) => x.id === id);
  if (!p) throw new Error('Problema não encontrado (HTTP 404).');
  return p;
};
const acharMudanca = (id: number) => {
  const m = db.mudancas.find((x) => x.id === id);
  if (!m) throw new Error('Mudança não encontrada (HTTP 404).');
  return m;
};

export const problemasService = {
  list: () =>
    request<Problema[]>(
      async () => (await getAll<ApiProblema>('/problemas', TETO_PAGINA.problemas)).map((p) => toProblema(p)).sort(problemasRecentes),
      () => [...db.problemas].sort(problemasRecentes),
    ),

  get: (id: number) =>
    request<ProblemaDetalhe>(
      async () => {
        const [row, usuarios] = await Promise.all([data(api.get<ApiProblema>(`/problemas/${id}`)), lookups.usuarios()]);
        return { ...toProblema(row, byId(usuarios)), chamados: toVinculos(row.chamados) };
      },
      () => ({ ...acharProblema(id), chamados: vinculosMock('problemas', id) }),
    ),

  create: (input: ProblemaInput) =>
    request<unknown>(
      () =>
        data(
          api.post('/problemas', {
            titulo: input.titulo.trim(),
            descricao: input.descricao.trim(),
            prioridade: input.prioridade,
            ...(texto(input.causaRaiz) && { causa_raiz: texto(input.causaRaiz) }),
            ...(texto(input.solucaoContorno) && { solucao_contorno: texto(input.solucaoContorno) }),
            ...(input.chamadoId && { id_chamado: input.chamadoId }),
          }),
        ),
      () => {
        const p: Problema = {
          id: Math.max(0, ...db.problemas.map((x) => x.id)) + 1,
          titulo: input.titulo.trim(),
          descricao: input.descricao.trim(),
          prioridade: input.prioridade,
          status: 'SOB_INVESTIGACAO',
          causaRaiz: texto(input.causaRaiz) ?? null,
          solucaoContorno: texto(input.solucaoContorno) ?? null,
          tecnicoId: null,
          tecnicoNome: null,
          identificadoEm: new Date().toISOString(),
          resolvidoEm: null,
        };
        db.problemas.unshift(p);
        const chamado = db.chamados.find((c) => c.id === input.chamadoId);
        chamado?.problemas.push({ id: p.id, titulo: p.titulo, status: p.status });
        return p;
      },
    ),

  update: (id: number, input: ProblemaUpdate) =>
    request<unknown>(
      () =>
        data(
          api.patch(`/problemas/${id}`, {
            ...(input.status && { status: input.status }),
            ...(input.causaRaiz !== undefined && { causa_raiz: input.causaRaiz.trim() || null }),
            ...(input.solucaoContorno !== undefined && { solucao_contorno: input.solucaoContorno.trim() || null }),
            ...(input.tecnicoId !== undefined && { id_tecnico_atribuido: input.tecnicoId }),
          }),
        ),
      () => {
        const p = acharProblema(id);
        const encerra = input.status === 'RESOLVIDO' || input.status === 'FECHADO';
        Object.assign(p, {
          ...(input.status && { status: input.status }),
          ...(input.causaRaiz !== undefined && { causaRaiz: input.causaRaiz.trim() || null }),
          ...(input.solucaoContorno !== undefined && { solucaoContorno: input.solucaoContorno.trim() || null }),
          ...(input.tecnicoId !== undefined && {
            tecnicoId: input.tecnicoId,
            tecnicoNome: input.tecnicoId === null ? null : (db.usuarios.find((u) => u.id === input.tecnicoId)?.nome ?? null),
          }),
          ...(encerra && !p.resolvidoEm && { resolvidoEm: new Date().toISOString() }),
        });
        return p;
      },
    ),
};

export const mudancasService = {
  list: () =>
    request<Mudanca[]>(
      async () => (await getAll<ApiMudanca>('/mudancas', TETO_PAGINA.mudancas)).map((m) => toMudanca(m)).sort(mudancasRecentes),
      () => [...db.mudancas].sort(mudancasRecentes),
    ),

  get: (id: number) =>
    request<MudancaDetalhe>(
      async () => {
        const [row, usuarios] = await Promise.all([data(api.get<ApiMudanca>(`/mudancas/${id}`)), lookups.usuarios()]);
        return { ...toMudanca(row, byId(usuarios)), chamados: toVinculos(row.chamados) };
      },
      () => ({ ...acharMudanca(id), chamados: vinculosMock('mudancas', id) }),
    ),

  create: (input: MudancaInput) =>
    request<unknown>(
      () =>
        data(
          api.post('/mudancas', {
            titulo: input.titulo.trim(),
            descricao: input.descricao.trim(),
            justificativa: input.justificativa.trim(),
            plano_impacto: input.planoImpacto.trim(),
            plano_testes: input.planoTestes.trim(),
            plano_retorno: input.planoRetorno.trim(),
            tipo_mudanca: input.tipo,
            janela_inicio: input.janelaInicio,
            janela_fim: input.janelaFim,
            ...(input.chamadoId && { id_chamado: input.chamadoId }),
          }),
        ),
      () => {
        if (input.janelaFim <= input.janelaInicio) throw new Error('O fim da janela precisa ser depois do início (HTTP 400).');
        const { chamadoId, ...dados } = input;
        const m: Mudanca = {
          ...dados,
          id: Math.max(0, ...db.mudancas.map((x) => x.id)) + 1,
          status: 'RASCUNHO',
          solicitanteNome: db.usuarios[0]!.nome,
          criadaEm: new Date().toISOString(),
        };
        db.mudancas.unshift(m);
        db.chamados.find((c) => c.id === chamadoId)?.mudancas.push({ id: m.id, titulo: m.titulo, status: m.status });
        return m;
      },
    ),

  update: (id: number, input: MudancaUpdate) =>
    request<unknown>(
      () =>
        data(
          api.patch(`/mudancas/${id}`, {
            ...(input.status && { status: input.status }),
            ...(input.janelaInicio && { janela_inicio: input.janelaInicio }),
            ...(input.janelaFim && { janela_fim: input.janelaFim }),
          }),
        ),
      () => {
        const m = acharMudanca(id);
        const inicio = input.janelaInicio ?? m.janelaInicio;
        const fim = input.janelaFim ?? m.janelaFim;
        if (Date.parse(fim) <= Date.parse(inicio)) throw new Error('janela_fim deve ser posterior a janela_inicio (HTTP 400).');
        Object.assign(m, { ...(input.status && { status: input.status }), janelaInicio: inicio, janelaFim: fim });
        return m;
      },
    ),
};
