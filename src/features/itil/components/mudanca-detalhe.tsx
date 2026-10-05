'use client';

import { useState } from 'react';
import { CalendarClock, CheckSquare, Pencil, UserRound } from 'lucide-react';
import { Badge, Button, Callout, ErrorState, Field, Input, Modal, Select, Skeleton } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { MudancaDetalhe, StatusMudanca } from '@/types';
import { useAuth } from '@/features/auth/auth-provider';
import { mudancaEmPreparo, STATUS_MUDANCA, statusItil, TIPO_MUDANCA } from '../status';
import { useAtualizarMudanca, useMudanca } from '../use-itil';
import { ChamadosVinculados } from './chamados-vinculados';

function Plano({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section className="rounded-md border border-brand-border bg-slate-50 p-3">
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">{titulo}</h3>
      <p className="whitespace-pre-line text-sm text-slate-700">{texto}</p>
    </section>
  );
}

const STATUS_OPTIONS = (Object.keys(STATUS_MUDANCA) as StatusMudanca[]).map((s) => ({ value: s, label: STATUS_MUDANCA[s].label }));

/** ISO → valor de `<input type="datetime-local">` no fuso do navegador. */
function paraInputLocal(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

interface Props {
  id: number | null;
  onClose: () => void;
  onSolicitarAprovacao: (id: number) => void;
}

/** Detalhe da mudança (`GET /mudancas/:id`); o GESTOR altera status e janela. */
export function MudancaDetalheModal({ id, onClose, onSolicitarAprovacao }: Props) {
  const { data: m, isLoading, isError, error, refetch } = useMudanca(id);
  const podeEditar = useAuth().hasRole('GESTOR');
  const [editando, setEditando] = useState(false);

  function fechar() {
    setEditando(false);
    onClose();
  }

  const s = m && statusItil(m.status);
  return (
    <Modal
      open={id !== null}
      onClose={fechar}
      size="lg"
      title={m ? `#${m.id} · ${m.titulo}` : `Mudança #${id ?? ''}`}
      footer={
        m && !editando ? (
          <>
            <Button variant="outline" onClick={fechar}>Fechar</Button>
            {podeEditar && (
              <Button variant="outline" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditando(true)}>
                Alterar status / janela
              </Button>
            )}
            {mudancaEmPreparo(m.status) && (
              <Button icon={<CheckSquare className="h-4 w-4" />} onClick={() => onSolicitarAprovacao(m.id)}>
                Solicitar aprovação
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : isError || !m || !s ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : editando ? (
        <EdicaoMudanca key={m.id} mudanca={m} onCancel={() => setEditando(false)} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={s.tone} dot>{s.label}</Badge>
            <Badge tone={TIPO_MUDANCA[m.tipo]?.tone ?? 'neutral'}>{TIPO_MUDANCA[m.tipo]?.label ?? m.tipo}</Badge>
            <span className="flex items-center gap-1 text-xs text-brand-muted">
              <UserRound className="h-3.5 w-3.5" aria-hidden /> {m.solicitanteNome} · registrada em {formatDateTime(m.criadaEm)}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-brand-darker px-4 py-3 text-sm text-white">
            <CalendarClock className="h-4 w-4 text-brand-accent" aria-hidden />
            Janela: <strong>{formatDateTime(m.janelaInicio)}</strong> até <strong>{formatDateTime(m.janelaFim)}</strong>
          </div>
          <Plano titulo="Descrição" texto={m.descricao} />
          <Plano titulo="Justificativa" texto={m.justificativa} />
          <div className="grid gap-3 md:grid-cols-3">
            <Plano titulo="Plano de impacto" texto={m.planoImpacto} />
            <Plano titulo="Plano de testes" texto={m.planoTestes} />
            <Plano titulo="Plano de retorno" texto={m.planoRetorno} />
          </div>
          <ChamadosVinculados chamados={m.chamados} />
        </div>
      )}
    </Modal>
  );
}

function EdicaoMudanca({ mudanca, onCancel }: { mudanca: MudancaDetalhe; onCancel: () => void }) {
  const [status, setStatus] = useState<StatusMudanca>(mudanca.status);
  const [inicio, setInicio] = useState(paraInputLocal(mudanca.janelaInicio));
  const [fim, setFim] = useState(paraInputLocal(mudanca.janelaFim));
  const atualizar = useAtualizarMudanca(mudanca.id, onCancel);
  const erroJanela = !inicio || !fim ? 'Informe início e fim da janela.' : fim <= inicio ? 'O fim precisa ser depois do início.' : undefined;
  const mudouJanela = inicio !== paraInputLocal(mudanca.janelaInicio) || fim !== paraInputLocal(mudanca.janelaFim);

  function salvar() {
    if (erroJanela) return;
    atualizar.mutate({
      ...(status !== mudanca.status && { status }),
      ...(mudouJanela && { janelaInicio: new Date(inicio).toISOString(), janelaFim: new Date(fim).toISOString() }),
    });
  }

  return (
    <div className="space-y-4">
      <Field label="Status" hint={STATUS_MUDANCA[status].descricao}>
        {(fid) => <Select id={fid} options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value as StatusMudanca)} />}
      </Field>
      {status === 'AGENDADA' && mudanca.status === 'APROVACAO' && (
        <Callout tone="info">Ao decidir uma aprovação desta mudança, a API já a move para Agendada (aprovada) ou Cancelada (rejeitada).</Callout>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Início da janela" error={erroJanela}>
          {(fid) => <Input id={fid} type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} invalid={!!erroJanela} />}
        </Field>
        <Field label="Fim da janela">
          {(fid) => <Input id={fid} type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} invalid={!!erroJanela} />}
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-brand-border pt-4">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button loading={atualizar.isPending} disabled={!!erroJanela || (status === mudanca.status && !mudouJanela)} onClick={salvar}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
