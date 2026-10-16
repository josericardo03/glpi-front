/** Caminho gravado no texto do artigo. A tag img não envia o token; a leitura baixa este endereço com Authorization. */
export function caminhoImagem(artigoId: number, imagemId: number) {
  return `/api/artigos-kb/${artigoId}/imagens/${imagemId}`;
}

export function refImagem(href: string): { artigoId: number; imagemId: number } | null {
  const m = href.match(/\/api\/(?:artigos-kb|kb\/artigos)\/(\d+)\/imagens\/(\d+)/);
  if (!m) return null;
  return { artigoId: Number(m[1]), imagemId: Number(m[2]) };
}

export const IMAGEM_MAX_BYTES = 20 * 1024 * 1024;

const TIPOS = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

export function imagemAceita(file: File) {
  if (TIPOS.has(file.type)) return true;
  return /\.(png|jpe?g|gif|webp)$/i.test(file.name);
}

export function altDeArquivo(nome: string) {
  const limpo = nome.replace(/\.[^.]+$/, '').replace(/[[\]\n\r]/g, '').trim();
  return limpo || 'imagem';
}
