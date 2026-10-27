'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { markdownParaHtml } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import { refImagem } from '../imagem';
import { kbService } from '../kb.service';

/** Coloca o arquivo baixado com o token no lugar da imagem. A tag img sozinha não envia Authorization. */
export async function carregarImagens(root: ParentNode, vivo: () => boolean, urls: string[]) {
  const figs = [...root.querySelectorAll<HTMLImageElement>('img[data-api]')];
  await Promise.all(
    figs.map(async (img) => {
      if (img.dataset.carregada === '1') return;
      const ref = refImagem(img.dataset.api ?? '');
      if (!ref) return;
      try {
        const blob = await kbService.baixarArquivo(ref.artigoId, ref.anexoId, ref.rota);
        const url = URL.createObjectURL(blob);
        if (!vivo()) {
          URL.revokeObjectURL(url);
          return;
        }
        urls.push(url);
        img.src = url;
        img.draggable = false;
        img.dataset.carregada = '1';
      } catch {
        if (vivo()) img.alt = 'Imagem indisponível';
      }
    }),
  );
}

function prepararAmpliar(root: ParentNode) {
  root.querySelectorAll<HTMLImageElement>('img[data-api]').forEach((img) => {
    if (img.dataset.carregada !== '1') return;
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', img.alt ? `Ampliar: ${img.alt}` : 'Ampliar imagem');
  });
}

function imagemDoEvento(alvo: EventTarget | null) {
  return alvo instanceof HTMLImageElement && alvo.matches('[data-api]') ? alvo : null;
}

/** A figura do artigo abre no tamanho da tela. O endereço é o mesmo arquivo já baixado para o texto. */
export function ImagemAmpliada({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const fecharRef = useRef(onClose);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const abertaEm = useRef(0);
  fecharRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      fecharRef.current();
    };
    abertaEm.current = performance.now();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    botaoRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={alt || 'Imagem ampliada'}>
      <button
        type="button"
        className="absolute inset-0 bg-brand-darker/80"
        aria-label="Fechar imagem"
        onClick={() => {
          if (performance.now() - abertaEm.current < 400) return;
          onClose();
        }}
      />
      <button
        ref={botaoRef}
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-md bg-white/95 p-2 text-brand-darker shadow-pop hover:bg-white"
        aria-label="Fechar"
      >
        <X aria-hidden className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- blob local, já autorizado pelo token */}
      <img src={src} alt={alt} className="relative z-10 max-h-full max-w-full object-contain" />
    </div>,
    document.body,
  );
}

export function ConteudoArtigo({ markdown, className }: { markdown: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ampliada, setAmpliada] = useState<{ src: string; alt: string } | null>(null);
  const html = markdownParaHtml(markdown);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let ativo = true;
    const urls: string[] = [];
    void carregarImagens(root, () => ativo, urls).then(() => {
      if (ativo) prepararAmpliar(root);
    });

    const abrir = (img: HTMLImageElement) => {
      if (img.dataset.carregada !== '1' || !img.src) return;
      setAmpliada({ src: img.src, alt: img.alt });
    };
    const onClick = (ev: MouseEvent) => {
      const img = imagemDoEvento(ev.target);
      if (img) abrir(img);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      const img = imagemDoEvento(ev.target);
      if (!img) return;
      ev.preventDefault();
      abrir(img);
    };
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    return () => {
      ativo = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKey);
      setAmpliada(null);
    };
  }, [html]);

  return (
    <>
      <div ref={ref} className={cn('prose-kb', className)} dangerouslySetInnerHTML={{ __html: html }} />
      {ampliada && <ImagemAmpliada src={ampliada.src} alt={ampliada.alt} onClose={() => setAmpliada(null)} />}
    </>
  );
}
