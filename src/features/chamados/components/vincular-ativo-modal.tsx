'use client';

import { useMemo, useState } from 'react';
import { Check, Database } from 'lucide-react';
import { Button, Modal, SearchInput, Skeleton } from '@/components/ui';
import { matches } from '@/lib/http';
import { cn } from '@/lib/utils';
import { useAtivos } from '@/features/ativos/use-ativos';
import { useVincularAtivo } from '../hooks/use-chamados';

interface Props {
  chamadoId: number;
  open: boolean;
  onClose: () => void;
  /** Ativos que já aparecem no chamado (ocultados da lista). */
  vinculados: number[];
}

export function VincularAtivoModal({ chamadoId, open, onClose, vinculados }: Props) {
  const { data: ativos, isLoading } = useAtivos();
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<number | null>(null);

  function fechar() {
    setBusca('');
    setSelecionado(null);
    onClose();
  }

  const vincular = useVincularAtivo(chamadoId, fechar);

  const lista = useMemo(
    () => (ativos ?? []).filter((a) => !vinculados.includes(a.id) && (matches(a.nome, busca) || matches(a.codigo, busca) || matches(a.responsavelNome, busca))).slice(0, 50),
    [ativos, vinculados, busca],
  );
  const escolhido = ativos?.find((a) => a.id === selecionado);

  return (
    <Modal
      open={open}
      onClose={fechar}
      title="Vincular ativo ao chamado"
      description={`O ativo passa a constar como item de configuração afetado no chamado #${chamadoId}.`}
      footer={
        <>
          <Button variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button disabled={!escolhido} loading={vincular.isPending} onClick={() => escolhido && vincular.mutate({ id: escolhido.id, nome: escolhido.nome })}>
            Vincular
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <SearchInput aria-label="Buscar ativo" placeholder="Nome, patrimônio ou responsável..." value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus />
        <div role="radiogroup" aria-label="Ativos" className="max-h-80 space-y-1.5 overflow-y-auto">
          {isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14" />)}
          {!isLoading && !lista.length && <p className="py-6 text-center text-sm text-brand-muted">Nenhum ativo encontrado.</p>}
          {lista.map((a) => {
            const ativo = a.id === selecionado;
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => setSelecionado(a.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition',
                  ativo ? 'border-brand-primary bg-blue-50/60 ring-1 ring-brand-primary' : 'border-brand-border hover:bg-slate-50',
                )}
              >
                <Database className="h-4 w-4 shrink-0 text-brand-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-brand-darker">{a.nome}</p>
                  <p className="truncate text-xs text-brand-muted">
                    {a.codigo} · {a.responsavelNome ?? 'Sem responsável'}
                  </p>
                </div>
                {ativo && <Check className="h-4 w-4 text-brand-primary" />}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
