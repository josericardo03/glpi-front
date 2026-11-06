'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { Callout } from '@/components/ui';
import { useDebounce } from '@/hooks/use-filters';
import { kbKeys } from '@/features/kb/use-kb';
import { kbService } from '@/features/kb/kb.service';
import type { KbArtigo } from '@/types';

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Palavras comuns que não ajudam a achar um artigo. */
const IGNORAR = new Set(['para', 'como', 'com', 'sem', 'que', 'nao', 'uma', 'uns', 'umas', 'dos', 'das', 'nos', 'nas', 'por', 'meu', 'minha', 'esta', 'esse', 'essa', 'isso']);

export function palavrasDoTitulo(titulo: string) {
  return [...new Set(semAcento(titulo).split(/[^a-z0-9]+/).filter((p) => p.length >= 3 && !IGNORAR.has(p)))];
}

/** Artigos publicados cujo título ou resumo repetem palavras do que o usuário digitou, os mais aderentes primeiro. */
export function artigosParecidos(artigos: KbArtigo[], titulo: string, limite = 3) {
  const palavras = palavrasDoTitulo(titulo);
  if (!palavras.length) return [];
  return artigos
    .map((a) => {
      const alvoTitulo = semAcento(a.titulo);
      const alvoResumo = semAcento(a.resumo);
      const pontos = palavras.reduce((soma, p) => soma + (alvoTitulo.includes(p) ? 2 : alvoResumo.includes(p) ? 1 : 0), 0);
      return { artigo: a, pontos };
    })
    .filter((x) => x.pontos >= 2)
    .sort((a, b) => b.pontos - a.pontos || b.artigo.visualizacoes - a.artigo.visualizacoes)
    .slice(0, limite)
    .map((x) => x.artigo);
}

/** Mostra artigos da base de conhecimento enquanto o título é digitado, para o usuário tentar resolver sozinho. */
export function SugestoesKb({ titulo }: { titulo: string }) {
  const consulta = useDebounce(titulo.trim(), 500);
  const ativo = consulta.length >= 8;
  const { data } = useQuery({ queryKey: kbKeys.artigos, queryFn: kbService.artigos, staleTime: 60_000, enabled: ativo });
  const sugeridos = useMemo(() => (ativo && data ? artigosParecidos(data, consulta) : []), [ativo, data, consulta]);
  if (!sugeridos.length) return null;
  return (
    <Callout tone="info" title="Estes artigos podem resolver o seu problema" icon={<BookOpen className="h-5 w-5" />}>
      <ul className="mt-1 space-y-1">
        {sugeridos.map((a) => (
          <li key={a.id}>
            <Link href={`/kb/artigos/${a.id}`} target="_blank" rel="noopener" className="font-medium text-brand-primary underline">
              {a.titulo}
            </Link>
          </li>
        ))}
      </ul>
    </Callout>
  );
}
