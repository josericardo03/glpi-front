import { api } from '@/lib/api';
import type { ApiAtivo } from '@/lib/backend/types';
import { data, getAll, matches, request, TETO_PAGINA } from '@/lib/http';
import { uid } from '@/lib/utils';
import * as db from '@/mocks/db';
import type { Ativo, AtivoDetalhe, AtivoFiltros, AtivoInput, AtivosResumo, Especificacao, Manutencao, StatusAtivo, TipoAtivo } from '@/types';

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

const semEndpoint = (recurso: string) => new Error(`${recurso} ainda não está disponível na API.`);

export const ativosService = {
  /** Inventário completo; filtros, resumo e paginação são calculados na tela. */
  list: () => request<Ativo[]>(fetchAtivos, () => db.ativos.map(toResumo)),

  /** A API não possui GET /ativos/:id; o detalhe é montado a partir da listagem. */
  get: (id: number) =>
    request<AtivoDetalhe>(
      async () => {
        const a = (await fetchAtivos()).find((x) => x.id === id);
        if (!a) throw new Error('Ativo não encontrado.');
        return { ...a, especificacoes: [], manutencoes: [], dependencias: [], chamadosVinculados: [] };
      },
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

  addEspecificacao: (id: number, body: Omit<Especificacao, 'id'>) =>
    request<Especificacao>(
      () => Promise.reject(semEndpoint('O cadastro de especificações')),
      () => {
        const e = { id: uid(), ...body };
        find(id).especificacoes.push(e);
        return e;
      },
    ),

  addManutencao: (id: number, body: Omit<Manutencao, 'id'>) =>
    request<Manutencao>(
      () => Promise.reject(semEndpoint('O registro de manutenções')),
      () => {
        const m = { id: uid(), ...body };
        find(id).manutencoes.unshift(m);
        return m;
      },
    ),
};
