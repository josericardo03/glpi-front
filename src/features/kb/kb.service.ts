import { api } from '@/lib/api';
import { matches, request } from '@/lib/http';
import * as db from '@/mocks/db';
import type { KbArtigo, KbArtigoResumo, KbCategoria } from '@/types';

export interface ArtigosFiltros {
  search?: string;
  categoriaId?: number;
  ordem?: 'populares' | 'recentes';
  limit?: number;
}

const resumo = ({ conteudoMarkdown, ...a }: KbArtigo): KbArtigoResumo => a;

export const kbService = {
  categorias: () => request<KbCategoria[]>(() => api.get('/kb/categorias'), () => db.kbCategorias),

  artigos: (f: ArtigosFiltros) =>
    request<KbArtigoResumo[]>(
      () => api.get('/kb/artigos', { params: f }),
      () =>
        db.kbArtigos
          .filter((a) => (matches(a.titulo, f.search) || matches(a.resumo, f.search)) && (!f.categoriaId || a.categoriaId === f.categoriaId))
          .sort((a, b) => (f.ordem === 'recentes' ? b.publicadoEm.localeCompare(a.publicadoEm) : b.visualizacoes - a.visualizacoes))
          .slice(0, f.limit ?? 50)
          .map(resumo),
    ),

  artigo: (id: number) =>
    request<KbArtigo>(
      () => api.get(`/kb/artigos/${id}`),
      () => {
        const a = db.kbArtigos.find((x) => x.id === id);
        if (!a) throw new Error('Artigo não encontrado (HTTP 404).');
        a.visualizacoes++;
        return a;
      },
    ),

  feedback: (id: number, util: boolean) =>
    request<KbArtigo>(
      () => api.post(`/kb/artigos/${id}/feedback`, { util }),
      () => {
        const a = db.kbArtigos.find((x) => x.id === id)!;
        if (a.meuVoto) throw new Error('Você já avaliou este artigo (HTTP 409).');
        a.meuVoto = util ? 'UTIL' : 'NAO_UTIL';
        if (util) a.votosUteis++;
        else a.votosNaoUteis++;
        return a;
      },
    ),
};
