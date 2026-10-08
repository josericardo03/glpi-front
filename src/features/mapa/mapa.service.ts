import { api, getErrorMessage, httpStatus } from '@/lib/api';
import type { ApiAtivo } from '@/lib/backend/types';
import { data, getAll, request } from '@/lib/http';
import * as db from '@/mocks/db';
import type { AtivoDetalhe } from '@/types';

export interface Software {
  id: number;
  nome: string;
  codigo: string;
}

export interface Ponta {
  id: number;
  nome: string;
  tipo: string;
}

export interface Ligacao {
  idOrigem: number;
  idDestino: number;
  criadaEm: string;
  origem: Ponta;
  destino: Ponta;
}

export interface Afetado extends Ponta {
  nivel: number;
}

export interface Impacto {
  ativo: Ponta;
  afetados: Afetado[];
}

interface ApiPonta {
  id: number;
  nome: string;
  tipo_ativo: string;
}

interface ApiLigacao {
  id_ativo_origem: number;
  id_ativo_destino: number;
  tipo_relacionamento: string;
  data_criacao: string;
  origem: ApiPonta;
  destino: ApiPonta;
}

interface ApiImpacto {
  ativo: ApiPonta;
  afetados: (ApiPonta & { nivel: number })[];
}

const ponta = (a: ApiPonta): Ponta => ({ id: a.id, nome: a.nome, tipo: a.tipo_ativo });

const ligacao = (r: ApiLigacao): Ligacao => ({
  idOrigem: r.id_ativo_origem,
  idDestino: r.id_ativo_destino,
  criadaEm: r.data_criacao,
  origem: ponta(r.origem),
  destino: ponta(r.destino),
});

function falhar(err: unknown, porStatus: Record<number, string>): never {
  const status = httpStatus(err);
  if (status && porStatus[status]) throw new Error(porStatus[status]);
  throw new Error(getErrorMessage(err));
}

/** Ligações só existem no modo mock; somem ao recarregar a página. */
const ligacoesMock: Ligacao[] = [];

function softwareMock(): Software[] {
  return db.ativos.filter((a) => a.tipo === 'LICENCA').map((a) => ({ id: a.id, nome: a.nome, codigo: a.codigo }));
}

export const mapaService = {
  softwares: () =>
    request<Software[]>(
      async () => {
        const rows = await getAll<ApiAtivo>('/ativos', 100);
        return rows
          .filter((a) => a.tipo_ativo === 'LICENCA_SOFTWARE')
          .map((a) => ({ id: a.id, nome: a.nome, codigo: a.codigo_patrimonio }))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      },
      () => softwareMock().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    ),

  cadastrar: (input: { nome: string; codigo: string }) =>
    request<Software>(
      async () => {
        try {
          const row = await data<ApiAtivo>(
            api.post('/ativos', {
              nome: input.nome.trim(),
              codigo_patrimonio: input.codigo.trim(),
              tipo_ativo: 'LICENCA_SOFTWARE',
            }),
          );
          return { id: row.id, nome: row.nome, codigo: row.codigo_patrimonio };
        } catch (err) {
          falhar(err, { 409: 'Esse código de patrimônio já está cadastrado.' });
        }
      },
      () => {
        const codigo = input.codigo.trim();
        if (db.ativos.some((a) => a.codigo.toUpperCase() === codigo.toUpperCase())) {
          throw new Error('Esse código de patrimônio já está cadastrado.');
        }
        const criado: AtivoDetalhe = {
          id: Math.max(0, ...db.ativos.map((a) => a.id)) + 1,
          codigo,
          nome: input.nome.trim(),
          tipo: 'LICENCA',
          numeroSerie: null,
          responsavelId: null,
          responsavelNome: null,
          status: 'EM_USO',
          localizacao: null,
          fabricante: null,
          modelo: null,
          dataAquisicao: null,
          garantiaAte: null,
          saude: null,
          especificacoes: [],
          manutencoes: [],
          dependencias: [],
          chamadosVinculados: [],
        };
        db.ativos.push(criado);
        return { id: criado.id, nome: criado.nome, codigo: criado.codigo };
      },
    ),

  ligacoes: () =>
    request<Ligacao[]>(
      async () => (await getAll<ApiLigacao>('/ativos/relacionamentos', 100)).map(ligacao),
      () => ligacoesMock.map((l) => ({ ...l })),
    ),

  ligar: (idOrigem: number, idDestino: number) =>
    request<Ligacao>(
      async () => {
        try {
          return ligacao(
            await data<ApiLigacao>(
              api.post('/ativos/relacionamentos', {
                id_ativo_origem: idOrigem,
                id_ativo_destino: idDestino,
                tipo_relacionamento: 'DEPENDE_DE',
              }),
            ),
          );
        } catch (err) {
          falhar(err, {
            400: 'Um software não pode depender dele mesmo.',
            404: 'Um dos softwares não existe mais.',
            409: 'Essa dependência já está cadastrada.',
          });
        }
      },
      () => {
        if (idOrigem === idDestino) throw new Error('Um software não pode depender dele mesmo.');
        const todos = softwareMock();
        const origem = todos.find((s) => s.id === idOrigem);
        const destino = todos.find((s) => s.id === idDestino);
        if (!origem || !destino) throw new Error('Um dos softwares não existe mais.');
        if (ligacoesMock.some((l) => l.idOrigem === idOrigem && l.idDestino === idDestino)) {
          throw new Error('Essa dependência já está cadastrada.');
        }
        const nova: Ligacao = {
          idOrigem,
          idDestino,
          criadaEm: new Date().toISOString(),
          origem: { id: origem.id, nome: origem.nome, tipo: 'LICENCA_SOFTWARE' },
          destino: { id: destino.id, nome: destino.nome, tipo: 'LICENCA_SOFTWARE' },
        };
        ligacoesMock.unshift(nova);
        return nova;
      },
    ),

  desligar: (idOrigem: number, idDestino: number) =>
    request<{ removido: boolean }>(
      async () => {
        try {
          return await data<{ removido: boolean }>(api.delete(`/ativos/relacionamentos/${idOrigem}/${idDestino}`));
        } catch (err) {
          falhar(err, { 404: 'Essa dependência não existe mais.' });
        }
      },
      () => {
        const i = ligacoesMock.findIndex((l) => l.idOrigem === idOrigem && l.idDestino === idDestino);
        if (i < 0) throw new Error('Essa dependência não existe mais.');
        ligacoesMock.splice(i, 1);
        return { removido: true };
      },
    ),

  impacto: (id: number) =>
    request<Impacto>(
      async () => {
        try {
          const r = await data<ApiImpacto>(api.get(`/ativos/${id}/impacto`));
          return { ativo: ponta(r.ativo), afetados: r.afetados.map((a) => ({ ...ponta(a), nivel: a.nivel })) };
        } catch (err) {
          falhar(err, { 404: 'Esse software não existe mais.' });
        }
      },
      () => {
        const ativo = softwareMock().find((s) => s.id === id);
        if (!ativo) throw new Error('Esse software não existe mais.');
        const afetados: Afetado[] = [];
        const vistos = new Set<number>([id]);
        let fronteira = [id];
        for (let nivel = 1; fronteira.length && nivel <= 20; nivel++) {
          const proxima: number[] = [];
          for (const destino of fronteira) {
            for (const l of ligacoesMock) {
              if (l.idDestino !== destino || vistos.has(l.idOrigem)) continue;
              vistos.add(l.idOrigem);
              proxima.push(l.idOrigem);
              afetados.push({ id: l.origem.id, nome: l.origem.nome, tipo: l.origem.tipo, nivel });
            }
          }
          fronteira = proxima;
        }
        return { ativo: { id: ativo.id, nome: ativo.nome, tipo: 'LICENCA_SOFTWARE' }, afetados };
      },
    ),
};
