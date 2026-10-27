'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { Button, ConfirmModal } from '@/components/ui';
import { formatBytes } from '@/lib/format';
import type { AnexoArtigo } from '@/types';
import { IMAGEM_MAX_BYTES, pdfAceito } from '../imagem';
import { kbService } from '../kb.service';
import { useEnviarAnexoArtigo, useRemoverAnexoArtigo } from '../use-kb';
import { ImagemAmpliada } from './conteudo-artigo';

export function AnexosArtigo({ artigoId, imagens, pdfs, podeEditar }: { artigoId: number; imagens: AnexoArtigo[]; pdfs: AnexoArtigo[]; podeEditar: boolean }) {
  const enviar = useEnviarAnexoArtigo();
  const remover = useRemoverAnexoArtigo();
  const arquivo = useRef<HTMLInputElement>(null);
  const [fotos, setFotos] = useState<Record<number, string>>({});
  const [ampliada, setAmpliada] = useState<{ src: string; alt: string } | null>(null);
  const [apagar, setApagar] = useState<AnexoArtigo | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    const urls: string[] = [];
    setFotos({});
    void Promise.all(
      imagens.map(async (img) => {
        try {
          const blob = await kbService.baixarArquivo(artigoId, img.id, 'anexos');
          const url = URL.createObjectURL(blob);
          if (!ativo) {
            URL.revokeObjectURL(url);
            return;
          }
          urls.push(url);
          setFotos((atual) => ({ ...atual, [img.id]: url }));
        } catch {
          /* a miniatura fica com o nome do arquivo */
        }
      }),
    );
    return () => {
      ativo = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [artigoId, imagens]);

  function escolherPdf(file: File | undefined) {
    if (!file) return;
    if (file.size > IMAGEM_MAX_BYTES) {
      setErro('O arquivo passa de 20 MB.');
      return;
    }
    if (!pdfAceito(file)) {
      setErro('Envie um PDF.');
      return;
    }
    setErro('');
    enviar.mutate({ id: artigoId, file });
  }

  async function abrirPdf(pdf: AnexoArtigo) {
    const blob = await kbService.baixarArquivo(artigoId, pdf.id, 'anexos');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <section className="mt-8 space-y-6 border-t border-brand-border pt-6">
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-brand-darker">Imagens</h2>
        </div>
        {imagens.length === 0 ? (
          <p className="text-sm text-brand-muted">Nenhuma imagem anexada.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {imagens.map((img) => (
              <li key={img.id} className="overflow-hidden rounded-lg border border-brand-border">
                <button type="button" className="block w-full bg-slate-50" onClick={() => fotos[img.id] && setAmpliada({ src: fotos[img.id]!, alt: img.nomeArquivo })}>
                  {fotos[img.id] ? (
                    <img src={fotos[img.id]} alt={img.nomeArquivo} className="max-h-48 w-full object-contain" />
                  ) : (
                    <span className="block px-3 py-8 text-sm text-brand-muted">{img.nomeArquivo}</span>
                  )}
                </button>
                <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-brand-muted">
                  <span className="truncate">{img.nomeArquivo}</span>
                  <span className="shrink-0">{formatBytes(img.tamanhoBytes)}</span>
                  {podeEditar && (
                    <Button variant="ghost" size="sm" aria-label={`Remover ${img.nomeArquivo}`} onClick={() => setApagar(img)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-brand-darker">PDFs</h2>
          {podeEditar && (
            <>
              <Button variant="outline" size="sm" icon={<FileText className="h-4 w-4" />} loading={enviar.isPending} onClick={() => arquivo.current?.click()}>
                Anexar PDF
              </Button>
              <input
                ref={arquivo}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  escolherPdf(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </>
          )}
        </div>
        {erro && <p className="mb-2 text-xs text-status-critica">{erro}</p>}
        {pdfs.length === 0 ? (
          <p className="text-sm text-brand-muted">Nenhum PDF anexado.</p>
        ) : (
          <ul className="space-y-2">
            {pdfs.map((pdf) => (
              <li key={pdf.id} className="flex items-center justify-between gap-3 rounded-lg border border-brand-border px-3 py-2">
                <button type="button" className="flex min-w-0 items-center gap-2 text-left text-sm font-medium text-brand-primary hover:underline" onClick={() => void abrirPdf(pdf)}>
                  <FileText className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{pdf.nomeArquivo}</span>
                </button>
                <span className="shrink-0 text-xs text-brand-muted">{formatBytes(pdf.tamanhoBytes)}</span>
                {podeEditar && (
                  <Button variant="ghost" size="sm" aria-label={`Remover ${pdf.nomeArquivo}`} onClick={() => setApagar(pdf)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {ampliada && <ImagemAmpliada src={ampliada.src} alt={ampliada.alt} onClose={() => setAmpliada(null)} />}
      <ConfirmModal
        open={!!apagar}
        onClose={() => setApagar(null)}
        title="Remover arquivo"
        confirmLabel="Remover"
        loading={remover.isPending}
        onConfirm={() => {
          if (!apagar) return;
          remover.mutate({ artigoId, anexoId: apagar.id }, { onSuccess: () => setApagar(null) });
        }}
      >
        {apagar ? `Remover ${apagar.nomeArquivo} deste artigo?` : null}
      </ConfirmModal>
    </section>
  );
}
