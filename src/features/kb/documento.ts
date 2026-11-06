/** Converte o HTML do editor visual para o Markdown que a API guarda e a leitura exibe. */

import { refImagem } from './imagem';

function markdownDaImagem(node: HTMLElement) {
  const href = node.dataset.api ?? '';
  if (!refImagem(href)) return '';
  const alt = (node.getAttribute('alt') ?? 'imagem').replace(/[[\]\n\r]/g, '').trim() || 'imagem';
  return `![${alt}](${href})`;
}

function texto(s: string) {
  return s.replace(/ /g, ' ').replace(/[\\*`+[\]]/g, (c) => `\\${c}`);
}

/**
 * Um texto comum que comece como sintaxe de Markdown ("- item", "> frase", "## x", "1. a") viraria
 * lista, citação ou título ao reabrir o artigo. O primeiro caractere de marcação é escapado.
 */
export function protegerInicioDeLinha(linha: string) {
  return linha.replace(/^(\s*)(#{1,3}(?= )|>(?= )|-(?= )|(\d+)\.(?= ))/, (_m, espaco: string, marca: string, numero?: string) =>
    numero ? `${espaco}${numero}\\.` : `${espaco}\\${marca}`,
  );
}

const protegerBloco = (s: string) => s.split('\n').map(protegerInicioDeLinha).join('\n');

function envolver(marca: string, s: string) {
  const miolo = s.trim();
  if (!miolo) return '';
  const inicio = s.match(/^\s*/)?.[0] ?? '';
  const fim = s.match(/\s*$/)?.[0] ?? '';
  return `${inicio}${marca}${miolo}${marca}${fim}`;
}

/** Parênteses no endereço fechariam o link `[rótulo](url)` antes da hora; vão codificados. */
const codificarEndereco = (href: string) => href.replace(/\(/g, '%28').replace(/\)/g, '%29');

/** Endereços que viram link: site (http/https), e-mail ou caminho interno. */
const ENDERECO_VALIDO = /^(https?:\/\/|mailto:|\/(?![/\\]))/;

function inline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return texto(node.textContent ?? '');
  if (!(node instanceof HTMLElement)) return '';
  if (node.tagName === 'BR') return '\n';
  const miolo = () => [...node.childNodes].map(inline).join('');
  switch (node.tagName) {
    case 'STRONG':
    case 'B':
      return envolver('**', miolo());
    case 'EM':
    case 'I':
      return envolver('*', miolo());
    case 'U':
      return envolver('++', miolo());
    case 'CODE':
      return miolo().trim() ? `\`${miolo().trim()}\`` : '';
    case 'A': {
      const href = node.getAttribute('href') ?? '';
      const rotulo = miolo().trim();
      return rotulo && ENDERECO_VALIDO.test(href) ? `[${rotulo}](${codificarEndereco(href)})` : rotulo;
    }
    case 'IMG':
      return markdownDaImagem(node);
    default:
      return miolo();
  }
}

const ehLista = (el: Element) => el.tagName === 'UL' || el.tagName === 'OL';

/** Itens em linhas `- a` / `1. a`, com dois espaços de recuo por nível de aninhamento. */
function linhasDaLista(lista: Element, nivel: number, saida: string[]) {
  const ordenada = lista.tagName === 'OL';
  let numero = 0;
  for (const filho of lista.children) {
    if (ehLista(filho)) {
      linhasDaLista(filho, nivel + 1, saida);
      continue;
    }
    if (filho.tagName !== 'LI') continue;
    numero += 1;
    const textoDoItem = [...filho.childNodes]
      .filter((no) => !(no instanceof HTMLElement && ehLista(no)))
      .map(inline)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (textoDoItem) saida.push(`${'  '.repeat(nivel)}${ordenada ? `${numero}. ` : '- '}${textoDoItem}`);
    for (const sub of filho.children) if (ehLista(sub)) linhasDaLista(sub, nivel + 1, saida);
  }
}

/** Cerca de código com mais crases do que qualquer sequência dentro do próprio código. */
function blocoDeCodigo(codigo: string) {
  const limpo = codigo.replace(/ /g, ' ').replace(/^\n+/, '').replace(/\n+$/, '');
  if (!limpo.trim()) return '';
  const maior = Math.max(2, ...(limpo.match(/`+/g) ?? []).map((s) => s.length));
  const cerca = '`'.repeat(maior + 1);
  return `${cerca}\n${limpo}\n${cerca}`;
}

function bloco(el: HTMLElement): string {
  const tag = el.tagName;
  if (tag === 'UL' || tag === 'OL') {
    const linhas: string[] = [];
    linhasDaLista(el, 0, linhas);
    return linhas.join('\n');
  }
  if (tag === 'PRE') return blocoDeCodigo(el.innerText || el.textContent || '');
  if (tag === 'BLOCKQUOTE') {
    const t = inline(el).trim();
    return t ? t.split('\n').map((l) => `> ${l.trim()}`).join('\n') : '';
  }
  if (tag === 'H1' || tag === 'H2') {
    const t = inline(el).replace(/\s+/g, ' ').trim();
    return t ? `## ${t}` : '';
  }
  if (tag === 'H3' || tag === 'H4') {
    const t = inline(el).replace(/\s+/g, ' ').trim();
    return t ? `### ${t}` : '';
  }
  if (tag === 'IMG') return markdownDaImagem(el);
  return protegerBloco(inline(el).replace(/[ \t]+\n/g, '\n').trim());
}

const ESTRUTURAIS = new Set(['UL', 'OL', 'PRE', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4']);
const temEstrutura = (el: Element) => !!el.querySelector('ul,ol,pre,blockquote,h1,h2,h3,h4');
const ehContainer = (no: Node): no is HTMLElement => no instanceof HTMLElement && (no.tagName === 'P' || no.tagName === 'DIV');

/**
 * Cada filho do editor é um bloco. Os navegadores às vezes põem uma lista ou um código dentro de um
 * `<p>`/`<div>` (o editor abre os artigos em `<p>`); nesse caso o container é aberto e a lista continua lista,
 * em vez de virar texto corrido.
 */
function blocosDe(no: Node, saida: string[]) {
  if (no.nodeType === Node.TEXT_NODE) {
    const t = protegerBloco(texto(no.textContent ?? '').trim());
    if (t) saida.push(t);
    return;
  }
  if (!(no instanceof HTMLElement)) return;
  if (ehContainer(no) && temEstrutura(no)) {
    let corrida: Node[] = [];
    const fechar = () => {
      const t = protegerBloco(corrida.map(inline).join('').replace(/[ \t]+\n/g, '\n').trim());
      if (t) saida.push(t);
      corrida = [];
    };
    no.childNodes.forEach((filho) => {
      if (filho instanceof HTMLElement && (ESTRUTURAIS.has(filho.tagName) || (ehContainer(filho) && temEstrutura(filho)))) {
        fechar();
        blocosDe(filho, saida);
      } else corrida.push(filho);
    });
    fechar();
    return;
  }
  const t = bloco(no);
  if (t) saida.push(t);
}

export function htmlParaMarkdown(root: HTMLElement): string {
  const blocos: string[] = [];
  root.childNodes.forEach((n) => blocosDe(n, blocos));
  return blocos.join('\n\n');
}

export function contarPalavras(markdown: string) {
  const textoLimpo = markdown
    .replace(/^(`{3,}).*$/gm, ' ')
    .replace(/\\([\\*`+[\]#>.-])/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*+`[\]]/g, ' ');
  return textoLimpo.trim() ? textoLimpo.trim().split(/\s+/).length : 0;
}

/** Endereço aceito no link: site externo, e-mail ou caminho interno do sistema. */
export function urlDeLink(valor: string) {
  const t = valor.trim();
  if (/^https?:\/\/\S+$/.test(t) || /^\/(?![/\\])\S*$/.test(t)) return t;
  if (/^mailto:[^\s@]+@[^\s@]+$/.test(t)) return t;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return `mailto:${t}`;
  return null;
}

/* ---------------------------- Colar conteúdo formatado ---------------------------- */

const TITULO_MAIOR = new Set(['H1', 'H2']);
const TITULO_MENOR = new Set(['H3', 'H4', 'H5', 'H6']);
const BLOCOS_NEUTROS = new Set(['P', 'DIV', 'SECTION', 'ARTICLE', 'TR']);
const SEM_TEXTO_SOLTO = new Set(['UL', 'OL', 'TABLE', 'TBODY', 'THEAD', 'TR', 'BODY', 'HTML']);

/**
 * Reduz o HTML da área de transferência (Word, Docs, páginas web) ao que o editor sabe representar:
 * negrito, itálico, sublinhado, código, links, listas, títulos e citações. Estilos, scripts, classes e
 * atributos são descartados, então nada além dessas marcações chega ao editor.
 */
export function htmlColado(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const saida = document.createElement('div');

  const copiar = (origem: Node, destino: Node, dentroDePre = false) => {
    origem.childNodes.forEach((no) => {
      if (no.nodeType === Node.TEXT_NODE) {
        const bruto = no.textContent ?? '';
        const pai = origem instanceof HTMLElement ? origem.tagName : '';
        if (!dentroDePre && !/\S/.test(bruto) && SEM_TEXTO_SOLTO.has(pai)) return;
        destino.appendChild(document.createTextNode(dentroDePre ? bruto : bruto.replace(/\s+/g, ' ')));
        return;
      }
      if (!(no instanceof HTMLElement)) return;
      const tag = no.tagName;
      if (['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'IMG', 'SVG', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON'].includes(tag)) return;

      const criar = (nome: string) => {
        const el = document.createElement(nome);
        destino.appendChild(el);
        return el;
      };

      if (tag === 'BR') {
        criar('br');
      } else if (tag === 'PRE') {
        criar('pre').textContent = no.innerText || no.textContent || '';
      } else if (tag === 'UL' || tag === 'OL' || tag === 'LI' || tag === 'BLOCKQUOTE') {
        copiar(no, criar(tag.toLowerCase()));
      } else if (TITULO_MAIOR.has(tag)) {
        copiar(no, criar('h2'));
      } else if (TITULO_MENOR.has(tag)) {
        copiar(no, criar('h3'));
      } else if (BLOCOS_NEUTROS.has(tag)) {
        copiar(no, criar('div'));
      } else if (tag === 'A') {
        const href = no.getAttribute('href') ?? '';
        copiar(no, ENDERECO_VALIDO.test(href) ? Object.assign(criar('a'), { href }) : destino);
      } else if (tag === 'TD' || tag === 'TH') {
        copiar(no, destino);
        destino.appendChild(document.createTextNode(' '));
      } else {
        // Marcação de texto: pela tag (b, i, u, code) ou pelo estilo inline (Google Docs usa <span style>).
        const e = no.style;
        const negrito = (tag === 'B' || tag === 'STRONG' ? e.fontWeight !== 'normal' : false) || e.fontWeight === 'bold' || Number(e.fontWeight) >= 600;
        const italico = tag === 'I' || tag === 'EM' || e.fontStyle === 'italic';
        const sublinhado = tag === 'U' || e.textDecorationLine.includes('underline') || e.textDecoration.includes('underline');
        const codigo = tag === 'CODE' || tag === 'TT' || tag === 'KBD';
        let alvo: Node = destino;
        for (const [ligado, nome] of [[negrito, 'strong'], [italico, 'em'], [sublinhado, 'u'], [codigo, 'code']] as const) {
          if (!ligado) continue;
          const el = document.createElement(nome);
          alvo.appendChild(el);
          alvo = el;
        }
        copiar(no, alvo, dentroDePre);
      }
    });
  };

  copiar(doc.body, saida);
  return saida.innerHTML;
}
