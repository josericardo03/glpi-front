import { memo } from 'react';
import { cn } from '@/lib/utils';

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(text: string) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/(?![/\\]))[^)\s]+)\)/g, (_, label: string, href: string) => {
      const externo = href.startsWith('http');
      return `<a href="${href}" class="text-brand-primary underline"${externo ? ' target="_blank" rel="noopener noreferrer nofollow"' : ''}>${label}</a>`;
    });
}

/**
 * Renderizador Markdown mínimo (títulos, listas, citações, ênfase, código e links).
 * Todo o texto é escapado antes da transformação, evitando injeção de HTML.
 */
function toHtml(md: string) {
  return md
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => {
      const b = block.trim();
      if (b.startsWith('### ')) return `<h3>${inline(b.slice(4))}</h3>`;
      if (b.startsWith('## ')) return `<h2>${inline(b.slice(3))}</h2>`;
      if (b.startsWith('> ')) return `<blockquote>${inline(b.replace(/^> ?/gm, ''))}</blockquote>`;
      const lines = b.split('\n');
      if (lines.every((l) => /^[-*] /.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
      if (lines.every((l) => /^\d+\. /.test(l))) return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`;
      return `<p>${inline(b).replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');
}

export const Markdown = memo(function Markdown({ content, className }: { content: string; className?: string }) {
  return <div className={cn('prose-kb', className)} dangerouslySetInnerHTML={{ __html: toHtml(content) }} />;
});
