'use client';

import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Software } from '../mapa.service';
import { useBuscaSoftwares } from '../use-mapa';

interface Props {
  id?: string;
  valor: Software | null;
  onChange: (software: Software | null) => void;
  /** Software que não pode aparecer nas opções (ex.: já escolhido na outra ponta da dependência). */
  excluirId?: number | null;
  placeholder?: string;
  disabled?: boolean;
}

const campo =
  'h-10 w-full rounded-md border border-brand-border bg-white pl-3 pr-9 text-sm text-brand-darker placeholder:text-brand-muted/70 ' +
  'transition-colors focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-brand-muted';

function useAtrasado(valor: string, ms: number) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return atrasado;
}

/**
 * Escolha de software com busca: digita-se parte do nome ou do código e a lista (até 20) vem do servidor.
 * Teclado: setas navegam, Enter escolhe, Esc fecha.
 */
export function SoftwareCombobox({ id, valor, onChange, excluirId, placeholder = 'Buscar software', disabled }: Props) {
  const gerado = useId();
  const idCampo = id ?? gerado;
  const idLista = `${idCampo}-lista`;
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [ativo, setAtivo] = useState(0);
  const consulta = useAtrasado(texto, 250);
  const busca = useBuscaSoftwares(consulta, aberto);

  const opcoes = (busca.data ?? []).filter((s) => s.id !== excluirId);
  const indice = Math.min(ativo, Math.max(0, opcoes.length - 1));

  function escolher(s: Software) {
    onChange(s);
    setAberto(false);
    setTexto('');
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAberto(true);
      setAtivo(Math.min(indice + 1, opcoes.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAtivo(Math.max(indice - 1, 0));
    } else if (e.key === 'Enter' && aberto && opcoes[indice]) {
      e.preventDefault();
      escolher(opcoes[indice]);
    } else if (e.key === 'Escape' && aberto) {
      e.stopPropagation();
      setAberto(false);
    }
  }

  return (
    <div className="relative">
      <input
        id={idCampo}
        type="text"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={aberto && opcoes[indice] ? `${idCampo}-op-${opcoes[indice].id}` : undefined}
        autoComplete="off"
        className={campo}
        placeholder={valor ? undefined : placeholder}
        value={aberto ? texto : (valor?.nome ?? '')}
        disabled={disabled}
        onFocus={() => {
          setAberto(true);
          setTexto('');
          setAtivo(0);
        }}
        onBlur={() => setAberto(false)}
        onChange={(e) => {
          setTexto(e.target.value);
          setAtivo(0);
          setAberto(true);
        }}
        onKeyDown={aoTeclar}
      />
      {valor && !disabled && (
        <button
          type="button"
          aria-label="Limpar escolha"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-brand-muted hover:bg-slate-100 hover:text-brand-darker"
          // mousedown evita que o campo perca o foco antes do clique ser tratado
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(null)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {aberto && (
        <ul
          id={idLista}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-brand-border bg-white py-1 shadow-lg"
        >
          {busca.isLoading && opcoes.length === 0 ? (
            <li className="px-3 py-2 text-sm text-brand-muted">Buscando…</li>
          ) : opcoes.length === 0 ? (
            <li className="px-3 py-2 text-sm text-brand-muted">{texto.trim() ? 'Nenhum software encontrado.' : 'Nenhum software cadastrado.'}</li>
          ) : (
            opcoes.map((s, i) => (
              <li
                key={s.id}
                id={`${idCampo}-op-${s.id}`}
                role="option"
                aria-selected={valor?.id === s.id}
                className={cn('cursor-pointer px-3 py-2 text-sm', i === indice ? 'bg-brand-primary/10 text-brand-darker' : 'text-slate-700 hover:bg-slate-50')}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setAtivo(i)}
                onClick={() => escolher(s)}
              >
                <span className="font-medium">{s.nome}</span>
                <span className="ml-2 text-xs text-brand-muted">{s.codigo}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
