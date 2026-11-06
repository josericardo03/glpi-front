import { memo } from 'react';
import { cn } from '@/lib/utils';

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(text: string) {
  // `\*`, `\-`, `\#` etc. são caracteres literais: ficam protegidos até o fim da conversão.
  const protegido = escapeHtml(text).replace(/\\([\\*`+[\]#>.-])/g, (_, c: string) => `\u0000${c}`);
  return protegido
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\((\/api\/(?:artigos-kb|kb\/artigos)\/\d+\/(?:imagens|anexos)\/\d+)\)/g, (_, alt: string, href: string) => `<img alt="${alt}" data-api="${href}" />`)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|\/(?![/\\]))[^)\s]+)\)/g, (_, label: string, href: string) => {
      const externo = href.startsWith('http');
      return `<a href="${href}" class="text-brand-primary underline"${externo ? ' target="_blank" rel="noopener noreferrer nofollow"' : ''}>${label}</a>`;
    })
    .replace(/\+\+([^+]+)\+\+/g, '<u>$1</u>')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\u0000(.)/g, '$1');
}

const ITEM_LISTA = /^(\s*)([-*]|\d+\.) (.*)$/;

interface ItemLista {
  nivel: number;
  ordenada: boolean;
  texto: string;
}

/** Linhas `- a`, `  - b`, `1. c` viram `<ul>/<ol>` aninhadas; cada 2 espaços de recuo é um nível. */
function listaEmHtml(linhas: string[]): string | null {
  const itens: ItemLista[] = [];
  for (const linha of linhas) {
    const m = ITEM_LISTA.exec(linha);
    if (!m) return null;
    itens.push({ nivel: Math.floor(m[1]!.length / 2), ordenada: /\d/.test(m[2]!), texto: m[3]! });
  }
  if (!itens.length) return null;

  let i = 0;
  const nivelDeLista = (nivel: number): string => {
    const tag = itens[i]!.ordenada ? 'ol' : 'ul';
    let html = '';
    while (i < itens.length && itens[i]!.nivel >= nivel) {
      if (itens[i]!.nivel > nivel) {
        // Sublista: entra dentro do último <li> (ou cria um, se o primeiro item já vier recuado).
        const sub = nivelDeLista(itens[i]!.nivel);
        html = html.endsWith('</li>') ? `${html.slice(0, -5)}${sub}</li>` : `${html}<li>${sub}</li>`;
        continue;
      }
      html += `<li>${inline(itens[i]!.texto)}</li>`;
      i += 1;
    }
    return `<${tag}>${html}</${tag}>`;
  };
  return nivelDeLista(itens[0]!.nivel);
}

/**
 * Renderizador Markdown mínimo (títulos, listas aninhadas, citações, blocos de código, ênfase e links).
 * Todo o texto é escapado antes da transformação, evitando injeção de HTML.
 */
function toHtml(md: string) {
  // Blocos de código cercados por ``` saem antes: o conteúdo pode ter linhas em branco e não é interpretado.
  const codigos: string[] = [];
  const semCodigo = md
    .replace(/\r\n/g, '\n')
    .replace(/\u0001/g, '')
    .replace(/(^|\n)(`{3,})[^\n]*\n([\s\S]*?)\n?\2(?=\n|$)/g, (_, inicio: string, _cerca: string, corpo: string) => {
      codigos.push(corpo);
      return `${inicio}\n\u0001${codigos.length - 1}\u0001\n`;
    });

  return semCodigo
    .split(/\n{2,}/)
    .map((block) => {
      const b = block.trim();
      const codigo = /^\u0001(\d+)\u0001$/.exec(b);
      if (codigo) return `<pre><code>${escapeHtml(codigos[Number(codigo[1])] ?? '')}</code></pre>`;
      if (b.startsWith('### ')) return `<h3>${inline(b.slice(4))}</h3>`;
      if (b.startsWith('## ')) return `<h2>${inline(b.slice(3))}</h2>`;
      if (b.startsWith('> ')) return `<blockquote>${inline(b.replace(/^> ?/gm, ''))}</blockquote>`;
      const lista = listaEmHtml(b.split('\n'));
      if (lista) return lista;
      return `<p>${inline(b).replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');
}

/** HTML do mesmo Markdown exibido na leitura; o editor visual usa isso ao abrir um artigo já salvo. */
export function markdownParaHtml(md: string) {
  return md.trim() ? toHtml(md) : '';
}

export const Markdown = memo(function Markdown({ content, className }: { content: string; className?: string }) {
  return <div className={cn('prose-kb', className)} dangerouslySetInnerHTML={{ __html: toHtml(content) }} />;
});
