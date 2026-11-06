import { api, getErrorMessage, httpStatus } from '@/lib/api';
import type { ApiAtivo } from '@/lib/backend/types';
import { data, getAll, request } from '@/lib/http';
import * as db from '@/mocks/db';
import type { AtivoDetalhe } from '@/types';

const LIMITE_BUSCA = 20;

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

export interface Mapa {
  id: number;
  nome: string;
  descricao: string | null;
  criadoEm: string;
  totalLigacoes: number;
}

export interface Ligacao {
  idMapa: number;
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

interface ApiMapa {
  id: number;
  nome: string;
  descricao: string | null;
  data_criacao: string;
  total_ligacoes: number;
}

interface ApiLigacao {
  id_mapa: number;
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

const mapa = (m: ApiMapa): Mapa => ({
  id: m.id,
  nome: m.nome,
  descricao: m.descricao,
  criadoEm: m.data_criacao,
  totalLigacoes: m.total_ligacoes,
});

const ligacao = (r: ApiLigacao): Ligacao => ({
  idMapa: r.id_mapa,
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

/** Mapas e ligações só existem no modo mock; somem ao recarregar a página. */
const mapasMock: Omit<Mapa, 'totalLigacoes'>[] = [
  { id: 1, nome: 'Principal', descricao: 'Mapa padrão das dependências.', criadoEm: new Date().toISOString() },
];
const ligacoesMock: Ligacao[] = [];

function mapaMockOuErro(id: number) {
  const m = mapasMock.find((x) => x.id === id);
  if (!m) throw new Error('Mapa não encontrado.');
  return m;
}

function nomeMapaLivre(nome: string, ignorarId?: number) {
  if (mapasMock.some((m) => m.id !== ignorarId && m.nome.toLowerCase() === nome.toLowerCase())) {
    throw new Error('Já existe um mapa com esse nome.');
  }
}

const comTotal = (m: Omit<Mapa, 'totalLigacoes'>): Mapa => ({ ...m, totalLigacoes: ligacoesMock.filter((l) => l.idMapa === m.id).length });

function softwareMock(): Software[] {
  return db.ativos.filter((a) => a.tipo === 'LICENCA').map((a) => ({ id: a.id, nome: a.nome, codigo: a.codigo }));
}

export const mapaService = {
  /** Até 20 softwares que combinam com o texto (nome ou código); a busca roda no servidor. */
  buscarSoftwares: (busca: string) =>
    request<Software[]>(
      async () => {
        const r = await api.get<ApiAtivo[]>('/ativos', {
          params: { tipo_ativo: 'LICENCA_SOFTWARE', busca: busca.trim() || undefined, limite: LIMITE_BUSCA, pagina: 1 },
        });
        return r.data.map((a) => ({ id: a.id, nome: a.nome, codigo: a.codigo_patrimonio }));
      },
      () => {
        const termo = busca.trim().toLowerCase();
        return softwareMock()
          .filter((s) => !termo || s.nome.toLowerCase().includes(termo) || s.codigo.toLowerCase().includes(termo))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
          .slice(0, LIMITE_BUSCA);
      },
    ),

  atualizarSoftware: (id: number, input: { nome: string; codigo: string }) =>
    request<Software>(
      async () => {
        try {
          const row = await data<ApiAtivo>(
            api.patch(`/ativos/${id}`, { nome: input.nome.trim(), codigo_patrimonio: input.codigo.trim() }),
          );
          return { id: row.id, nome: row.nome, codigo: row.codigo_patrimonio };
        } catch (err) {
          falhar(err, { 404: 'Esse software não existe mais.', 409: 'Esse código de patrimônio já está cadastrado.' });
        }
      },
      () => {
        const alvo = db.ativos.find((a) => a.id === id && a.tipo === 'LICENCA');
        if (!alvo) throw new Error('Esse software não existe mais.');
        const codigo = input.codigo.trim();
        if (db.ativos.some((a) => a.id !== id && a.codigo.toUpperCase() === codigo.toUpperCase())) {
          throw new Error('Esse código de patrimônio já está cadastrado.');
        }
        alvo.nome = input.nome.trim();
        alvo.codigo = codigo;
        for (const l of ligacoesMock) {
          if (l.origem.id === id) l.origem.nome = alvo.nome;
          if (l.destino.id === id) l.destino.nome = alvo.nome;
        }
        return { id, nome: alvo.nome, codigo };
      },
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

  mapas: () =>
    request<Mapa[]>(
      async () => (await data<ApiMapa[]>(api.get('/mapas-software'))).map(mapa),
      () => mapasMock.map(comTotal).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    ),

  criarMapa: (input: { nome: string; descricao: string }) =>
    request<Mapa>(
      async () => {
        try {
          return mapa(await data<ApiMapa>(api.post('/mapas-software', { nome: input.nome.trim(), descricao: input.descricao.trim() || undefined })));
        } catch (err) {
          falhar(err, { 409: 'Já existe um mapa com esse nome.' });
        }
      },
      () => {
        const nome = input.nome.trim();
        nomeMapaLivre(nome);
        const criado = { id: Math.max(0, ...mapasMock.map((m) => m.id)) + 1, nome, descricao: input.descricao.trim() || null, criadoEm: new Date().toISOString() };
        mapasMock.push(criado);
        return comTotal(criado);
      },
    ),

  atualizarMapa: (id: number, input: { nome: string; descricao: string }) =>
    request<Mapa>(
      async () => {
        try {
          return mapa(await data<ApiMapa>(api.patch(`/mapas-software/${id}`, { nome: input.nome.trim(), descricao: input.descricao.trim() })));
        } catch (err) {
          falhar(err, { 404: 'Esse mapa não existe mais.', 409: 'Já existe um mapa com esse nome.' });
        }
      },
      () => {
        const atual = mapaMockOuErro(id);
        const nome = input.nome.trim();
        nomeMapaLivre(nome, id);
        atual.nome = nome;
        atual.descricao = input.descricao.trim() || null;
        return comTotal(atual);
      },
    ),

  removerMapa: (id: number, comLigacoes: boolean) =>
    request<{ removido: boolean; ligacoesRemovidas: number }>(
      async () => {
        try {
          const r = await data<{ removido: boolean; ligacoes_removidas: number }>(
            api.delete(`/mapas-software/${id}`, { params: comLigacoes ? { com_ligacoes: true } : undefined }),
          );
          return { removido: r.removido, ligacoesRemovidas: r.ligacoes_removidas };
        } catch (err) {
          falhar(err, { 404: 'Esse mapa não existe mais.' });
        }
      },
      () => {
        mapaMockOuErro(id);
        const dele = ligacoesMock.filter((l) => l.idMapa === id);
        if (dele.length && !comLigacoes) throw new Error(`O mapa ainda tem ${dele.length} dependência(s).`);
        for (const l of dele) ligacoesMock.splice(ligacoesMock.indexOf(l), 1);
        mapasMock.splice(mapasMock.findIndex((m) => m.id === id), 1);
        return { removido: true, ligacoesRemovidas: dele.length };
      },
    ),

  ligacoes: (idMapa: number) =>
    request<Ligacao[]>(
      async () => (await getAll<ApiLigacao>('/ativos/relacionamentos', 100, { id_mapa: idMapa })).map(ligacao),
      () => ligacoesMock.filter((l) => l.idMapa === idMapa).map((l) => ({ ...l })),
    ),

  ligar: (idOrigem: number, idDestino: number, idMapa: number) =>
    request<Ligacao>(
      async () => {
        try {
          return ligacao(
            await data<ApiLigacao>(
              api.post('/ativos/relacionamentos', {
                id_ativo_origem: idOrigem,
                id_ativo_destino: idDestino,
                id_mapa: idMapa,
                tipo_relacionamento: 'DEPENDE_DE',
              }),
            ),
          );
        } catch (err) {
          falhar(err, {
            400: 'Um software não pode depender dele mesmo.',
            404: 'Um dos softwares ou o mapa não existe mais.',
          });
        }
      },
      () => {
        if (idOrigem === idDestino) throw new Error('Um software não pode depender dele mesmo.');
        mapaMockOuErro(idMapa);
        const todos = softwareMock();
        const origem = todos.find((s) => s.id === idOrigem);
        const destino = todos.find((s) => s.id === idDestino);
        if (!origem || !destino) throw new Error('Um dos softwares não existe mais.');
        const repetida = ligacoesMock.find((l) => l.idOrigem === idOrigem && l.idDestino === idDestino);
        if (repetida) {
          throw new Error(
            repetida.idMapa === idMapa ? 'Essa dependência já está cadastrada.' : `Essa dependência já está cadastrada no mapa "${mapaMockOuErro(repetida.idMapa).nome}".`,
          );
        }
        const nova: Ligacao = {
          idMapa,
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

  impacto: (id: number, idMapa: number) =>
    request<Impacto>(
      async () => {
        try {
          const r = await data<ApiImpacto>(api.get(`/ativos/${id}/impacto`, { params: { id_mapa: idMapa } }));
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
              if (l.idMapa !== idMapa || l.idDestino !== destino || vistos.has(l.idOrigem)) continue;
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
