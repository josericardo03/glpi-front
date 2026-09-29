import { api } from '@/lib/api';
import { byId, lookups } from '@/lib/backend/lookups';
import type { ApiArtigoKb } from '@/lib/backend/types';
import { data, matches, request } from '@/lib/http';
import * as db from '@/mocks/db';
import type { KbArtigo, KbArtigoResumo, KbCategoria } from '@/types';

export interface ArtigosFiltros {
  search?: string;
  categoriaId?: number;
  ordem?: 'populares' | 'recentes';
  limit?: number;
}

type Voto = NonNullable<KbArtigo['meuVoto']>;

const resumo = ({ conteudoMarkdown, ...a }: KbArtigo): KbArtigoResumo => a;
const ICONES: KbCategoria['icone'][] = ['rede', 'software', 'hardware', 'seguranca', 'rh'];
const categoriaNome = (id: number) => `Categoria #${id}`;

/** A API não expõe os votos do usuário; o voto dado nesta máquina é lembrado localmente. */
const VOTOS_KEY = 'itsm_kb_votos';
const lerVotos = (): Record<number, Voto> => JSON.parse(localStorage.getItem(VOTOS_KEY) ?? '{}');
const salvarVoto = (id: number, voto: Voto) => localStorage.setItem(VOTOS_KEY, JSON.stringify({ ...lerVotos(), [id]: voto }));

function textoPlano(md: string) {
  return md.replace(/[#>*_`~\-[\]()!]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchArtigos(): Promise<KbArtigo[]> {
  const [rows, usuarios] = await Promise.all([data(api.get<ApiArtigoKb[]>('/artigos-kb')), lookups.usuarios()]);
  const us = byId(usuarios);
  const votos = lerVotos();
  return rows.map((a) => {
    const texto = textoPlano(a.conteudo);
    const autor = us.get(a.id_autor);
    return {
      id: a.id,
      titulo: a.titulo,
      resumo: texto.length > 180 ? `${texto.slice(0, 177)}...` : texto,
      conteudoMarkdown: a.conteudo,
      categoriaId: a.id_categoria,
      categoriaNome: categoriaNome(a.id_categoria),
      autorNome: autor?.nome ?? `Usuário #${a.id_autor}`,
      autorCargo: autor?.cargo ?? '',
      visualizacoes: a.visualizacoes,
      votosUteis: 0,
      votosNaoUteis: 0,
      tempoLeituraMin: Math.max(1, Math.round(texto.split(' ').length / 200)),
      meuVoto: votos[a.id] ?? null,
      publicadoEm: a.data_criacao,
      atualizadoEm: a.data_atualizacao,
    };
  });
}

function filtrar(rows: KbArtigo[], f: ArtigosFiltros) {
  return rows
    .filter((a) => (matches(a.titulo, f.search) || matches(a.resumo, f.search)) && (!f.categoriaId || a.categoriaId === f.categoriaId))
    .sort((a, b) => (f.ordem === 'recentes' ? b.publicadoEm.localeCompare(a.publicadoEm) : b.visualizacoes - a.visualizacoes))
    .slice(0, f.limit ?? 50)
    .map(resumo);
}

export const kbService = {
  /** Sem GET de categorias na API: são derivadas dos artigos publicados. */
  categorias: () =>
    request<KbCategoria[]>(
      async () => {
        const contagem = new Map<number, number>();
        (await fetchArtigos()).forEach((a) => contagem.set(a.categoriaId, (contagem.get(a.categoriaId) ?? 0) + 1));
        return [...contagem].map(([id, totalArtigos], i) => ({ id, nome: categoriaNome(id), descricao: '', icone: ICONES[i % ICONES.length]!, totalArtigos }));
      },
      () => db.kbCategorias,
    ),

  artigos: (f: ArtigosFiltros) => request<KbArtigoResumo[]>(async () => filtrar(await fetchArtigos(), f), () => filtrar(db.kbArtigos, f)),

  artigo: (id: number) =>
    request<KbArtigo>(
      async () => {
        const [artigos] = await Promise.all([fetchArtigos(), api.post(`/kb/artigos/${id}/visualizar`).catch(() => null)]);
        const a = artigos.find((x) => x.id === id);
        if (!a) throw new Error('Artigo não encontrado.');
        return a;
      },
      () => {
        const a = db.kbArtigos.find((x) => x.id === id);
        if (!a) throw new Error('Artigo não encontrado (HTTP 404).');
        a.visualizacoes++;
        return a;
      },
    ),

  feedback: (id: number, util: boolean) =>
    request<void>(
      async () => {
        await api.post(`/kb/artigos/${id}/feedback`, { util });
        salvarVoto(id, util ? 'UTIL' : 'NAO_UTIL');
      },
      () => {
        const a = db.kbArtigos.find((x) => x.id === id)!;
        if (a.meuVoto) throw new Error('Você já avaliou este artigo (HTTP 409).');
        a.meuVoto = util ? 'UTIL' : 'NAO_UTIL';
        if (util) a.votosUteis++;
        else a.votosNaoUteis++;
      },
    ),
};
