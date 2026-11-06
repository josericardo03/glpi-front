'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import { BookmarkPlus, Clock, Download, FileText, History, Lock, Paperclip, Trash2, UserRound, X } from 'lucide-react';
import { Avatar, Badge, Button, Checkbox, EmptyState, Field, FileDropzone, Input, Select, Textarea, useToast } from '@/components/ui';
import { TextoComLinks } from '@/components/ui/texto-com-links';
import { getErrorMessage } from '@/lib/api';
import { downloadBlob } from '@/lib/csv';
import { cn } from '@/lib/utils';
import { formatBytes, formatDateTime, formatMinutes, plural, timeAgo } from '@/lib/format';
import type { Anexo, ChamadoDetalhe } from '@/types';
import { useAuth } from '@/features/auth/auth-provider';
import { useComentarComAnexos, useUploadAnexo, useWorklog } from '../hooks/use-chamados';
import { chamadosService } from '../services/chamados.service';
import { ANEXO_EXTENSOES, ANEXO_MAX_BYTES, ANEXO_MAX_MB } from '../utils/anexos';
import {
  carregarRespostasPropias,
  RESPOSTAS_PADRAO,
  salvarRespostasPropias,
  tituloDaResposta,
  type RespostaPronta,
} from '../utils/respostas-prontas';

const NOTA_MAX = 5000;

/** Print colado não tem nome: gera um, com a extensão do tipo da imagem. */
function nomeDaCaptura(file: File) {
  if (file.name && file.name !== 'image.png') return file;
  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const agora = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const nome = `captura-${agora.getFullYear()}${p(agora.getMonth() + 1)}${p(agora.getDate())}-${p(agora.getHours())}${p(agora.getMinutes())}${p(agora.getSeconds())}.${ext}`;
  return new File([file], nome, { type: file.type });
}

export function FollowupsTab({ chamado }: { chamado: ChamadoDetalhe }) {
  const [texto, setTexto] = useState('');
  const [interno, setInterno] = useState(false);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [proprias, setProprias] = useState<RespostaPronta[]>([]);
  const [respostaId, setRespostaId] = useState('');
  const [baixando, setBaixando] = useState<number | null>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const seletor = useRef<HTMLInputElement>(null);
  const comentar = useComentarComAnexos(chamado.id);
  const toast = useToast();
  const { hasRole, user } = useAuth();
  const podeNotaInterna = hasRole('TECNICO');

  useEffect(() => {
    if (user && podeNotaInterna) setProprias(carregarRespostasPropias(user.id));
  }, [user, podeNotaInterna]);

  const respostas = [...RESPOSTAS_PADRAO, ...proprias];
  const respostaSelecionada = respostas.find((r) => r.id === respostaId);

  function adicionarArquivos(novos: File[]) {
    const aceitos: File[] = [];
    for (const original of novos) {
      const arquivo = nomeDaCaptura(original);
      const ext = `.${arquivo.name.split('.').pop()?.toLowerCase()}`;
      if (!ANEXO_EXTENSOES.includes(ext)) toast.error(`Formato não permitido: ${arquivo.name}`);
      else if (arquivo.size > ANEXO_MAX_BYTES) toast.error(`${arquivo.name} excede o limite de ${ANEXO_MAX_MB} MB.`);
      else if (!arquivos.some((f) => f.name === arquivo.name && f.size === arquivo.size)) aceitos.push(arquivo);
    }
    if (aceitos.length) setArquivos((atual) => [...atual, ...aceitos]);
  }

  /** Imagens coladas (Ctrl+V) viram anexos do comentário; texto colado segue o fluxo normal. */
  function aoColar(e: ClipboardEvent<HTMLTextAreaElement>) {
    const imagens = [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'));
    if (!imagens.length) return;
    e.preventDefault();
    adicionarArquivos(imagens);
  }

  function inserirResposta(id: string) {
    setRespostaId(id);
    const resposta = respostas.find((r) => r.id === id);
    if (!resposta) return;
    setTexto((atual) => (atual.trim() ? `${atual.replace(/\s+$/, '')}\n\n${resposta.texto}` : resposta.texto).slice(0, NOTA_MAX));
    campo.current?.focus();
  }

  function salvarComoResposta() {
    const conteudo = texto.trim();
    if (!conteudo || !user) return;
    const nova: RespostaPronta = { id: `propria-${Date.now()}`, titulo: tituloDaResposta(conteudo), texto: conteudo, propria: true };
    const lista = [...proprias, nova];
    if (!salvarRespostasPropias(user.id, lista)) return toast.error('Não foi possível salvar neste navegador.');
    setProprias(lista);
    toast.success('Resposta pronta salva neste navegador.');
  }

  function removerResposta() {
    if (!user || !respostaSelecionada?.propria) return;
    const lista = proprias.filter((r) => r.id !== respostaSelecionada.id);
    salvarRespostasPropias(user.id, lista);
    setProprias(lista);
    setRespostaId('');
  }

  function enviar() {
    if (!texto.trim() || comentar.isPending) return;
    comentar.mutate(
      { conteudo: texto.trim(), interno: podeNotaInterna && interno, arquivos },
      {
        onSuccess: () => {
          setTexto('');
          setInterno(false);
          setArquivos([]);
          setRespostaId('');
        },
      },
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    enviar();
  }

  async function baixar(anexo: Anexo) {
    setBaixando(anexo.id);
    try {
      downloadBlob(await chamadosService.baixarAnexo(anexo), anexo.nomeArquivo);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBaixando(null);
    }
  }

  const itens = [...chamado.comentarios].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="flex gap-3">
        <span aria-hidden className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-brand-muted sm:flex">
          <UserRound className="h-5 w-5" />
        </span>
        <div className="flex-1">
          {podeNotaInterna && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="min-w-[200px] flex-1 sm:max-w-xs">
                <Select
                  aria-label="Inserir resposta pronta"
                  placeholder="Inserir resposta pronta..."
                  options={respostas.map((r) => ({ value: r.id, label: r.propria ? `${r.titulo} (minha)` : r.titulo }))}
                  value={respostaId}
                  onChange={(e) => inserirResposta(e.target.value)}
                />
              </div>
              {respostaSelecionada?.propria && (
                <Button type="button" variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={removerResposta}>
                  Remover
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" icon={<BookmarkPlus className="h-4 w-4" />} disabled={!texto.trim()} onClick={salvarComoResposta}>
                Salvar como resposta pronta
              </Button>
            </div>
          )}
          <Textarea
            ref={campo}
            aria-label="Novo comentário"
            placeholder={podeNotaInterna ? 'Digite um novo comentário ou nota técnica... (cole um print com Ctrl+V)' : 'Digite um novo comentário... (cole um print com Ctrl+V)'}
            value={texto}
            maxLength={NOTA_MAX}
            onChange={(e) => setTexto(e.target.value)}
            onPaste={aoColar}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                enviar();
              }
            }}
            className={cn(interno && 'border-amber-300 bg-amber-50/40')}
          />
          <div className="mt-1 flex justify-between text-[11px] text-brand-muted">
            <span>Ctrl+Enter envia</span>
            <span aria-live="polite">
              {texto.length}/{NOTA_MAX}
            </span>
          </div>
          {arquivos.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {arquivos.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md border border-brand-border bg-slate-50 px-2.5 py-1 text-xs">
                  <Paperclip className="h-3.5 w-3.5 text-brand-primary" aria-hidden />
                  <span className="max-w-[200px] truncate text-brand-darker">{f.name}</span>
                  <span className="text-brand-muted">{formatBytes(f.size)}</span>
                  <button type="button" onClick={() => setArquivos(arquivos.filter((_, j) => j !== i))} className="text-brand-muted hover:text-status-critica" aria-label={`Remover ${f.name}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              {podeNotaInterna && <Checkbox label="Visível apenas internamente (Nota Técnica)" checked={interno} onChange={(e) => setInterno(e.target.checked)} className="text-brand-muted" />}
              <input
                ref={seletor}
                type="file"
                multiple
                hidden
                tabIndex={-1}
                aria-hidden
                accept={ANEXO_EXTENSOES.join(',')}
                onChange={(e) => {
                  adicionarArquivos([...(e.target.files ?? [])]);
                  e.target.value = '';
                }}
              />
              <Button type="button" variant="ghost" size="sm" icon={<Paperclip className="h-4 w-4" />} onClick={() => seletor.current?.click()}>
                Anexar arquivo
              </Button>
            </div>
            <Button type="submit" variant="dark" loading={comentar.isPending} disabled={!texto.trim()}>
              Enviar Comentário
            </Button>
          </div>
        </div>
      </form>

      <ol className="relative space-y-4 border-t border-brand-border pt-6">
        {itens.length === 0 && <EmptyState title="Nenhum follow-up ainda" description="Os comentários e notas técnicas aparecerão aqui." />}
        {itens.map((c) => {
          const anexos = chamado.anexos.filter((a) => a.comentarioId === c.id);
          return (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.autorNome} size="md" />
              <div className={cn('min-w-0 flex-1 rounded-lg border p-4', c.interno ? 'border-amber-200 bg-amber-50/60' : 'border-brand-border bg-white')}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-brand-darker">
                    {c.autorNome} {c.autorPapel && <span className="text-xs font-normal text-brand-muted">({c.autorPapel})</span>}
                  </p>
                  <span className="text-xs text-brand-muted" title={formatDateTime(c.criadoEm)}>
                    {timeAgo(c.criadoEm)}
                  </span>
                </div>
                <TextoComLinks texto={c.conteudo} className="mt-2 text-sm text-slate-700" />
                {anexos.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {anexos.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => baixar(a)}
                          disabled={baixando === a.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-brand-border bg-white px-2.5 py-1 text-xs text-brand-darker hover:border-brand-accent disabled:opacity-60"
                        >
                          <Download className="h-3.5 w-3.5 text-brand-primary" aria-hidden />
                          {a.nomeArquivo}
                          <span className="text-brand-muted">({formatBytes(a.tamanhoBytes)})</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {c.interno && (
                  <Badge tone="pendente" className="mt-3">
                    <Lock className="h-3 w-3" /> Comentário interno
                  </Badge>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function WorklogsTab({ chamado }: { chamado: ChamadoDetalhe }) {
  const [descricao, setDescricao] = useState('');
  const [minutos, setMinutos] = useState('30');
  const worklog = useWorklog(chamado.id);
  const total = chamado.worklogs.reduce((s, w) => s + w.minutos, 0);

  const m = Number(minutos);
  const valido = descricao.trim().length >= 3 && Number.isInteger(m) && m >= 1 && m <= 1440;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    worklog.mutate({ descricao: descricao.trim(), minutos: m }, { onSuccess: () => setDescricao('') });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-start">
        <Field label="Atividade realizada" hint="Mínimo de 3 caracteres.">
          {(id) => <Input id={id} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Análise de logs do servidor" />}
        </Field>
        <Field label="Minutos" hint="1 a 1440.">
          {(id) => <Input id={id} type="number" min={1} max={1440} step={1} value={minutos} onChange={(e) => setMinutos(e.target.value)} />}
        </Field>
        <Button type="submit" variant="dark" className="sm:mt-6" loading={worklog.isPending} disabled={!valido}>
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
  const [baixando, setBaixando] = useState<number | null>(null);

  async function enviar() {
    const r = await Promise.allSettled(files.map((f) => upload.mutateAsync(f)));
    setFiles(files.filter((_, i) => r[i]!.status === 'rejected'));
  }

  async function baixar(anexo: Anexo) {
    setBaixando(anexo.id);
    try {
      downloadBlob(await chamadosService.baixarAnexo(anexo), anexo.nomeArquivo);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBaixando(null);
    }
  }

  return (
    <div className="space-y-5">
      <FileDropzone files={files} onChange={setFiles} accept={ANEXO_EXTENSOES} maxSizeMb={ANEXO_MAX_MB} onError={toast.error} />
      {files.length > 0 && (
        <Button onClick={enviar} loading={upload.isPending} icon={<Paperclip className="h-4 w-4" />}>
          Enviar {plural(files.length, 'arquivo', 'arquivos')}
        </Button>
      )}
      <ul className="divide-y divide-brand-border">
        {chamado.anexos.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <FileText className="h-5 w-5 text-brand-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-brand-darker">{a.nomeArquivo}</p>
              <p className="text-xs text-brand-muted">
                {formatBytes(a.tamanhoBytes)} · {formatDateTime(a.criadoEm)}
              </p>
            </div>
            <Button variant="ghost" size="sm" icon={<Download className="h-4 w-4" />} loading={baixando === a.id} onClick={() => baixar(a)}>
              Baixar
            </Button>
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
