import { api } from '@/lib/api';
import { matches, paginate, request } from '@/lib/http';
import { uid } from '@/lib/utils';
import * as db from '@/mocks/db';
import type { Ativo, AtivoDetalhe, AtivoFiltros, AtivoInput, AtivosResumo, Especificacao, Manutencao, Paginated, TipoAtivo } from '@/types';

export type AtivosResponse = Paginated<Ativo> & { resumo: AtivosResumo };

const toResumo = ({ especificacoes, manutencoes, dependencias, chamadosVinculados, ...a }: AtivoDetalhe): Ativo => a;
const find = (id: number) => {
  const a = db.ativos.find((x) => x.id === id);
  if (!a) throw new Error('Ativo não encontrado (HTTP 404).');
  return a;
};

const PREFIXO: Record<TipoAtivo, string> = { NOTEBOOK: 'ASSET', DESKTOP: 'DSK', SERVIDOR: 'SRV', LICENCA: 'SW', REDE: 'NET' };

export const ativosService = {
  list: (f: AtivoFiltros) =>
    request<AtivosResponse>(
      () => api.get('/ativos', { params: f }),
      () => {
        const porTipo = { NOTEBOOK: 0, SERVIDOR: 0, LICENCA: 0, REDE: 0, DESKTOP: 0 } as Record<TipoAtivo, number>;
        db.ativos.forEach((a) => porTipo[a.tipo]++);
        const rows = db.ativos
          .filter(
            (a) =>
              (matches(a.nome, f.search) || matches(a.codigo, f.search) || matches(a.numeroSerie, f.search)) &&
              (!f.tipo || a.tipo === f.tipo) &&
              (!f.status || a.status === f.status),
          )
          .map(toResumo);
        const ativosEmUso = db.ativos.filter((a) => a.status !== 'DESCARTADO');
        return {
          ...paginate(rows, f.page, f.pageSize),
          resumo: {
            total: db.ativos.length,
            porTipo,
            saudeFrota: ativosEmUso.reduce((s, a) => s + a.saude, 0) / (ativosEmUso.length || 1),
            licencasExpirando: 12,
          },
        };
      },
    ),

  get: (id: number) => request<AtivoDetalhe>(() => api.get(`/ativos/${id}`), () => find(id)),

  create: (input: AtivoInput) =>
    request<Ativo>(
      () => api.post('/ativos', input),
      () => {
        if (db.ativos.some((a) => a.numeroSerie === input.numeroSerie)) throw new Error('Número de série já cadastrado (HTTP 409).');
        const id = Math.max(...db.ativos.map((a) => a.id)) + 1;
        const a: AtivoDetalhe = {
          ...input,
          id,
          codigo: `${PREFIXO[input.tipo]}-${String(1000 + id)}`,
          dataAquisicao: new Date().toISOString(),
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
      () => api.post(`/ativos/${id}/especificacoes`, body),
      () => {
        const e = { id: uid(), ...body };
        find(id).especificacoes.push(e);
        return e;
      },
    ),

  addManutencao: (id: number, body: Omit<Manutencao, 'id'>) =>
    request<Manutencao>(
      () => api.post(`/ativos/${id}/manutencoes`, body),
      () => {
        const m = { id: uid(), ...body };
        find(id).manutencoes.unshift(m);
        return m;
      },
    ),
};
