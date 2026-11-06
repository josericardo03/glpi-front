import { api } from '@/lib/api';
import type { ApiAtivo } from '@/lib/backend/types';
import { data, getAll, matches, request, TETO_PAGINA } from '@/lib/http';
import { uid } from '@/lib/utils';
import * as db from '@/mocks/db';
import type { Ativo, AtivoDetalhe, AtivoFiltros, AtivoInput, AtivosResumo, Dependencia, Especificacao, Manutencao, ManutencaoInput, StatusAtivo, StatusChamado, TipoAtivo } from '@/types';

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

export const ativosService = {
  /** Inventário completo; filtros, resumo e paginação são calculados na tela. */
  list: () => request<Ativo[]>(fetchAtivos, () => db.ativos.map(toResumo)),

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
