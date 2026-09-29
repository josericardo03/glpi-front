'use client';

import { memo, useState, type FormEvent } from 'react';
import { Activity, CheckCircle2, KeyRound, Mail, Plug, PlugZap, Plus, Server, Webhook, XCircle } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  Skeleton,
  StatCard,
  Switch,
  ToggleGroup,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Integracao, IntegracaoInput, TipoIntegracao } from '@/types';
import { useCreateIntegracao, useIntegracoes, useTestarIntegracao } from '../use-admin';

const TIPOS: Record<TipoIntegracao, { label: string; icon: typeof Mail; porta: number; desc: string }> = {
  LDAP: { label: 'LDAP / AD', icon: KeyRound, porta: 636, desc: 'Autenticação e sincronização de usuários' },
  SMTP: { label: 'SMTP', icon: Mail, porta: 587, desc: 'Envio de e-mails e notificações' },
  WEBHOOK: { label: 'Webhook', icon: Webhook, porta: 443, desc: 'Eventos para sistemas externos' },
};

const EMPTY: IntegracaoInput = { nome: '', tipo: 'LDAP', host: '', porta: 636, ativo: true };

const IntegracaoCard = memo(function IntegracaoCard({ i }: { i: Integracao }) {
  const { mutate: testar, data: result, isPending: testing } = useTestarIntegracao();
  const tipo = TIPOS[i.tipo];
  const Icon = tipo.icon;
  return (
    <Card className="flex flex-col">
      <CardBody className="flex-1 space-y-4">
        <div className="flex items-start gap-3">
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', i.ativo ? 'bg-brand-primary/10 text-brand-primary' : 'bg-slate-100 text-brand-muted')}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-brand-darker">{i.nome}</p>
            <p className="text-xs text-brand-muted">{tipo.desc}</p>
          </div>
          <Badge tone={i.ativo ? 'success' : 'neutral'} dot>{i.ativo ? 'Ativo' : 'Inativo'}</Badge>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-brand-bg px-3 py-2 font-mono text-xs text-brand-darker">
          <Server className="h-3.5 w-3.5 text-brand-muted" /> {i.host}:{i.porta}
        </div>
        {result ? (
          <div className={cn('flex items-start gap-2 rounded-md p-3 text-xs', result.sucesso ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800')}>
            {result.sucesso ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            <span>
              {result.mensagem}
              {result.sucesso && <strong className="ml-1">({result.latenciaMs} ms)</strong>}
            </span>
          </div>
        ) : (
          <p className="text-xs text-brand-muted">
            {i.ultimoTeste ? (
              <>
                Último teste {timeAgo(i.ultimoTeste)} ·{' '}
                <span className={i.ultimoResultado === 'SUCESSO' ? 'font-semibold text-status-resolvido' : 'font-semibold text-status-critica'}>
                  {i.ultimoResultado === 'SUCESSO' ? `Sucesso${i.latenciaMs ? ` (${i.latenciaMs} ms)` : ''}` : 'Falha'}
                </span>
              </>
            ) : (
              'Conector ainda não testado.'
            )}
          </p>
        )}
      </CardBody>
      <CardFooter className="justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">{tipo.label}</span>
        <Button size="sm" variant="outline" icon={<PlugZap className="h-4 w-4" />} loading={testing} onClick={() => testar(i.id)}>Testar Conexão</Button>
      </CardFooter>
    </Card>
  );
});

export function IntegracoesView() {
  const { data, isLoading, isError, error, refetch } = useIntegracoes();
  const create = useCreateIntegracao();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<IntegracaoInput>(EMPTY);

  const lista = data ?? [];
  const falhas = lista.filter((i) => i.ultimoResultado === 'FALHA').length;
  const latencias = lista.map((i) => i.latenciaMs).filter((l): l is number => l !== null);
  const latenciaMedia = latencias.length ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length) : null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate(form, { onSuccess: () => { setOpen(false); setForm(EMPTY); } });
  }

  const portaValida = form.porta >= 1 && form.porta <= 65535;

  return (
    <>
      <PageHeader
        title="Integrações"
        description="Conecte o portal ao diretório corporativo, servidor de e-mail e sistemas externos."
        breadcrumbs={[{ label: 'Administração' }, { label: 'Integrações' }]}
        actions={<Button size="lg" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Novo Conector</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Conectores" value={lista.length} icon={<Plug className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Ativos" value={lista.filter((i) => i.ativo).length} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" loading={isLoading} />
        <StatCard label="Falhas no Último Teste" value={falhas} icon={<XCircle className="h-5 w-5" />} tone={falhas ? 'danger' : 'default'} loading={isLoading} />
        <StatCard label="Latência Média" value={latenciaMedia !== null ? `${latenciaMedia} ms` : '—'} icon={<Activity className="h-5 w-5" />} tone="dark" loading={isLoading} />
      </div>

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      ) : lista.length === 0 ? (
        <EmptyState title="Nenhum conector configurado" description="Cadastre LDAP, SMTP ou Webhooks para integrar o portal." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((i) => (
            <IntegracaoCard key={i.id} i={i} />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo Conector"
        description="O teste de conectividade TCP pode ser executado após o cadastro."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" form="form-integracao" disabled={!form.nome.trim() || !form.host.trim() || !portaValida} loading={create.isPending}>Salvar</Button>
          </>
        }
      >
        <form id="form-integracao" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Tipo</p>
            <ToggleGroup
              value={form.tipo}
              onChange={(tipo) => setForm({ ...form, tipo, porta: TIPOS[tipo].porta })}
              options={(Object.keys(TIPOS) as TipoIntegracao[]).map((t) => ({ value: t, label: TIPOS[t].label }))}
              className="w-full"
            />
          </div>
          <Field label="Nome" required className="sm:col-span-2">
            {(id) => <Input id={id} value={form.nome} placeholder="Ex.: Active Directory Matriz" onChange={(e) => setForm({ ...form, nome: e.target.value })} />}
          </Field>
          <Field label="Host" required>
            {(id) => <Input id={id} value={form.host} className="font-mono" placeholder="ldap.empresa.local" onChange={(e) => setForm({ ...form, host: e.target.value.trim() })} />}
          </Field>
          <Field label="Porta" required error={portaValida ? undefined : '1–65535'}>
            {(id) => <Input id={id} type="number" min={1} max={65535} value={form.porta} invalid={!portaValida} className="font-mono" onChange={(e) => setForm({ ...form, porta: Number(e.target.value) })} />}
          </Field>
          <div className="sm:col-span-2">
            <Switch checked={form.ativo} onChange={(ativo) => setForm({ ...form, ativo })} label="Conector ativo" description="Conectores inativos não são utilizados pelo sistema." />
          </div>
        </form>
      </Modal>
    </>
  );
}
