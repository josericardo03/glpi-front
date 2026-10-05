'use client';

import { useState, type ReactNode } from 'react';
import { AlertOctagon, LifeBuoy, Pencil } from 'lucide-react';
import { Badge, Button, Callout, ErrorState, Field, Modal, Select, Skeleton, Textarea } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { ProblemaDetalhe, StatusProblema } from '@/types';
import { PriorityBadge } from '@/features/chamados/components/chamado-badges';
import { useTecnicoOptions } from '@/features/cadastros/use-cadastros';
import { STATUS_PROBLEMA, statusItil } from '../status';
import { useAtualizarProblema, useProblema } from '../use-itil';
import { ChamadosVinculados } from './chamados-vinculados';

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">{titulo}</h3>
      <div className="whitespace-pre-line text-sm text-slate-700">{children}</div>
    </section>
  );
}

const STATUS_OPTIONS = (Object.keys(STATUS_PROBLEMA) as StatusProblema[]).map((s) => ({ value: s, label: STATUS_PROBLEMA[s].label }));

/** Detalhe do problema (`GET /problemas/:id`) com edição de status, causa raiz, contorno e responsável. */
export function ProblemaDetalheModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data: p, isLoading, isError, error, refetch } = useProblema(id);
  const [editando, setEditando] = useState(false);

  function fechar() {
    setEditando(false);
    onClose();
  }

  const s = p && statusItil(p.status);
  return (
    <Modal
      open={id !== null}
      onClose={fechar}
      size="lg"
      title={p ? `#${p.id} · ${p.titulo}` : `Problema #${id ?? ''}`}
      footer={
        p && !editando ? (
          <>
            <Button variant="outline" onClick={fechar}>Fechar</Button>
            <Button icon={<Pencil className="h-4 w-4" />} onClick={() => setEditando(true)}>Atualizar problema</Button>
          </>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : isError || !p || !s ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : editando ? (
        <EdicaoProblema key={p.id} problema={p} onCancel={() => setEditando(false)} />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={s.tone} dot>{s.label}</Badge>
            <PriorityBadge prioridade={p.prioridade} />
            <span className="text-xs text-brand-muted">
              Identificado em {formatDateTime(p.identificadoEm)}
              {p.resolvidoEm && <> · resolvido em {formatDateTime(p.resolvidoEm)}</>}
              {p.tecnicoNome && <> · responsável: {p.tecnicoNome}</>}
            </span>
          </div>
          <Secao titulo="Descrição">{p.descricao}</Secao>
          {p.solucaoContorno && (
            <Callout tone="success" title="Solução de contorno" icon={<LifeBuoy className="h-5 w-5" />}>
              <p className="whitespace-pre-line">{p.solucaoContorno}</p>
            </Callout>
          )}
          {p.causaRaiz ? (
            <Secao titulo="Causa raiz">{p.causaRaiz}</Secao>
          ) : (
            <Callout tone="warning" icon={<AlertOctagon className="h-5 w-5" />}>
              Causa raiz ainda não identificada.
            </Callout>
          )}
          <ChamadosVinculados chamados={p.chamados} />
        </div>
      )}
    </Modal>
  );
}

function EdicaoProblema({ problema, onCancel }: { problema: ProblemaDetalhe; onCancel: () => void }) {
  const [status, setStatus] = useState<StatusProblema>(problema.status);
  const [causaRaiz, setCausaRaiz] = useState(problema.causaRaiz ?? '');
  const [contorno, setContorno] = useState(problema.solucaoContorno ?? '');
  const [tecnicoId, setTecnicoId] = useState(problema.tecnicoId ? String(problema.tecnicoId) : '');
  const tecnicos = useTecnicoOptions();
  const atualizar = useAtualizarProblema(problema.id, onCancel);
  const exigeCausa = status === 'ERRO_CONHECIDO';
  const erroCausa = exigeCausa && !causaRaiz.trim() ? 'Informe a causa raiz para este status.' : undefined;
  const opcoesTecnico =
    problema.tecnicoId && !tecnicos.some((t) => t.value === problema.tecnicoId)
      ? [...tecnicos, { value: problema.tecnicoId, label: problema.tecnicoNome ?? `Usuário #${problema.tecnicoId}` }]
      : tecnicos;

  function salvar() {
    if (erroCausa) return;
    atualizar.mutate({
      ...(status !== problema.status && { status }),
      ...(causaRaiz.trim() !== (problema.causaRaiz ?? '') && { causaRaiz: causaRaiz.trim() }),
      ...(contorno.trim() !== (problema.solucaoContorno ?? '') && { solucaoContorno: contorno.trim() }),
      ...((tecnicoId ? Number(tecnicoId) : null) !== problema.tecnicoId && { tecnicoId: tecnicoId ? Number(tecnicoId) : null }),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" hint={STATUS_PROBLEMA[status].descricao}>
          {(fid) => <Select id={fid} options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value as StatusProblema)} />}
        </Field>
        <Field label="Responsável">
          {(fid) => <Select id={fid} placeholder="Sem responsável" options={opcoesTecnico} value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} />}
        </Field>
      </div>
      <Field label="Causa raiz" required={exigeCausa} error={erroCausa}>
        {(fid) => <Textarea id={fid} value={causaRaiz} onChange={(e) => setCausaRaiz(e.target.value)} invalid={!!erroCausa} placeholder="O que provoca os incidentes?" />}
      </Field>
      <Field label="Solução de contorno" hint="Paliativo que o atendimento pode aplicar enquanto não há correção definitiva.">
        {(fid) => <Textarea id={fid} value={contorno} onChange={(e) => setContorno(e.target.value)} placeholder="Ex.: reiniciar o serviço X pelo painel Y." />}
      </Field>
      <div className="flex justify-end gap-2 border-t border-brand-border pt-4">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button loading={atualizar.isPending} disabled={!!erroCausa} onClick={salvar}>Salvar</Button>
      </div>
    </div>
  );
}
