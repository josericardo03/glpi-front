import { api } from '@/lib/api';
import type { ApiAtivo } from '@/lib/backend/types';
import { data, getAll, getPagina, matches, paginate, request, TETO_PAGINA } from '@/lib/http';
import { uid } from '@/lib/utils';
import * as db from '@/mocks/db';
import type { Ativo, AtivoDetalhe, AtivoFiltros, AtivoInput, AtivosResumo, Dependencia, Especificacao, Manutencao, ManutencaoInput, Paginated, StatusAtivo, StatusChamado, TipoAtivo } from '@/types';

const toResumo = ({ especificacoes: _e, manutencoes: _m, dependencias: _d, chamadosVinculados: _c, ...a }: AtivoDetalhe): Ativo => a;
const find = (id: number) => {
  const a = db.ativos.find((x) => x.id === id);
  if (!a) throw new Error('Ativo não encontrado (HTTP 404).');
  return a;
};

const TIPO_DA_API: Record<string, TipoAtivo> = {
  NOTEBOOK: 'NOTEBOOK',
  SERVIDOR: 'SERVIDOR',
  LICENCA_SOFTWARE: 'LICENCA',
  RUST_ROUTER: 'ROTEADOR',
  SWITCH: 'SWITCH',
  OUTRO: 'OUTRO',
};
const TIPO_PARA_API: Record<TipoAtivo, string> = {
  NOTEBOOK: 'NOTEBOOK',
  SERVIDOR: 'SERVIDOR',
  LICENCA: 'LICENCA_SOFTWARE',
  ROTEADOR: 'RUST_ROUTER',
  SWITCH: 'SWITCH',
  OUTRO: 'OUTRO',
};
const STATUS_DA_API: Record<string, StatusAtivo> = { ATIVO: 'EM_USO', EM_ESTOQUE: 'ESTOQUE', EM_MANUTENCAO: 'MANUTENCAO', DESATIVADO: 'DESCARTADO' };
const STATUS_PARA_API: Record<StatusAtivo, string> = { EM_USO: 'ATIVO', ESTOQUE: 'EM_ESTOQUE', MANUTENCAO: 'EM_MANUTENCAO', DESCARTADO: 'DESATIVADO' };

/** `yyyy-mm-dd` → ISO ao meio-dia UTC, para que o dia não mude em nenhum fuso do Brasil. */
const dataParaIso = (dia: string) => `${dia}T12:00:00.000Z`;

function toAtivo(a: ApiAtivo): Ativo {
  return {
    id: a.id,
    codigo: a.codigo_patrimonio,
    nome: a.nome,
    tipo: TIPO_DA_API[a.tipo_ativo] ?? 'OUTRO',
    numeroSerie: null,
    responsavelId: a.id_usuario_atribuido,
    responsavelNome: a.id_usuario_atribuido ? (a.usuario_atribuido?.nome ?? `Usuário #${a.id_usuario_atribuido}`) : null,
    status: STATUS_DA_API[a.status] ?? 'ESTOQUE',
    localizacao: null,
    fabricante: null,
    modelo: null,
    dataAquisicao: a.data_aquisicao ?? null,
    garantiaAte: null,
    saude: null,
  };
}

interface ApiAtivoDetalhe extends ApiAtivo {
  especificacoes: { id: number; chave: string; valor: string }[];
  manutencoes: { id: number; descricao_servico: string; custo_manutencao: number; data_inicio: string; tecnico: { nome: string } }[];
  dependencias: { id: number; nome: string; tipo_ativo: string; codigo_patrimonio: string; relacao: Dependencia['relacao'] }[];
  chamados: { id: number; titulo: string; status: string }[];
}

/** A tabela de manutenções não tem coluna de tipo: ele vai como prefixo "[Corretiva]" na descrição. */
const ROTULO_MANUTENCAO: Record<Manutencao['tipo'], string> = { PREVENTIVA: 'Preventiva', CORRETIVA: 'Corretiva' };
const PREFIXO_MANUTENCAO = /^\[(Preventiva|Corretiva)\]\s*/i;

const descricaoParaApi = (tipo: Manutencao['tipo'], descricao: string) => `[${ROTULO_MANUTENCAO[tipo]}] ${descricao}`;

function manutencaoDaApi(m: ApiAtivoDetalhe['manutencoes'][number]): Manutencao {
  const tipo = PREFIXO_MANUTENCAO.exec(m.descricao_servico)?.[1]?.toUpperCase() === 'CORRETIVA' ? 'CORRETIVA' : 'PREVENTIVA';
  return {
    id: m.id,
    descricao: m.descricao_servico.replace(PREFIXO_MANUTENCAO, ''),
    tipo,
    custo: Number(m.custo_manutencao),
    realizadaEm: m.data_inicio,
    responsavel: m.tecnico.nome,
  };
}

function toDetalhe(a: ApiAtivoDetalhe): AtivoDetalhe {
  return {
    ...toAtivo(a),
    especificacoes: a.especificacoes.map((e) => ({ id: e.id, chave: e.chave, valor: e.valor })),
    manutencoes: a.manutencoes.map(manutencaoDaApi),
    dependencias: a.dependencias.map((d) => ({
      id: d.id,
      codigo: d.codigo_patrimonio,
      nome: d.nome,
      tipo: TIPO_DA_API[d.tipo_ativo] ?? 'OUTRO',
      relacao: d.relacao,
    })),
    chamadosVinculados: a.chamados.map((c) => ({ id: c.id, titulo: c.titulo, status: c.status as StatusChamado })),
  };
}

const fetchAtivos = async () => (await getAll<ApiAtivo>('/ativos', TETO_PAGINA.ativos)).map(toAtivo);

export function resumirAtivos(todos: Ativo[]): AtivosResumo {
  const porTipo = Object.fromEntries(Object.keys(TIPO_PARA_API).map((t) => [t, 0])) as Record<TipoAtivo, number>;
  todos.forEach((a) => porTipo[a.tipo]++);
  const operacionais = todos.filter((a) => a.status !== 'DESCARTADO');
  return {
    total: todos.length,
    porTipo,
    disponibilidadePct: operacionais.length ? (operacionais.filter((a) => a.status === 'EM_USO').length / operacionais.length) * 100 : 0,
    emManutencao: todos.filter((a) => a.status === 'MANUTENCAO').length,
  };
}

export function filtrarAtivos(todos: Ativo[], f: Omit<AtivoFiltros, 'page' | 'pageSize'>) {
  return todos.filter(
    (a) =>
      (matches(a.nome, f.search) || matches(a.codigo, f.search) || matches(a.numeroSerie ?? '', f.search)) &&
      (!f.tipo || a.tipo === f.tipo) &&
      (!f.status || a.status === f.status),
  );
}

type FiltrosAtivo = Omit<AtivoFiltros, 'page' | 'pageSize'>;

/** Filtros no vocabulário da API; busca, tipo e status são aplicados no servidor. */
const paramsAtivos = (f: FiltrosAtivo) => ({
  ...(f.search?.trim() && { busca: f.search.trim() }),
  ...(f.tipo && { tipo_ativo: TIPO_PARA_API[f.tipo] }),
  ...(f.status && { status: STATUS_PARA_API[f.status] }),
});

interface ApiAtivosResumo {
  total: number;
  por_tipo: Record<string, number>;
  por_status: Record<string, number>;
}

function resumoDaApi(r: ApiAtivosResumo): AtivosResumo {
  const porTipo = Object.fromEntries(Object.keys(TIPO_PARA_API).map((t) => [t, 0])) as Record<TipoAtivo, number>;
  for (const [tipo, n] of Object.entries(r.por_tipo)) porTipo[TIPO_DA_API[tipo] ?? 'OUTRO'] += n;
  const porStatus: Partial<Record<StatusAtivo, number>> = {};
  for (const [status, n] of Object.entries(r.por_status)) {
    const s = STATUS_DA_API[status] ?? 'ESTOQUE';
    porStatus[s] = (porStatus[s] ?? 0) + n;
  }
  const operacionais = r.total - (porStatus.DESCARTADO ?? 0);
  return {
    total: r.total,
    porTipo,
    disponibilidadePct: operacionais > 0 ? ((porStatus.EM_USO ?? 0) / operacionais) * 100 : 0,
    emManutencao: porStatus.MANUTENCAO ?? 0,
  };
}

export const ativosService = {
  /** Inventário completo (sem filtro): usado só em seletores. A tela de ativos usa `pagina` e `resumo`. */
  list: () => request<Ativo[]>(fetchAtivos, () => db.ativos.map(toResumo)),

  /** Uma página já filtrada pelo servidor (busca, tipo, status). */
  pagina: (f: AtivoFiltros) =>
    request<Paginated<Ativo>>(
      async () => {
        const p = await getPagina<ApiAtivo>('/ativos', paramsAtivos(f), f.page ?? 1, f.pageSize ?? 10);
        return { ...p, data: p.data.map(toAtivo) };
      },
      () => paginate(filtrarAtivos(db.ativos.map(toResumo), f), f.page, f.pageSize),
    ),

  /** Contagens do inventário inteiro (cartões e abas), sem baixar a lista. */
  resumo: () =>
    request<AtivosResumo>(
      async () => resumoDaApi(await data(api.get<ApiAtivosResumo>('/ativos/resumo'))),
      () => resumirAtivos(db.ativos.map(toResumo)),
    ),

  /** Todos os ativos que atendem ao filtro, para exportar (percorre as páginas do servidor). */
  exportar: (f: FiltrosAtivo) =>
    request<Ativo[]>(
      async () => (await getAll<ApiAtivo>('/ativos', TETO_PAGINA.ativos, paramsAtivos(f))).map(toAtivo),
      () => filtrarAtivos(db.ativos.map(toResumo), f),
    ),

  get: (id: number) =>
    request<AtivoDetalhe>(
      async () => toDetalhe(await data(api.get<ApiAtivoDetalhe>(`/ativos/${id}`))),
      () => find(id),
    ),

  create: (input: AtivoInput) =>
    request<unknown>(
      () =>
        data(
          api.post('/ativos', {
            codigo_patrimonio: input.codigo.trim().toUpperCase(),
            nome: input.nome.trim(),
            tipo_ativo: TIPO_PARA_API[input.tipo],
            status: STATUS_PARA_API[input.status],
            ...(input.responsavelId && { id_usuario_atribuido: input.responsavelId }),
            ...(input.dataAquisicao && { data_aquisicao: dataParaIso(input.dataAquisicao) }),
          }),
        ),
      () => {
        const codigo = input.codigo.trim().toUpperCase();
        if (db.ativos.some((a) => a.codigo === codigo)) throw new Error('Código de patrimônio já cadastrado (HTTP 409).');
        const a: AtivoDetalhe = {
          id: Math.max(0, ...db.ativos.map((x) => x.id)) + 1,
          codigo,
          nome: input.nome.trim(),
          tipo: input.tipo,
          status: input.status,
          numeroSerie: null,
          responsavelId: input.responsavelId,
          responsavelNome: db.usuarios.find((u) => u.id === input.responsavelId)?.nome ?? null,
          localizacao: null,
          fabricante: null,
          modelo: null,
          dataAquisicao: input.dataAquisicao ? dataParaIso(input.dataAquisicao) : null,
          garantiaAte: null,
          saude: 100,
          especificacoes: [],
          manutencoes: [],
          dependencias: [],
          chamadosVinculados: [],
        };
        db.ativos.unshift(a);
        return toResumo(a);
      },
    ),

  update: (id: number, antes: Ativo, input: AtivoInput) =>
    request<unknown>(
      async () => {
        const codigo = input.codigo.trim().toUpperCase();
        const nome = input.nome.trim();
        const body: Record<string, unknown> = {};
        if (codigo !== antes.codigo) body.codigo_patrimonio = codigo;
        if (nome !== antes.nome) body.nome = nome;
        if (TIPO_PARA_API[input.tipo] !== TIPO_PARA_API[antes.tipo]) body.tipo_ativo = TIPO_PARA_API[input.tipo];
        if (STATUS_PARA_API[input.status] !== STATUS_PARA_API[antes.status]) body.status = STATUS_PARA_API[input.status];
        if (input.responsavelId !== antes.responsavelId) body.id_usuario_atribuido = input.responsavelId;
        const dia = input.dataAquisicao || null;
        const diaAntes = antes.dataAquisicao?.slice(0, 10) ?? null;
        if (dia !== diaAntes) body.data_aquisicao = dia ? dataParaIso(dia) : null;
        if (Object.keys(body).length) await data(api.patch(`/ativos/${id}`, body));
      },
      () => {
        const a = find(id);
        const codigo = input.codigo.trim().toUpperCase();
        if (db.ativos.some((x) => x.id !== id && x.codigo === codigo)) throw new Error('Código de patrimônio já cadastrado (HTTP 409).');
        Object.assign(a, {
          codigo,
          nome: input.nome.trim(),
          tipo: input.tipo,
          status: input.status,
          responsavelId: input.responsavelId,
          responsavelNome: db.usuarios.find((u) => u.id === input.responsavelId)?.nome ?? null,
          dataAquisicao: input.dataAquisicao ? dataParaIso(input.dataAquisicao) : null,
        });
        return toResumo(a);
      },
    ),

  addEspecificacao: (id: number, body: Omit<Especificacao, 'id'>) =>
    request<Especificacao>(
      () => data(api.post<Especificacao>(`/ativos/${id}/especificacoes`, { chave: body.chave, valor: body.valor })),
      () => {
        const e = { id: uid(), ...body };
        find(id).especificacoes.push(e);
        return e;
      },
    ),

  addManutencao: (id: number, body: ManutencaoInput) =>
    request<unknown>(
      () =>
        data(
          api.post(`/ativos/${id}/manutencoes`, {
            descricao_servico: descricaoParaApi(body.tipo, body.descricao),
            custo_manutencao: Math.round(body.custo * 100) / 100,
            data_inicio: body.realizadaEm,
          }),
        ),
      () => {
        const m = { id: uid(), ...body, responsavel: 'Você' };
        find(id).manutencoes.unshift(m);
        return m;
      },
    ),
};
