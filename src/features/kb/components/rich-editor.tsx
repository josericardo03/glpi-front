'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Code, ImagePlus, IndentDecrease, IndentIncrease, Link2, List, ListOrdered, MessageSquareWarning, Redo2, SquareCode, Undo2 } from 'lucide-react';
import { Button, Input, useToast } from '@/components/ui';
import { markdownParaHtml } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import { htmlColado, htmlParaMarkdown, urlDeLink } from '../documento';
import { altDeArquivo, imagemAceita, IMAGEM_MAX_BYTES } from '../imagem';
import { carregarImagens, ImagemAmpliada } from './conteudo-artigo';

interface Props {
  id?: string;
  inicial: string;
  invalid?: boolean;
  onChange: (markdown: string) => void;
  /** Confere título e categoria antes de abrir o arquivo. */
  antesDaImagem?: () => boolean;
  /** Envia o arquivo. No artigo novo, cria o artigo e devolve o endereço da imagem. */
  enviarImagem: (file: File) => Promise<{ href: string; alt: string }>;
  /** Grava o texto já com a imagem, para ela não depender de um segundo salvamento. */
  aoInserirImagem?: (markdown: string) => Promise<void>;
}

type Formato = 'bold' | 'italic' | 'underline' | 'ul' | 'ol' | 'h2' | 'h3' | 'quote' | 'pre';

const VAZIO: Record<Formato, boolean> = { bold: false, italic: false, underline: false, ul: false, ol: false, h2: false, h3: false, quote: false, pre: false };

/** O navegador só insere HTML colado já filtrado; aqui só se decide se há algo a inserir. */
const temConteudo = (html: string) => {
  const aux = document.createElement('div');
  aux.innerHTML = html;
  return !!aux.textContent?.trim() || !!aux.querySelector('pre,br');
};

export function RichEditor({ id, inicial, invalid, onChange, antesDaImagem, enviarImagem, aoInserirImagem }: Props) {
  const toast = useToast();
  const folha = useRef<HTMLDivElement | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const faixa = useRef<Range | null>(null);
  const blobs = useRef<string[]>([]);
  const onChangeRef = useRef(onChange);
  const enviarRef = useRef(enviarImagem);
  const antesRef = useRef(antesDaImagem);
  const aoInserirRef = useRef(aoInserirImagem);
  onChangeRef.current = onChange;
  enviarRef.current = enviarImagem;
  antesRef.current = antesDaImagem;
  aoInserirRef.current = aoInserirImagem;
  const [enviando, setEnviando] = useState(false);
  const [ampliada, setAmpliada] = useState<{ src: string; alt: string } | null>(null);
  const ampliarRef = useRef(setAmpliada);
  ampliarRef.current = setAmpliada;
  const receberImagemRef = useRef<(file: File, range: Range | null) => void>(() => {});
  const abrirLinkRef = useRef<() => void>(() => {});
  const ultimaFaixa = useRef<Range | null>(null);
  const barra = useRef<HTMLDivElement>(null);
  const htmlInicial = useRef(markdownParaHtml(inicial));
  const [ativo, setAtivo] = useState(VAZIO);
  const [linkAberto, setLinkAberto] = useState(false);
  const [url, setUrl] = useState('https://');
  const [erroLink, setErroLink] = useState('');

  const marcarVazio = (el: HTMLElement) => {
    const texto = (el.textContent ?? '').replace(/\u00a0/g, '').trim();
    el.dataset.vazio = texto || el.querySelector('img') ? 'false' : 'true';
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
      el.dataset.placeholder = 'Escreva o artigo aqui. Cole ou solte uma imagem.';
      el.className = 'editor-folha prose-kb';
      el.innerHTML = htmlInicial.current;
      marcarVazio(el);
      el.addEventListener('input', () => {
        marcarVazio(el!);
        onChangeRef.current(htmlParaMarkdown(el!));
      });
      el.addEventListener('paste', (e) => {
        const imagem = arquivoDeTransferencia(e.clipboardData);
        if (imagem) {
          e.preventDefault();
          const sel = window.getSelection();
          const range = sel && sel.rangeCount && el!.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
          receberImagemRef.current(imagem, range);
          return;
        }
        e.preventDefault();
        const simples = e.clipboardData?.getData('text/plain') ?? '';
        const html = e.clipboardData?.getData('text/html') ?? '';
        const sel = window.getSelection();
        const emCodigo = !!sel?.anchorNode && !!(sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode.parentElement)?.closest('pre');
        // Formatação colada (Word, Docs, páginas) é reduzida ao que o editor representa; em bloco de código vai texto puro.
        const limpo = html && !emCodigo ? htmlColado(html) : '';
        if (limpo && temConteudo(limpo)) document.execCommand('insertHTML', false, limpo);
        else document.execCommand('insertText', false, simples);
        marcarVazio(el!);
        onChangeRef.current(htmlParaMarkdown(el!));
      });
      // Atalhos: Ctrl+K abre o link; Tab / Shift+Tab recuam itens de lista (fora de lista, Tab segue o foco normal).
      el.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          abrirLinkRef.current();
          return;
        }
        if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
        const sel = window.getSelection();
        const no = sel?.anchorNode;
        const dentroDeItem = !!no && !!(no instanceof Element ? no : no.parentElement)?.closest('li');
        if (!dentroDeItem) return;
        e.preventDefault();
        document.execCommand(e.shiftKey ? 'outdent' : 'indent');
        marcarVazio(el!);
        onChangeRef.current(htmlParaMarkdown(el!));
      });
      // Arrastar texto de dentro do próprio editor move o trecho; vindo de fora, entra como texto puro.
      let arrastandoInterno = false;
      el.addEventListener('dragstart', () => {
        arrastandoInterno = true;
      });
      el.addEventListener('dragend', () => {
        arrastandoInterno = false;
      });
      el.addEventListener('dragover', (e) => {
        if (![...(e.dataTransfer?.items ?? [])].some((item) => item.kind === 'file')) return;
        e.preventDefault();
        el!.dataset.soltar = 'true';
      });
      el.addEventListener('dragleave', (e) => {
        if (e.relatedTarget instanceof Node && el!.contains(e.relatedTarget)) return;
        delete el!.dataset.soltar;
      });
      el.addEventListener('drop', (e) => {
        delete el!.dataset.soltar;
        const imagem = arquivoDeTransferencia(e.dataTransfer);
        if (!imagem) {
          if (arrastandoInterno) {
            arrastandoInterno = false;
            return;
          }
          // HTML arrastado de outra página não entra no editor: só o texto.
          e.preventDefault();
          const solto = e.dataTransfer?.getData('text/plain') ?? '';
          const ponto = faixaNoPonto(e.clientX, e.clientY);
          if (solto && ponto && el!.contains(ponto.startContainer)) {
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(ponto);
            document.execCommand('insertText', false, solto);
            marcarVazio(el!);
            onChangeRef.current(htmlParaMarkdown(el!));
          }
          return;
        }
        e.preventDefault();
        const range = faixaNoPonto(e.clientX, e.clientY);
        receberImagemRef.current(imagem, range && el!.contains(range.startContainer) ? range : null);
      });
    }
    if (!el.dataset.cliqueImagem) {
      el.dataset.cliqueImagem = '1';
      el.addEventListener('mousedown', (e) => {
        const alvo = e.target;
        if (!(alvo instanceof HTMLImageElement) || !alvo.dataset.api || !alvo.src) return;
        e.preventDefault();
        ampliarRef.current({ src: alvo.src, alt: alvo.alt });
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
    const el = folha.current;
    if (!el) return;
    let ativo = true;
    const urls: string[] = [];
    void carregarImagens(el, () => ativo, urls);
    return () => {
      ativo = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
      blobs.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const atualizar = () => {
      const el = folha.current;
      const sel = window.getSelection();
      if (!el || !sel?.anchorNode || !el.contains(sel.anchorNode)) return;
      if (sel.rangeCount) ultimaFaixa.current = sel.getRangeAt(0).cloneRange();
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
        pre: bloco === 'pre',
      };
      setAtivo((atual) => ((Object.keys(proximo) as Formato[]).every((k) => atual[k] === proximo[k]) ? atual : proximo));
    };
    document.addEventListener('selectionchange', atualizar);
    return () => document.removeEventListener('selectionchange', atualizar);
  }, []);

  function comando(cmd: string, valor?: string) {
    const el = folha.current;
    el?.focus();
    const sel = window.getSelection();
    // Abrir o seletor de estilo tira a seleção do texto: volta para onde estava.
    if (el && sel && !(sel.anchorNode && el.contains(sel.anchorNode)) && ultimaFaixa.current) {
      sel.removeAllRanges();
      sel.addRange(ultimaFaixa.current);
    }
    document.execCommand(cmd, false, valor);
    publicar();
  }

  /** Recuo só faz sentido em lista (cria sublista); fora dela o navegador geraria uma citação. */
  function recuo(cmd: 'indent' | 'outdent') {
    const no = window.getSelection()?.anchorNode;
    const emLista = !!no && !!(no instanceof Element ? no : no.parentElement)?.closest('li') && !!folha.current?.contains(no);
    if (!emLista) {
      toast.info('O recuo vale para itens de lista. Crie uma lista primeiro.');
      return;
    }
    comando(cmd);
  }

  function lista(cmd: 'insertUnorderedList' | 'insertOrderedList') {
    const bloco = String(document.queryCommandValue('formatBlock')).toLowerCase();
    if (bloco === 'h1' || bloco === 'h2' || bloco === 'h3' || bloco === 'blockquote') comando('formatBlock', '<div>');
    comando(cmd);
  }

  abrirLinkRef.current = abrirLink;
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

  function escolherImagem() {
    if (enviando) return;
    if (antesRef.current && !antesRef.current()) return;
    const sel = window.getSelection();
    faixa.current = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    arquivo.current?.click();
  }

  async function aoEscolherImagem(file: File | undefined) {
    const el = folha.current;
    if (!file || !el) return;
    if (file.size > IMAGEM_MAX_BYTES) {
      toast.error('A imagem passa de 20 MB.');
      return;
    }
    if (!imagemAceita(file)) {
      toast.error('Envie uma imagem PNG, JPEG, GIF ou WebP.');
      return;
    }
    setEnviando(true);
    try {
      const figura = await enviarRef.current(file);
      const local = URL.createObjectURL(file);
      blobs.current.push(local);
      el.focus();
      const sel = window.getSelection();
      const range = faixa.current;
      if (range && el.contains(range.startContainer)) {
        sel?.removeAllRanges();
        sel?.addRange(range);
        range.collapse(false);
      } else {
        const fim = document.createRange();
        fim.selectNodeContents(el);
        fim.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(fim);
      }
      // Pelo execCommand a imagem entra no histórico do navegador, então Ctrl+Z a remove.
      document.execCommand('insertImage', false, local);
      const img = [...el.querySelectorAll('img')].find((candidata) => candidata.getAttribute('src') === local);
      if (!img) throw new Error('Não foi possível inserir a imagem.');
      img.alt = figura.alt || altDeArquivo(file.name);
      img.dataset.api = figura.href;
      img.dataset.carregada = '1';
      img.draggable = false;
      publicar();
      await aoInserirRef.current?.(htmlParaMarkdown(el));
      toast.success('Imagem inserida.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível enviar a imagem.');
    } finally {
      setEnviando(false);
      if (arquivo.current) arquivo.current.value = '';
    }
  }

  receberImagemRef.current = (file, range) => {
    if (enviando) return;
    if (antesRef.current && !antesRef.current()) return;
    faixa.current = range;
    void aoEscolherImagem(file);
  };

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
      <div
        ref={barra}
        role="toolbar"
        aria-label="Formatação do texto"
        aria-controls={id}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          const itens = [...(barra.current?.querySelectorAll<HTMLElement>('button, select') ?? [])];
          const atual = itens.indexOf(document.activeElement as HTMLElement);
          if (atual < 0) return;
          e.preventDefault();
          itens[(atual + (e.key === 'ArrowRight' ? 1 : -1) + itens.length) % itens.length]?.focus();
        }}
        className="flex items-center gap-1 overflow-x-auto border-b border-brand-border bg-slate-50 px-2 py-1.5"
      >
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
          <Ferramenta rotulo="Diminuir recuo (Shift+Tab)" onClick={() => recuo('outdent')}>
            <IndentDecrease className="h-4 w-4" />
          </Ferramenta>
          <Ferramenta rotulo="Aumentar recuo (Tab)" onClick={() => recuo('indent')}>
            <IndentIncrease className="h-4 w-4" />
          </Ferramenta>
        </Grupo>
        <Divisor />
        <Grupo>
          <Ferramenta rotulo="Destaque" ativo={ativo.quote} onClick={() => comando('formatBlock', ativo.quote ? '<div>' : '<blockquote>')}>
            <MessageSquareWarning className="h-4 w-4" />
          </Ferramenta>
          <Ferramenta rotulo="Código no texto" onClick={aplicarCodigo}>
            <Code className="h-4 w-4" />
          </Ferramenta>
          <Ferramenta rotulo="Bloco de código" ativo={ativo.pre} onClick={() => comando('formatBlock', ativo.pre ? '<div>' : '<pre>')}>
            <SquareCode className="h-4 w-4" />
          </Ferramenta>
          <Ferramenta rotulo="Link (Ctrl+K)" ativo={linkAberto} onClick={abrirLink}>
            <Link2 className="h-4 w-4" />
          </Ferramenta>
          <Ferramenta rotulo={enviando ? 'Enviando imagem' : 'Imagem. Também dá para colar ou soltar o arquivo'} onClick={escolherImagem}>
            <ImagePlus className="h-4 w-4" />
          </Ferramenta>
        </Grupo>
        <input
          ref={arquivo}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void aoEscolherImagem(e.target.files?.[0])}
        />
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
      {ampliada && <ImagemAmpliada src={ampliada.src} alt={ampliada.alt} onClose={() => setAmpliada(null)} />}
    </div>
  );
}

function arquivoDeTransferencia(data: DataTransfer | null) {
  if (!data) return null;
  const solto = [...data.files].find((file) => imagemAceita(file));
  if (solto) return solto;
  for (const item of data.items) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (file && imagemAceita(file)) return file;
  }
  return null;
}

function faixaNoPonto(x: number, y: number) {
  const comPonto = document as Document & { caretRangeFromPoint?: (px: number, py: number) => Range | null };
  if (comPonto.caretRangeFromPoint) return comPonto.caretRangeFromPoint(x, y);
  const pos = document.caretPositionFromPoint?.(x, y);
  if (!pos) return null;
  const range = document.createRange();
  range.setStart(pos.offsetNode, pos.offset);
  range.collapse(true);
  return range;
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
