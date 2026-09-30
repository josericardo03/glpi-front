import { isAxiosError } from 'axios';
import { api } from '@/lib/api';
import { byId, currentUserId, lookups } from '@/lib/backend/lookups';
import type { ApiArtigoKb } from '@/lib/backend/types';
import { data, matches, request } from '@/lib/http';
import { queryClient } from '@/lib/query-client';
import * as db from '@/mocks/db';
import type { KbArtigo, KbArtigoResumo, KbCategoria } from '@/types';

export interface ArtigosFiltros {
  search?: string;
  categoriaId?: number;
  ordem?: 'populares' | 'recentes';
  limit?: number;
}

type Voto = NonNullable<KbArtigo['meuVoto']>;

const resumo = ({ conteudoMarkdown: _c, ...a }: KbArtigo): KbArtigoResumo => a;
const ICONES: KbCategoria['icone'][] = ['rede', 'software', 'hardware', 'seguranca', 'rh'];
/** A API não expõe GET de categorias da base de conhecimento. */
const categoriaNome = (id: number) => `Categoria ${id}`;

/** A API não devolve o voto do usuário; o voto é lembrado neste navegador, por usuário. */
const votosKey = () => `itsm_kb_votos_${currentUserId()}`;
function lerVotos(): Record<number, Voto> {
  try {
    return JSON.parse(localStorage.getItem(votosKey()) ?? '{}');
  } catch {
    return {};
  }
}
function salvarVoto(id: number, voto: Voto) {
  try {
    localStorage.setItem(votosKey(), JSON.stringify({ ...lerVotos(), [id]: voto }));
  } catch {
    /* armazenamento indisponível: o voto já foi registrado na API */
  }
}

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

export function filtrarArtigos(rows: KbArtigo[], f: ArtigosFiltros): KbArtigoResumo[] {
  return rows
    .filter((a) => (matches(a.titulo, f.search) || matches(a.resumo, f.search)) && (!f.categoriaId || a.categoriaId === f.categoriaId))
    .sort((a, b) => (f.ordem === 'recentes' ? b.publicadoEm.localeCompare(a.publicadoEm) : b.visualizacoes - a.visualizacoes))
    .slice(0, f.limit ?? 50)
    .map(resumo);
}

/** Derivadas dos artigos publicados (a API não lista categorias da base de conhecimento). */
export function categoriasDosArtigos(rows: KbArtigo[]): KbCategoria[] {
  const contagem = new Map<number, number>();
  rows.forEach((a) => contagem.set(a.categoriaId, (contagem.get(a.categoriaId) ?? 0) + 1));
  return [...contagem]
    .sort(([a], [b]) => a - b)
    .map(([id, totalArtigos], i) => ({ id, nome: categoriaNome(id), descricao: '', icone: ICONES[i % ICONES.length]!, totalArtigos }));
}

/** GET /artigos-kb compartilhado entre a listagem, as categorias e o artigo aberto. */
const artigosApi = () => queryClient.fetchQuery({ queryKey: ['kb', 'raw'], queryFn: fetchArtigos, staleTime: 60_000 });

export const kbService = {
  /** Todos os artigos publicados; filtros, ordenação e categorias são derivados na interface. */
  artigos: () => request<KbArtigo[]>(artigosApi, () => db.kbArtigos.map((a) => ({ ...a }))),

  categorias: () => request<KbCategoria[]>(async () => categoriasDosArtigos(await artigosApi()), () => db.kbCategorias),

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
        const voto: Voto = util ? 'UTIL' : 'NAO_UTIL';
        try {
          await api.post(`/kb/artigos/${id}/feedback`, { util });
          salvarVoto(id, voto);
          return true;
        } catch (err) {
          if (isAxiosError(err) && err.response?.status === 409) {
            salvarVoto(id, voto);
            return false;
          }
          throw err;
        }
      },
      () => {
        const a = db.kbArtigos.find((x) => x.id === id);
        if (!a) throw new Error('Artigo não encontrado (HTTP 404).');
        if (a.meuVoto) return false;
        a.meuVoto = util ? 'UTIL' : 'NAO_UTIL';
        if (util) a.votosUteis++;
        else a.votosNaoUteis++;
        return true;
      },
    ),
};
