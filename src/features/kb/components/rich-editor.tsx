'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Code, Link2, List, ListOrdered, MessageSquareWarning, Redo2, Undo2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { markdownParaHtml } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import { htmlParaMarkdown, urlDeLink } from '../documento';

interface Props {
  id?: string;
  inicial: string;
  invalid?: boolean;
  onChange: (markdown: string) => void;
}

type Formato = 'bold' | 'italic' | 'underline' | 'ul' | 'ol' | 'h2' | 'h3' | 'quote';

const VAZIO: Record<Formato, boolean> = { bold: false, italic: false, underline: false, ul: false, ol: false, h2: false, h3: false, quote: false };

export function RichEditor({ id, inicial, invalid, onChange }: Props) {
  const folha = useRef<HTMLDivElement | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const faixa = useRef<Range | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const htmlInicial = useRef(markdownParaHtml(inicial));
  const [ativo, setAtivo] = useState(VAZIO);
  const [linkAberto, setLinkAberto] = useState(false);
  const [url, setUrl] = useState('https://');
  const [erroLink, setErroLink] = useState('');

  const marcarVazio = (el: HTMLElement) => {
    const texto = (el.textContent ?? '').replace(/\u00a0/g, '').trim();
    el.dataset.vazio = texto ? 'false' : 'true';
  };

  /**
   * O React apaga filhos que ele não criou. A mesma folha é recolocada depois de cada render,
   * sem criar outra nem repor a frase de exemplo.
   */
  useLayoutEffect(() => {
    const pai = host.current;
    if (!pai) return;
    let el = folha.current ?? pai.querySelector<HTMLDivElement>(':scope > .editor-folha');
    if (!el) {
      el = document.createElement('div');
      el.contentEditable = 'true';
      el.spellcheck = true;
      el.lang = 'pt-BR';
      if (id) el.id = id;
      el.role = 'textbox';
      el.ariaMultiLine = 'true';
      el.dataset.placeholder = 'Escreva o artigo aqui';
      el.className = 'editor-folha prose-kb';
      el.innerHTML = htmlInicial.current;
      marcarVazio(el);
      el.addEventListener('input', () => {
        marcarVazio(el!);
        onChangeRef.current(htmlParaMarkdown(el!));
      });
      el.addEventListener('paste', (e) => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') ?? '');
        marcarVazio(el!);
        onChangeRef.current(htmlParaMarkdown(el!));
      });
    }
    folha.current = el;
    el.ariaInvalid = invalid ? 'true' : 'false';
    if (el.parentNode !== pai) pai.appendChild(el);
    pai.querySelectorAll(':scope > .editor-folha').forEach((extra) => {
      if (extra !== el) extra.remove();
    });
  });

  function publicar() {
    const el = folha.current;
    if (!el) return;
    marcarVazio(el);
    onChangeRef.current(htmlParaMarkdown(el));
  }

  useEffect(() => {
    const atualizar = () => {
      const el = folha.current;
      const sel = window.getSelection();
      if (!el || !sel?.anchorNode || !el.contains(sel.anchorNode)) return;
      const bloco = String(document.queryCommandValue('formatBlock')).toLowerCase();
      const proximo: Record<Formato, boolean> = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
        h2: bloco === 'h2',
        h3: bloco === 'h3',
        quote: bloco === 'blockquote',
      };
      setAtivo((atual) => ((Object.keys(proximo) as Formato[]).every((k) => atual[k] === proximo[k]) ? atual : proximo));
    };
    document.addEventListener('selectionchange', atualizar);
    return () => document.removeEventListener('selectionchange', atualizar);
  }, []);

  function comando(cmd: string, valor?: string) {
    folha.current?.focus();
    document.execCommand(cmd, false, valor);
    publicar();
  }

  function lista(cmd: 'insertUnorderedList' | 'insertOrderedList') {
    const bloco = String(document.queryCommandValue('formatBlock')).toLowerCase();
    if (bloco === 'h1' || bloco === 'h2' || bloco === 'h3' || bloco === 'blockquote') comando('formatBlock', '<div>');
    comando(cmd);
  }

  function abrirLink() {
    const sel = window.getSelection();
    faixa.current = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    const ancora = sel?.anchorNode?.parentElement?.closest('a');
    setUrl(ancora?.getAttribute('href') ?? 'https://');
    setErroLink('');
    setLinkAberto(true);
  }

  function aplicarLink() {
    const endereco = urlDeLink(url);
    if (!endereco) {
      setErroLink('Informe um site começando com https://');
      return;
    }
    const el = folha.current;
    const range = faixa.current;
    if (!el || !range) return;
    el.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    if (range.collapsed) {
      const a = document.createElement('a');
      a.href = endereco;
      a.textContent = endereco.replace(/^https?:\/\//, '');
      range.insertNode(a);
    } else document.execCommand('createLink', false, endereco);
    setLinkAberto(false);
    publicar();
  }

  function aplicarCodigo() {
    const el = folha.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.isCollapsed || !sel.rangeCount || !el.contains(sel.anchorNode)) return;
    const range = sel.getRangeAt(0);
    const code = document.createElement('code');
    code.appendChild(range.extractContents());
    range.insertNode(code);
    publicar();
  }

  const estilo = ativo.h2 ? '<h2>' : ativo.h3 ? '<h3>' : '<div>';

  return (
    <div className={cn('overflow-hidden rounded-lg border bg-white', invalid ? 'border-status-critica' : 'border-brand-border')}>
      <div className="flex items-center gap-1 overflow-x-auto border-b border-brand-border bg-slate-50 px-2 py-1.5">
        <select
          aria-label="Estilo do parágrafo"
          value={estilo}
          onChange={(e) => comando('formatBlock', e.target.value)}
          className="h-8 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-sm text-brand-darker outline-none focus:border-brand-accent"
        >
          <option value="<div>">Texto</option>
          <option value="<h2>">Título</option>
          <option value="<h3>">Subtítulo</option>
        </select>
        <Divisor />
        <Grupo>
          <Ferramenta rotulo="Negrito" ativo={ativo.bold} onClick={() => comando('bold')}>
            <span className="font-serif text-[15px] font-bold leading-none">B</span>
          </Ferramenta>
          <Ferramenta rotulo="Itálico" ativo={ativo.italic} onClick={() => comando('italic')}>
            <span className="font-serif text-[15px] italic leading-none">I</span>
          </Ferramenta>
          <Ferramenta rotulo="Sublinhado" ativo={ativo.underline} onClick={() => comando('underline')}>
            <span className="font-serif text-[15px] underline leading-none">U</span>
          </Ferramenta>
        </Grupo>
        <Divisor />
        <Grupo>
          <Ferramenta rotulo="Lista" ativo={ativo.ul} onClick={() => lista('insertUnorderedList')}>
            <List className="h-4 w-4" />
          </Ferramenta>
          <Ferramenta rotulo="Lista numerada" ativo={ativo.ol} onClick={() => lista('insertOrderedList')}>
            <ListOrdered className="h-4 w-4" />
          </Ferramenta>
        </Grupo>
        <Divisor />
        <Grupo>
          <Ferramenta rotulo="Destaque" ativo={ativo.quote} onClick={() => comando('formatBlock', ativo.quote ? '<div>' : '<blockquote>')}>
            <MessageSquareWarning className="h-4 w-4" />
          </Ferramenta>
          <Ferramenta rotulo="Código" onClick={aplicarCodigo}>
            <Code className="h-4 w-4" />
          </Ferramenta>
          <Ferramenta rotulo="Link" ativo={linkAberto} onClick={abrirLink}>
            <Link2 className="h-4 w-4" />
          </Ferramenta>
        </Grupo>
        <Divisor />
        <Grupo>
          <Ferramenta rotulo="Desfazer" onClick={() => comando('undo')}>
            <Undo2 className="h-4 w-4" />
          </Ferramenta>
          <Ferramenta rotulo="Refazer" onClick={() => comando('redo')}>
            <Redo2 className="h-4 w-4" />
          </Ferramenta>
        </Grupo>
      </div>

      {linkAberto && (
        <div className="flex flex-wrap items-center gap-2 border-b border-brand-border bg-white px-3 py-2">
          <div className="min-w-[220px] flex-1">
            <Input
              aria-label="Endereço do link"
              value={url}
              invalid={!!erroLink}
              placeholder="https://exemplo.com"
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  aplicarLink();
                }
              }}
            />
            {erroLink && <p className="mt-1 text-xs text-status-critica">{erroLink}</p>}
          </div>
          <Button size="sm" onClick={aplicarLink}>
            Inserir
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setLinkAberto(false)}>
            Cancelar
          </Button>
        </div>
      )}

      <div ref={host} className="min-h-[22rem]" />
    </div>
  );
}

function Divisor() {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-slate-200" />;
}

function Grupo({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 items-center gap-0.5">{children}</div>;
}

function Ferramenta({ rotulo, ativo, onClick, children }: { rotulo: string; ativo?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={rotulo}
      aria-label={rotulo}
      aria-pressed={ativo || undefined}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300',
        ativo && 'border-brand-primary/40 bg-blue-50 text-brand-primary',
      )}
    >
      {children}
    </button>
  );
}
