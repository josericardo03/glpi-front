'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';
import type { CsatChamado } from '@/types';
import { useAvaliarChamado } from '../hooks/use-chamados';

const ROTULOS = ['Muito insatisfeito', 'Insatisfeito', 'Neutro', 'Satisfeito', 'Muito satisfeito'];

function Estrelas({ valor, tamanho = 'h-7 w-7' }: { valor: number; tamanho?: string }) {
  return (
    <span className="flex gap-1" aria-hidden>
      {ROTULOS.map((_, i) => (
        <Star key={i} className={cn(tamanho, i < valor ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
      ))}
    </span>
  );
}

export function CsatCard({ chamadoId, csat, podeAvaliar }: { chamadoId: number; csat: CsatChamado; podeAvaliar: boolean }) {
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const avaliar = useAvaliarChamado(chamadoId);

  const exibida = hover || nota;

  if (!csat.avaliado && !podeAvaliar) return null;

  return (
    <Card className="border-amber-200">
      <CardHeader
        title={csat.avaliado ? 'Avaliação do atendimento' : 'Avalie o atendimento'}
        description={csat.avaliado ? `Respondida em ${formatDateTime(csat.respondidoEm)}` : 'Sua opinião ajuda a melhorar o suporte.'}
        icon={<Star className="h-4 w-4 text-amber-500" />}
      />
      <CardBody>
        {csat.avaliado ? (
          <div className="text-center" role="status">
            <div className="mb-2 flex justify-center"><Estrelas valor={csat.nota} /></div>
            <p className="text-sm font-medium text-brand-darker">{ROTULOS[csat.nota - 1] ?? `Nota ${csat.nota}`}</p>
            {csat.comentario && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-left text-sm italic text-brand-muted">“{csat.comentario}”</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div role="radiogroup" aria-label="Nota de satisfação" className="flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
                {ROTULOS.map((rotulo, i) => (
                  <button
                    key={rotulo}
                    type="button"
                    role="radio"
                    aria-checked={nota === i + 1}
                    aria-label={`${i + 1} - ${rotulo}`}
                    onClick={() => setNota(i + 1)}
                    onMouseEnter={() => setHover(i + 1)}
                    className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                  >
                    <Star className={cn('h-8 w-8', i < exibida ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
                  </button>
                ))}
              </div>
              <p className="mt-1 h-4 text-center text-xs font-medium text-brand-muted">{exibida ? ROTULOS[exibida - 1] : 'Escolha de 1 a 5 estrelas'}</p>
            </div>
            <Field label="Comentário (opcional)">
              {(id) => <Textarea id={id} maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="O que foi bom ou o que podemos melhorar?" className="min-h-[72px]" />}
            </Field>
            <Button className="w-full" disabled={!nota} loading={avaliar.isPending} onClick={() => avaliar.mutate({ nota, comentario })}>
              Enviar avaliação
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
