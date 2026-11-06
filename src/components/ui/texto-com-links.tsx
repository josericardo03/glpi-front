import { cn } from '@/lib/utils';

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
/** Pontuação que costuma vir colada ao fim do endereço no meio de uma frase. */
const FIM_DE_FRASE = /[.,;:!?)\]]+$/;

/**
 * Texto puro com as quebras de linha preservadas e os endereços http(s) clicáveis.
 * Nada é interpretado como HTML: o texto vira nós de React, então não há risco de injeção.
 */
export function TextoComLinks({ texto, className }: { texto: string; className?: string }) {
  const partes = texto.split(URL_RE);
  return (
    <p className={cn('whitespace-pre-line break-words', className)}>
      {partes.map((parte, i) => {
        if (i % 2 === 0) return parte;
        const sobra = FIM_DE_FRASE.exec(parte)?.[0] ?? '';
        const url = sobra ? parte.slice(0, -sobra.length) : parte;
        return (
          <span key={i}>
            <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-primary underline">
              {url}
            </a>
            {sobra}
          </span>
        );
      })}
    </p>
  );
}
