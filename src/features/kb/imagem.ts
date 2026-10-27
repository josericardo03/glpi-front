/** Caminho gravado no texto do artigo. A tag img não envia o token; a leitura baixa este endereço com Authorization. */
export function caminhoImagem(artigoId: number, imagemId: number) {
  return `/api/artigos-kb/${artigoId}/anexos/${imagemId}`;
}

/** A imagem já está no corpo do artigo, então a lista de baixo não a repete. */
export function imagemNoTexto(markdown: string, anexoId: number) {
  return new RegExp(`/(?:imagens|anexos)/${anexoId}(?!\\d)`).test(markdown);
}

export function refImagem(href: string): { artigoId: number; anexoId: number; rota: 'imagens' | 'anexos' } | null {
  const m = href.match(/\/api\/(?:artigos-kb|kb\/artigos)\/(\d+)\/(imagens|anexos)\/(\d+)/);
  if (!m) return null;
  return { artigoId: Number(m[1]), anexoId: Number(m[3]), rota: m[2] === 'anexos' ? 'anexos' : 'imagens' };
}

export const IMAGEM_MAX_BYTES = 20 * 1024 * 1024;

const TIPOS = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

export function imagemAceita(file: File) {
  if (TIPOS.has(file.type)) return true;
  return /\.(png|jpe?g|gif|webp)$/i.test(file.name);
}

export function pdfAceito(file: File) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export function anexoAceito(file: File) {
  return imagemAceita(file) || pdfAceito(file);
}

export function altDeArquivo(nome: string) {
  const limpo = nome.replace(/\.[^.]+$/, '').replace(/[[\]\n\r]/g, '').trim();
  return limpo || 'imagem';
}
