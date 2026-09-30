'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { UserPlus, UsersRound } from 'lucide-react';
import {
  AvatarGroup,
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  Progress,
  Select,
  Skeleton,
  StatCard,
  Textarea,
  UserCell,
  loadTone,
  type Column,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { recursos } from '@/lib/recursos';
import { cn } from '@/lib/utils';
import { textoInvalido } from '@/lib/validation';
import type { GrupoInput, MembroGrupo } from '@/types';
import { useAddMembro, useCreateGrupo, useGrupos, useTecnicos } from '../use-cadastros';

const membroColumns: Column<MembroGrupo>[] = [
  { key: 'tec', header: 'Técnico', cell: (m) => <UserCell name={m.nome} subtitle={m.email} src={m.avatarUrl} /> },
  { key: 'cargo', header: 'Cargo / Especialidade', cell: (m) => <span className="text-sm">{m.cargo || '—'}</span> },
  {
    key: 'carga',
    header: 'Carga de Trabalho',
    cell: (m) => (
      <div className="flex items-center gap-2">
        <Progress value={m.cargaTrabalho} tone={loadTone(m.cargaTrabalho)} className="w-24" />
        <span className={cn('text-xs', m.cargaTrabalho >= 85 ? 'font-bold text-status-critica' : 'text-brand-muted')}>{m.cargaTrabalho}%</span>
      </div>
    ),
  },
];

const GRUPO_VAZIO: GrupoInput = { nome: '', descricao: '', status: 'ATIVO' };
const MEMBRO_VAZIO = { usuarioId: '', especialidade: '' };

export function GruposView() {
  const { data, isLoading, isError, error, refetch } = useGrupos();
  const { data: tecnicos, isLoading: loadingTecnicos } = useTecnicos();
  const createGrupo = useCreateGrupo();
  const addMembro = useAddMembro();
  const [selId, setSelId] = useState<number | null>(null);
  const [grupoOpen, setGrupoOpen] = useState(false);
  const [membroOpen, setMembroOpen] = useState(false);
  const [grupoForm, setGrupoForm] = useState<GrupoInput>(GRUPO_VAZIO);
  const [membroForm, setMembroForm] = useState(MEMBRO_VAZIO);

  const sel = data?.find((g) => g.id === selId) ?? data?.[0];
  const erroNome = grupoForm.nome ? textoInvalido(grupoForm.nome, { rotulo: 'O nome' }) : undefined;

  const tecnicosDisponiveis = useMemo(
    () =>
      (tecnicos ?? [])
        .filter((t) => !sel?.membros.some((m) => m.usuarioId === t.id))
        .map((t) => ({ value: t.id, label: t.nivel ? `${t.nome} · ${t.nivel}` : t.nome }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [tecnicos, sel],
  );

  function fecharGrupo() {
    setGrupoOpen(false);
    setGrupoForm(GRUPO_VAZIO);
  }

  function fecharMembro() {
    setMembroOpen(false);
    setMembroForm(MEMBRO_VAZIO);
  }

  function onCreateGrupo(e: FormEvent) {
    e.preventDefault();
    if (textoInvalido(grupoForm.nome)) return;
    createGrupo.mutate(
      { ...grupoForm, nome: grupoForm.nome.trim(), descricao: grupoForm.descricao.trim() },
      {
        onSuccess: (g) => {
          fecharGrupo();
          setSelId(g.id);
        },
      },
    );
  }

  function onAddMembro(e: FormEvent) {
    e.preventDefault();
    if (!sel || !membroForm.usuarioId) return;
    addMembro.mutate({ grupoId: sel.id, usuarioId: Number(membroForm.usuarioId), especialidade: membroForm.especialidade }, { onSuccess: fecharMembro });
  }

  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Gestão de Grupos"
        description="Equipes técnicas responsáveis pelo atendimento."
        actions={
          <Button size="lg" icon={<UsersRound className="h-4 w-4" />} onClick={() => setGrupoOpen(true)}>
            Criar Novo Grupo
          </Button>
        }
      />

      <div className="mb-6 grid max-w-xl grid-cols-2 gap-4">
        <StatCard label="Total de Grupos" value={data?.length} loading={isLoading} />
        <StatCard label="Técnicos Ativos" value={tecnicos?.length} loading={loadingTecnicos} />
      </div>

      {!recursos.membrosGrupo && (
        <Callout tone="info" className="mb-6">
          A API ainda não disponibiliza a listagem de membros das equipes. É possível adicionar técnicos aos grupos, mas a composição atual não é exibida aqui.
        </Callout>
      )}

      {!isLoading && !data?.length ? (
        <EmptyState
          title="Nenhum grupo cadastrado"
          description="Crie a primeira equipe técnica para organizar o atendimento."
          action={<Button onClick={() => setGrupoOpen(true)}>Criar Novo Grupo</Button>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <section aria-labelledby="titulo-equipes">
            <h2 id="titulo-equipes" className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-muted">
              Equipes de TI
            </h2>
            <div className="space-y-3">
              {isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)}
              {data?.map((g) => {
                const active = g.id === sel?.id;
                const inativo = g.status === 'INATIVO';
                return (
                  <button key={g.id} type="button" onClick={() => setSelId(g.id)} aria-pressed={active} className="block w-full rounded-xl text-left">
                    <Card className={cn('transition', active ? 'ring-2 ring-brand-primary' : 'hover:border-brand-accent', inativo && 'opacity-60')}>
                      <CardBody className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('font-semibold text-brand-darker', inativo && 'italic')}>{g.nome}</p>
                          <Badge tone={inativo ? 'neutral' : 'success'} dot>
                            {inativo ? 'Inativo' : 'Ativo'}
                          </Badge>
                        </div>
                        {g.descricao && <p className="mt-1 line-clamp-2 text-xs text-brand-muted">{g.descricao}</p>}
                        {recursos.membrosGrupo && (
                          <div className="mt-3 flex items-center justify-between">
                            <AvatarGroup names={g.membros.map((m) => m.nome)} size="xs" />
                            <span className="text-xs text-brand-muted">
                              {g.membros.length} {g.membros.length === 1 ? 'técnico' : 'técnicos'}
                            </span>
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  </button>
                );
              })}
            </div>
          </section>

          {sel && (
            <Card className="h-fit overflow-hidden">
              <CardBody>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-brand-darker">{sel.nome}</h2>
                  <Badge tone={sel.status === 'ATIVO' ? 'success' : 'neutral'}>{sel.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</Badge>
                </div>
                {sel.descricao && <p className="mt-2 text-sm text-brand-muted">{sel.descricao}</p>}
              </CardBody>
              <div className="flex items-center justify-between border-y border-brand-border bg-slate-50 px-5 py-3">
                <p className="font-semibold text-brand-darker">{recursos.membrosGrupo ? `Membros (${sel.membros.length})` : 'Membros'}</p>
                <Button size="sm" variant="dark" icon={<UserPlus className="h-4 w-4" />} onClick={() => setMembroOpen(true)} disabled={sel.status === 'INATIVO'}>
                  Adicionar Técnico
                </Button>
              </div>
              {recursos.membrosGrupo ? (
                <DataTable
                  columns={membroColumns}
                  data={sel.membros}
                  rowKey={(m) => m.id}
                  caption={`Membros de ${sel.nome}`}
                  className="rounded-none border-0 shadow-none"
                  emptyMessage="Nenhum técnico neste grupo."
                />
              ) : (
                <p className="px-5 py-8 text-center text-sm text-brand-muted">Composição da equipe indisponível na API atual.</p>
              )}
            </Card>
          )}
        </div>
      )}

      <Modal
        open={grupoOpen}
        onClose={fecharGrupo}
        title="Criar Novo Grupo"
        footer={
          <>
            <Button variant="outline" onClick={fecharGrupo}>Cancelar</Button>
            <Button type="submit" form="form-grupo" disabled={!!textoInvalido(grupoForm.nome)} loading={createGrupo.isPending}>
              Criar
            </Button>
          </>
        }
      >
        <form id="form-grupo" onSubmit={onCreateGrupo} noValidate className="space-y-4">
          <Field label="Nome" required error={erroNome}>
            {(id) => <Input id={id} maxLength={100} value={grupoForm.nome} onChange={(e) => setGrupoForm({ ...grupoForm, nome: e.target.value })} />}
          </Field>
          <Field label="Descrição">
            {(id) => <Textarea id={id} value={grupoForm.descricao} onChange={(e) => setGrupoForm({ ...grupoForm, descricao: e.target.value })} />}
          </Field>
        </form>
      </Modal>

      <Modal
        open={membroOpen}
        onClose={fecharMembro}
        title="Adicionar Técnico"
        description={sel?.nome}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={fecharMembro}>Cancelar</Button>
            <Button type="submit" form="form-membro" disabled={!membroForm.usuarioId} loading={addMembro.isPending}>
              Adicionar
            </Button>
          </>
        }
      >
        <form id="form-membro" onSubmit={onAddMembro} className="space-y-4">
          <Field label="Técnico" required hint={tecnicosDisponiveis.length ? undefined : 'Nenhum técnico disponível.'}>
            {(id) => (
              <Select
                id={id}
                placeholder="Selecione..."
                options={tecnicosDisponiveis}
                value={membroForm.usuarioId}
                onChange={(e) => setMembroForm({ ...membroForm, usuarioId: e.target.value })}
              />
            )}
          </Field>
          <Field label="Especialidade na equipe" hint="Opcional. Ex.: Redes, Banco de Dados, N2.">
            {(id) => <Input id={id} maxLength={100} value={membroForm.especialidade} onChange={(e) => setMembroForm({ ...membroForm, especialidade: e.target.value })} />}
          </Field>
        </form>
      </Modal>
    </>
  );
}
