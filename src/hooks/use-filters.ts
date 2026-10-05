'use client';

import { useCallback, useEffect, useState } from 'react';

/** Estado de filtros com paginação: alterar qualquer filtro volta para a página 1. */
export function useFilters<T extends { page?: number }>(initial: T) {
  const [filters, setFilters] = useState<T>(initial);

  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters((f) => ({ ...f, [key]: value, ...(key !== 'page' ? { page: 1 } : {}) }));
  }, []);

  const reset = useCallback(() => setFilters(initial), [initial]);

  return { filters, setFilter, setFilters, reset };
}

/** Paginação no servidor: se a lista encolher (ex.: após uma mutação), volta para a última página existente. */
export function useAjustarPagina(pagina: { page: number; pageSize: number; total: number } | undefined, setPage: (p: number) => void) {
  const ultima = pagina ? Math.max(1, Math.ceil(pagina.total / pagina.pageSize)) : 1;
  const fora = !!pagina && pagina.page > ultima;
  useEffect(() => {
    if (fora) setPage(ultima);
  }, [fora, ultima, setPage]);
}

export function useDebounce<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Seleção múltipla para tabelas (ações em lote). */
export function useSelection<K extends string | number>() {
  const [selected, setSelected] = useState<Set<K>>(new Set());
  const onToggle = useCallback((k: K) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }, []);
  const onToggleAll = useCallback((keys: K[]) => {
    setSelected((s) => (keys.every((k) => s.has(k)) ? new Set() : new Set(keys)));
  }, []);
  const clear = useCallback(() => setSelected(new Set()), []);
  return { selected, onToggle, onToggleAll, clear };
}
