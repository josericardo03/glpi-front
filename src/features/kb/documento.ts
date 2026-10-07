/** Converte o HTML do editor visual para o Markdown que a API guarda e a leitura exibe. */

function texto(s: string) {
  return s.replace(/\u00a0/g, ' ').replace(/[\\*`+[\]]/g, (c) => `\\${c}`);
}

function envolver(marca: string, s: string) {
  const miolo = s.trim();
  if (!miolo) return '';
  const inicio = s.match(/^\s*/)?.[0] ?? '';
  const fim = s.match(/\s*$/)?.[0] ?? '';
  return `${inicio}${marca}${miolo}${marca}${fim}`;
}

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
      return rotulo && /^(https?:\/\/|\/(?![/\\]))/.test(href) ? `[${rotulo}](${href})` : rotulo;
    }
    default:
      return miolo();
  }
}

function bloco(el: HTMLElement): string {
  const tag = el.tagName;
  if (tag === 'UL' || tag === 'OL') {
    const itens = [...el.children].filter((c) => c.tagName === 'LI');
    return itens
      .map((li, i) => `${tag === 'OL' ? `${i + 1}. ` : '- '}${inline(li).replace(/\s+/g, ' ').trim()}`)
      .filter((l) => !/^(?:-|\d+\.)\s*$/.test(l))
      .join('\n');
  }
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
  return inline(el).replace(/[ \t]+\n/g, '\n').trim();
}

export function htmlParaMarkdown(root: HTMLElement): string {
  const blocos: string[] = [];
  root.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = texto(n.textContent ?? '').trim();
      if (t) blocos.push(t);
      return;
    }
    if (n instanceof HTMLElement) {
      const t = bloco(n);
      if (t) blocos.push(t);
    }
  });
  return blocos.join('\n\n');
}

export function contarPalavras(markdown: string) {
  const textoLimpo = markdown
    .replace(/\\([\\*`+[\]])/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*+`[\]]/g, ' ');
  return textoLimpo.trim() ? textoLimpo.trim().split(/\s+/).length : 0;
}

/** Endereço aceito no link: site externo ou caminho interno do sistema. */
export function urlDeLink(valor: string) {
  const t = valor.trim();
  return /^https?:\/\/\S+$/.test(t) || /^\/(?![/\\])\S*$/.test(t) ? t : null;
}
