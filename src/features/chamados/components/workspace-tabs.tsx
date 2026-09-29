'use client';

import { useState, type FormEvent } from 'react';
import { Clock, FileText, History, Lock, Paperclip, UserRound } from 'lucide-react';
import { Avatar, Badge, Button, Checkbox, EmptyState, Field, FileDropzone, Input, Textarea, useToast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatBytes, formatDateTime, formatMinutes, timeAgo } from '@/lib/format';
import type { ChamadoDetalhe } from '@/types';
import { useComentar, useUploadAnexo, useWorklog } from '../hooks/use-chamados';

export function FollowupsTab({ chamado }: { chamado: ChamadoDetalhe }) {
  const [texto, setTexto] = useState('');
  const [interno, setInterno] = useState(false);
  const comentar = useComentar(chamado.id);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    comentar.mutate({ conteudo: texto.trim(), interno }, { onSuccess: () => { setTexto(''); setInterno(false); } });
  }

  const itens = [...chamado.comentarios].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="flex gap-3">
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-brand-muted sm:flex">
          <UserRound className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <Textarea placeholder="Digite um novo comentário ou nota técnica..." value={texto} onChange={(e) => setTexto(e.target.value)} className={cn(interno && 'border-amber-300 bg-amber-50/40')} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Checkbox label="Visível apenas internamente (Nota Técnica)" checked={interno} onChange={(e) => setInterno(e.target.checked)} className="text-brand-muted" />
            <Button type="submit" variant="dark" loading={comentar.isPending} disabled={!texto.trim()}>
              Enviar Comentário
            </Button>
          </div>
        </div>
      </form>

      <ol className="relative space-y-4 border-t border-brand-border pt-6">
        {itens.length === 0 && <EmptyState title="Nenhum follow-up ainda" description="Os comentários e notas técnicas aparecerão aqui." />}
        {itens.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar name={c.autorNome} size="md" />
            <div className={cn('flex-1 rounded-lg border p-4', c.interno ? 'border-amber-200 bg-amber-50/60' : 'border-brand-border bg-white')}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-brand-darker">
                  {c.autorNome} <span className="text-xs font-normal text-brand-muted">({c.autorPapel})</span>
                </p>
                <span className="text-xs text-brand-muted" title={formatDateTime(c.criadoEm)}>
                  {timeAgo(c.criadoEm)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{c.conteudo}</p>
              {c.interno && (
                <Badge tone="pendente" className="mt-3">
                  <Lock className="h-3 w-3" /> Comentário interno
                </Badge>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function WorklogsTab({ chamado }: { chamado: ChamadoDetalhe }) {
  const [descricao, setDescricao] = useState('');
  const [minutos, setMinutos] = useState('30');
  const worklog = useWorklog(chamado.id);
  const total = chamado.worklogs.reduce((s, w) => s + w.minutos, 0);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const m = Number(minutos);
    if (!descricao.trim() || !m || m <= 0) return;
    worklog.mutate({ descricao: descricao.trim(), minutos: m }, { onSuccess: () => setDescricao('') });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
        <Field label="Atividade realizada">{(id) => <Input id={id} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Análise de logs do servidor" />}</Field>
        <Field label="Minutos">{(id) => <Input id={id} type="number" min={1} value={minutos} onChange={(e) => setMinutos(e.target.value)} />}</Field>
        <Button type="submit" variant="dark" loading={worklog.isPending}>
          Registrar
        </Button>
      </form>
      <div className="flex items-center justify-between rounded-md bg-slate-50 px-4 py-3 text-sm">
        <span className="text-brand-muted">Tempo total apontado</span>
        <strong className="text-brand-darker">{formatMinutes(total)}</strong>
      </div>
      {chamado.worklogs.length === 0 ? (
        <EmptyState icon={<Clock className="h-8 w-8" />} title="Nenhum worklog registrado" />
      ) : (
        <ul className="divide-y divide-brand-border">
          {chamado.worklogs.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-brand-darker">{w.descricao}</p>
                <p className="text-xs text-brand-muted">
                  {w.tecnicoNome} · {formatDateTime(w.realizadoEm)}
                </p>
              </div>
              <Badge tone="primary">{formatMinutes(w.minutos)}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AnexosTab({ chamado }: { chamado: ChamadoDetalhe }) {
  const [files, setFiles] = useState<File[]>([]);
  const upload = useUploadAnexo(chamado.id);
  const toast = useToast();

  async function enviar() {
    await Promise.all(files.map((f) => upload.mutateAsync(f)));
    setFiles([]);
  }

  return (
    <div className="space-y-5">
      <FileDropzone files={files} onChange={setFiles} onError={toast.error} />
      {files.length > 0 && (
        <Button onClick={enviar} loading={upload.isPending} icon={<Paperclip className="h-4 w-4" />}>
          Enviar {files.length} arquivo(s)
        </Button>
      )}
      <ul className="divide-y divide-brand-border">
        {chamado.anexos.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <FileText className="h-5 w-5 text-brand-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-brand-darker">{a.nomeArquivo}</p>
              <p className="text-xs text-brand-muted">
                {formatBytes(a.tamanhoBytes)} · {a.enviadoPor} · {formatDateTime(a.criadoEm)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {chamado.anexos.length === 0 && !files.length && <p className="text-center text-sm text-brand-muted">Nenhum anexo neste chamado.</p>}
    </div>
  );
}

export function HistoricoTab({ chamado }: { chamado: ChamadoDetalhe }) {
  const eventos = [...chamado.historico].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  return (
    <ol className="relative ml-3 space-y-5 border-l border-brand-border pl-6">
      {eventos.map((h) => (
        <li key={h.id} className="relative">
          <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-brand-accent">
            <History className="h-2.5 w-2.5 text-brand-accent" />
          </span>
          <p className="text-sm font-medium text-brand-darker">{h.descricao}</p>
          <p className="text-xs text-brand-muted">
            {h.autor} · {formatDateTime(h.criadoEm)}
          </p>
        </li>
      ))}
    </ol>
  );
}
