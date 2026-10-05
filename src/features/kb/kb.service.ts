import { isAxiosError } from 'axios';
import { api } from '@/lib/api';
import { byId, currentUserId, lookups } from '@/lib/backend/lookups';
import type { ApiArtigoKb, ApiCategoriaKb, ApiUsuario } from '@/lib/backend/types';
import { data, getAll, matches, request, TETO_PAGINA } from '@/lib/http';
import { queryClient } from '@/lib/query-client';
import * as db from '@/mocks/db';
import type { KbArtigo, KbArtigoInput, KbArtigoResumo, KbCategoria, KbCategoriaInput, StatusArtigoKb } from '@/types';

export interface ArtigosFiltros {
  search?: string;
  categoriaId?: number;
  ordem?: 'populares' | 'recentes';
  limit?: number;
}

/** Lista de gestão dos técnicos: artigos do próprio autor (qualquer status) ou todos de um status. */
export type EscopoGestao = { meus: true } | { status: StatusArtigoKb };

const resumo = ({ conteudoMarkdown: _c, ...a }: KbArtigo): KbArtigoResumo => a;
const ICONES: KbCategoria['icone'][] = ['rede', 'software', 'hardware', 'seguranca', 'rh'];

function textoPlano(md: string) {
  return md.replace(/[#>*_`~\-[\]()!]/g, ' ').replace(/\s+/g, ' ').trim();
}
const resumir = (texto: string) => (texto.length > 180 ? `${texto.slice(0, 177)}...` : texto);
const tempoLeitura = (texto: string) => Math.max(1, Math.round(texto.split(' ').length / 200));

const toCategoria = (c: ApiCategoriaKb, i: number): KbCategoria => ({
  id: c.id,
  nome: c.nome,
  descricao: c.descricao ?? '',
  icone: ICONES[i % ICONES.length]!,
  totalArtigos: c.total_artigos,
});

const categoriasApi = () =>
  queryClient.fetchQuery({
    queryKey: ['kb', 'categorias-raw'],
    queryFn: async () => (await data(api.get<ApiCategoriaKb[]>('/categorias-kb'))).sort((a, b) => a.id - b.id),
    staleTime: 60_000,
  });

function toArtigo(a: ApiArtigoKb, usuarios: Map<number, ApiUsuario>, categorias: Map<number, ApiCategoriaKb>): KbArtigo {
  const texto = textoPlano(a.conteudo);
  const autor = usuarios.get(a.id_autor);
  const meu = a.id_autor === currentUserId();
  return {
    id: a.id,
    titulo: a.titulo,
    resumo: resumir(texto),
    conteudoMarkdown: a.conteudo,
    categoriaId: a.id_categoria,
    categoriaNome: categorias.get(a.id_categoria)?.nome ?? `Categoria ${a.id_categoria}`,
    status: a.status as StatusArtigoKb,
    autorId: a.id_autor,
    autorNome: autor?.nome ?? (meu ? 'Você' : `Usuário #${a.id_autor}`),
    autorCargo: autor?.cargo ?? '',
    visualizacoes: a.visualizacoes,
    votosUteis: a.votos_uteis ?? 0,
    votosNaoUteis: a.votos_nao_uteis ?? 0,
    tempoLeituraMin: tempoLeitura(texto),
    meuVoto: a.meu_voto == null ? null : a.meu_voto ? 'UTIL' : 'NAO_UTIL',
    publicadoEm: a.data_criacao,
    atualizadoEm: a.data_atualizacao,
  };
}

async function contexto() {
  const [usuarios, categorias] = await Promise.all([lookups.usuarios(), categoriasApi()]);
  return { usuarios: byId(usuarios), categorias: byId(categorias) };
}

async function fetchArtigos(params?: Record<string, string>): Promise<KbArtigo[]> {
  const [rows, ctx] = await Promise.all([getAll<ApiArtigoKb>('/artigos-kb', TETO_PAGINA.artigos, params), contexto()]);
  return rows.map((a) => toArtigo(a, ctx.usuarios, ctx.categorias));
}

export function filtrarArtigos(rows: KbArtigo[], f: ArtigosFiltros): KbArtigoResumo[] {
  return rows
    .filter((a) => (matches(a.titulo, f.search) || matches(a.resumo, f.search)) && (!f.categoriaId || a.categoriaId === f.categoriaId))
    .sort((a, b) => (f.ordem === 'recentes' ? b.publicadoEm.localeCompare(a.publicadoEm) : b.visualizacoes - a.visualizacoes))
    .slice(0, f.limit ?? 50)
    .map(resumo);
}

const corpoArtigo = (input: KbArtigoInput) => ({
  id_categoria: input.categoriaId,
  titulo: input.titulo.trim(),
  conteudo: input.conteudo.trim(),
  status: input.status,
});

const acharMock = (id: number) => {
  const a = db.kbArtigos.find((x) => x.id === id);
  if (!a) throw new Error('Artigo não encontrado (HTTP 404).');
  return a;
};

function aplicarMock(a: KbArtigo, input: KbArtigoInput) {
  const categoria = db.kbCategorias.find((c) => c.id === input.categoriaId);
  if (!categoria) throw new Error('Categoria de conhecimento não encontrada (HTTP 404).');
  const texto = textoPlano(input.conteudo);
  Object.assign(a, {
    titulo: input.titulo.trim(),
    conteudoMarkdown: input.conteudo.trim(),
    resumo: resumir(texto),
    tempoLeituraMin: tempoLeitura(texto),
    categoriaId: categoria.id,
    categoriaNome: categoria.nome,
    status: input.status,
    atualizadoEm: new Date().toISOString(),
  });
}

export const kbService = {
  /** Artigos publicados; filtros, ordenação e destaques são derivados na interface. */
  artigos: () => request<KbArtigo[]>(() => fetchArtigos(), () => db.kbArtigos.filter((a) => a.status === 'PUBLICADO').map((a) => ({ ...a }))),

  /** Somente TECNICO ou acima: a API ignora `meus`/`status` para o solicitante. */
  gestao: (escopo: EscopoGestao) =>
    request<KbArtigo[]>(
      () => fetchArtigos('meus' in escopo ? { meus: 'true' } : { status: escopo.status }),
      () => db.kbArtigos.filter((a) => ('meus' in escopo ? a.autorId === currentUserId() || a.autorNome === 'Você' : a.status === escopo.status)).map((a) => ({ ...a })),
    ),

  artigo: (id: number) =>
    request<KbArtigo>(
      async () => {
        const [row, ctx] = await Promise.all([data(api.get<ApiArtigoKb>(`/artigos-kb/${id}`)), contexto()]);
        return toArtigo(row, ctx.usuarios, ctx.categorias);
      },
      () => ({ ...acharMock(id) }),
    ),

  categorias: () =>
    request<KbCategoria[]>(
      async () => (await categoriasApi()).map(toCategoria),
      () =>
        db.kbCategorias.map((c) => ({ ...c, totalArtigos: db.kbArtigos.filter((a) => a.categoriaId === c.id && a.status === 'PUBLICADO').length })),
    ),

  criarCategoria: (input: KbCategoriaInput) =>
    request<KbCategoria>(
      async () => {
        const row = await data(
          api.post<{ id: number; nome: string; descricao: string | null }>('/categorias-kb', {
            nome: input.nome.trim(),
            ...(input.descricao?.trim() && { descricao: input.descricao.trim() }),
          }),
        );
        return { id: row.id, nome: row.nome, descricao: row.descricao ?? '', icone: 'software', totalArtigos: 0 };
      },
      () => {
        const nome = input.nome.trim();
        if (db.kbCategorias.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) throw new Error('Categoria de conhecimento já existe (HTTP 409).');
        const c: KbCategoria = {
          id: Math.max(0, ...db.kbCategorias.map((x) => x.id)) + 1,
          nome,
          descricao: input.descricao?.trim() ?? '',
          icone: ICONES[db.kbCategorias.length % ICONES.length]!,
          totalArtigos: 0,
        };
        db.kbCategorias.push(c);
        return c;
      },
    ),

  criarArtigo: (input: KbArtigoInput) =>
    request<{ id: number; publicado: boolean }>(
      async () => {
        const row = await data(api.post<{ id: number; status: string }>('/artigos-kb', corpoArtigo(input)));
        return { id: row.id, publicado: row.status === 'PUBLICADO' };
      },
      () => {
        const agora = new Date().toISOString();
        const a: KbArtigo = {
          id: Math.max(0, ...db.kbArtigos.map((x) => x.id)) + 1,
          titulo: '',
          resumo: '',
          conteudoMarkdown: '',
          categoriaId: input.categoriaId,
          categoriaNome: '',
          status: input.status,
          autorId: currentUserId() ?? 0,
          autorNome: 'Você',
          autorCargo: '',
          visualizacoes: 0,
          votosUteis: 0,
          votosNaoUteis: 0,
          tempoLeituraMin: 1,
          meuVoto: null,
          publicadoEm: agora,
          atualizadoEm: agora,
        };
        aplicarMock(a, input);
        db.kbArtigos.unshift(a);
        return { id: a.id, publicado: a.status === 'PUBLICADO' };
      },
    ),

  atualizarArtigo: (id: number, input: KbArtigoInput) =>
    request<{ id: number; publicado: boolean }>(
      async () => {
        const row = await data(api.patch<{ id: number; status: string }>(`/artigos-kb/${id}`, corpoArtigo(input)));
        return { id, publicado: (row?.status ?? input.status) === 'PUBLICADO' };
      },
      () => {
        aplicarMock(acharMock(id), input);
        return { id, publicado: input.status === 'PUBLICADO' };
      },
    ),

  visualizar: (id: number) =>
    request<void>(
      async () => {
        await api.post(`/kb/artigos/${id}/visualizar`);
      },
      () => {
        const a = db.kbArtigos.find((x) => x.id === id);
        if (a) a.visualizacoes++;
      },
    ),

  /** Retorna `false` quando o usuário já havia votado (HTTP 409). */
  feedback: (id: number, util: boolean) =>
    request<boolean>(
      async () => {
        try {
          await api.post(`/artigos-kb/${id}/feedback`, { util });
          return true;
        } catch (err) {
          if (isAxiosError(err) && err.response?.status === 409) return false;
          throw err;
        }
      },
      () => {
        const a = acharMock(id);
        if (a.meuVoto) return false;
        a.meuVoto = util ? 'UTIL' : 'NAO_UTIL';
        if (util) a.votosUteis++;
        else a.votosNaoUteis++;
        return true;
      },
    ),
};
