'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { UserPlus, UsersRound } from 'lucide-react';
import {
  AvatarGroup,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  DataTable,
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
import { cn } from '@/lib/utils';
import type { GrupoInput, MembroGrupo } from '@/types';
import { useAddMembro, useCreateGrupo, useGrupos, useUsuarios } from '../use-cadastros';

const membroColumns: Column<MembroGrupo>[] = [
  { key: 'tec', header: 'Técnico', cell: (m) => <UserCell name={m.nome} subtitle={m.email} src={m.avatarUrl} /> },
  { key: 'cargo', header: 'Cargo / Especialidade', cell: (m) => <span className="text-sm">{m.cargo}</span> },
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

export function GruposView() {
  const { data, isLoading, isError, error, refetch } = useGrupos();
  const { data: usuarios } = useUsuarios({ page: 1, pageSize: 500 });
  const createGrupo = useCreateGrupo();
  const addMembro = useAddMembro();
  const [selId, setSelId] = useState<number | null>(null);
  const [grupoOpen, setGrupoOpen] = useState(false);
  const [membroOpen, setMembroOpen] = useState(false);
  const [grupoForm, setGrupoForm] = useState<GrupoInput>({ nome: '', descricao: '', status: 'ATIVO' });
  const [membroForm, setMembroForm] = useState({ usuarioId: '', carga: 50 });

  useEffect(() => {
    if (!selId && data?.length) setSelId(data[0]!.id);
  }, [data, selId]);

  const sel = data?.find((g) => g.id === selId);
  const tecnicosDisponiveis = useMemo(
    () =>
      (usuarios?.data ?? [])
        .filter((u) => u.papeis.includes('TECNICO') && u.status === 'ATIVO' && !sel?.membros.some((m) => m.usuarioId === u.id))
        .map((u) => ({ value: u.id, label: u.nome })),
    [usuarios, sel],
  );

  function onCreateGrupo(e: FormEvent) {
    e.preventDefault();
    createGrupo.mutate(grupoForm, {
      onSuccess: (g) => {
        setGrupoOpen(false);
        setSelId(g.id);
        setGrupoForm({ nome: '', descricao: '', status: 'ATIVO' });
      },
    });
  }

  function onAddMembro(e: FormEvent) {
    e.preventDefault();
    if (!sel) return;
    addMembro.mutate(
      { grupoId: sel.id, usuarioId: Number(membroForm.usuarioId), cargaTrabalho: Math.min(100, Math.max(0, membroForm.carga)) },
      { onSuccess: () => { setMembroOpen(false); setMembroForm({ usuarioId: '', carga: 50 }); } },
    );
  }

  const totalTecnicos = new Set(data?.flatMap((g) => g.membros.map((m) => m.usuarioId))).size;

  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Gestão de Grupos"
        description="Times técnicos e distribuição de carga de trabalho."
        actions={<Button size="lg" icon={<UsersRound className="h-4 w-4" />} onClick={() => setGrupoOpen(true)}>Criar Novo Grupo</Button>}
      />

      <div className="mb-6 grid max-w-xl grid-cols-2 gap-4">
        <StatCard label="Total de Grupos" value={data?.length} loading={isLoading} />
        <StatCard label="Técnicos Ativos" value={totalTecnicos} loading={isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-muted">Equipes de TI</p>
          <div className="space-y-3">
            {isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)}
            {data?.map((g) => {
              const active = g.id === selId;
              const inativo = g.status === 'INATIVO';
              return (
                <button key={g.id} onClick={() => setSelId(g.id)} className="block w-full text-left">
                  <Card className={cn('transition', active ? 'ring-2 ring-brand-primary' : 'hover:border-brand-accent', inativo && 'opacity-60')}>
                    <CardBody className="p-4">
                      <div className="flex items-start justify-between">
                        <p className={cn('font-semibold text-brand-darker', inativo && 'italic')}>{g.nome}</p>
                        {!inativo && <Badge tone="success" dot>Ativo</Badge>}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-brand-muted">{g.descricao}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <AvatarGroup names={g.membros.map((m) => m.nome)} size="xs" />
                        <span className="text-xs text-brand-muted">{g.membros.length} Técnicos</span>
                      </div>
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
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-brand-darker">{sel.nome}</h2>
                <Badge tone={sel.status === 'ATIVO' ? 'success' : 'neutral'}>Status: {sel.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</Badge>
              </div>
              <p className="mt-2 text-sm text-brand-muted">{sel.descricao}</p>
            </CardBody>
            <div className="flex items-center justify-between border-y border-brand-border bg-slate-50 px-5 py-3">
              <p className="font-semibold text-brand-darker">Gerenciar Membros ({sel.membros.length})</p>
              <Button size="sm" variant="dark" icon={<UserPlus className="h-4 w-4" />} onClick={() => setMembroOpen(true)}>Adicionar Técnico</Button>
            </div>
            <DataTable columns={membroColumns} data={sel.membros} rowKey={(m) => m.id} className="rounded-none border-0 shadow-none" emptyMessage="Nenhum técnico neste grupo." />
            <CardFooter>
              <p className="text-xs italic text-brand-muted">A carga de trabalho aceita valores entre 0% e 100%.</p>
            </CardFooter>
          </Card>
        )}
      </div>

      <Modal
        open={grupoOpen}
        onClose={() => setGrupoOpen(false)}
        title="Criar Novo Grupo"
        footer={
          <>
            <Button variant="outline" onClick={() => setGrupoOpen(false)}>Cancelar</Button>
            <Button type="submit" form="form-grupo" disabled={!grupoForm.nome.trim()} loading={createGrupo.isPending}>Criar</Button>
          </>
        }
      >
        <form id="form-grupo" onSubmit={onCreateGrupo} className="space-y-4">
          <Field label="Nome" required>{(id) => <Input id={id} value={grupoForm.nome} onChange={(e) => setGrupoForm({ ...grupoForm, nome: e.target.value })} />}</Field>
          <Field label="Descrição">{(id) => <Textarea id={id} value={grupoForm.descricao} onChange={(e) => setGrupoForm({ ...grupoForm, descricao: e.target.value })} />}</Field>
        </form>
      </Modal>

      <Modal
        open={membroOpen}
        onClose={() => setMembroOpen(false)}
        title="Adicionar Técnico"
        description={sel?.nome}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setMembroOpen(false)}>Cancelar</Button>
            <Button type="submit" form="form-membro" disabled={!membroForm.usuarioId} loading={addMembro.isPending}>Adicionar</Button>
          </>
        }
      >
        <form id="form-membro" onSubmit={onAddMembro} className="space-y-4">
          <Field label="Técnico" required>{(id) => <Select id={id} placeholder="Selecione..." options={tecnicosDisponiveis} value={membroForm.usuarioId} onChange={(e) => setMembroForm({ ...membroForm, usuarioId: e.target.value })} />}</Field>
          <Field label={`Carga de trabalho: ${membroForm.carga}%`}>
            {(id) => <input id={id} type="range" min={0} max={100} step={5} value={membroForm.carga} onChange={(e) => setMembroForm({ ...membroForm, carga: Number(e.target.value) })} className="w-full accent-brand-primary" />}
          </Field>
        </form>
      </Modal>
    </>
  );
}
