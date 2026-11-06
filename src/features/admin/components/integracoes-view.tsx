'use client';

import { memo, useState, type FormEvent } from 'react';
import { Activity, CheckCircle2, Copy, Inbox, KeyRound, Mail, Pencil, Plug, PlugZap, Plus, RefreshCw, Server, Webhook, XCircle } from 'lucide-react';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardFooter,
  Checkbox,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  StatCard,
  Switch,
  ToggleGroup,
  useToast,
} from '@/components/ui';
import { useCategoriaOptions } from '@/features/cadastros/use-cadastros';
import { getErrorMessage } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { textoInvalido } from '@/lib/validation';
import { EVENTOS_WEBHOOK, type Integracao, type IntegracaoInput, type TipoIntegracao } from '@/types';
import { useAtivarIntegracao, useAtualizarIntegracao, useCreateIntegracao, useIntegracoes, useTestarIntegracao } from '../use-admin';

const TIPOS: Record<TipoIntegracao, { label: string; icon: typeof Mail; porta: number; desc: string }> = {
  SMTP: { label: 'SMTP', icon: Mail, porta: 587, desc: 'Envio de e-mails: notificações e redefinição de senha' },
  WEBHOOK: { label: 'Webhook', icon: Webhook, porta: 443, desc: 'Envia os eventos dos chamados a sistemas externos' },
  EMAIL_ENTRADA: { label: 'Entrada de e-mail', icon: Inbox, porta: 0, desc: 'Abre chamados a partir de e-mails recebidos' },
  LDAP: { label: 'LDAP', icon: KeyRound, porta: 636, desc: 'Diretório (teste de conectividade)' },
  AD: { label: 'Active Directory', icon: KeyRound, porta: 636, desc: 'Diretório Microsoft (teste de conectividade)' },
};

const EMPTY: IntegracaoInput = { nome: '', tipo: 'SMTP', host: '', porta: 587, ativo: true, eventos: [], prioridade: 'MEDIA', tipoChamado: 'INCIDENTE' };

const PRIORIDADES = [
  { value: 'CRITICA', label: 'Crítica' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Média' },
  { value: 'BAIXA', label: 'Baixa' },
];

/** Token aleatório de 40 caracteres para a entrada de e-mail (a API exige pelo menos 16). */
function gerarToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(30));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '').slice(0, 40);
}

/** Preenche o formulário com os dados do conector; segredos ficam em branco (em branco = manter o gravado). */
function paraFormulario(i: Integracao): IntegracaoInput {
  const c = i.configuracoes ?? {};
  return {
    ...EMPTY,
    nome: i.nome,
    tipo: i.tipo,
    ativo: i.ativo,
    host: String(c.host ?? ''),
    porta: Number(c.port ?? TIPOS[i.tipo]?.porta ?? 0),
    usuario: typeof c.user === 'string' ? c.user : '',
    remetente: typeof c.from === 'string' ? c.from : '',
    url: typeof c.url === 'string' ? c.url : '',
    eventos: Array.isArray(c.eventos) ? c.eventos.map(String) : [],
    idCategoria: Number(c.id_categoria) || undefined,
    prioridade: (['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'] as const).find((p) => p === c.prioridade) ?? 'MEDIA',
    tipoChamado: c.tipo === 'REQUISICAO' ? 'REQUISICAO' : 'INCIDENTE',
  };
}

const IntegracaoCard = memo(function IntegracaoCard({ i, onEditar }: { i: Integracao; onEditar: (i: Integracao) => void }) {
  const { mutate: testar, data: result, isPending: testing } = useTestarIntegracao();
  const ativar = useAtivarIntegracao();
  const toast = useToast();
  const tipo = TIPOS[i.tipo] ?? TIPOS.WEBHOOK;
  const Icon = tipo.icon;
  const endereco =
    i.tipo === 'EMAIL_ENTRADA' ? 'POST /api/entrada/email' : i.host ? `${i.host}${i.porta && i.tipo !== 'WEBHOOK' ? `:${i.porta}` : ''}` : 'Endereço não informado';
  return (
    <Card className="flex flex-col">
      <CardBody className="flex-1 space-y-4">
        <div className="flex items-start gap-3">
          <span aria-hidden className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', i.ativo ? 'bg-brand-primary/10 text-brand-primary' : 'bg-slate-100 text-brand-muted')}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-brand-darker">{i.nome}</p>
            <p className="text-xs text-brand-muted">{tipo.desc}</p>
          </div>
          <Badge tone={i.ativo ? 'success' : 'neutral'} dot>{i.ativo ? 'Ativo' : 'Inativo'}</Badge>
        </div>
        <div className="flex items-center gap-2 break-all rounded-md bg-brand-bg px-3 py-2 font-mono text-xs text-brand-darker">
          <Server className="h-3.5 w-3.5 shrink-0 text-brand-muted" aria-hidden /> {endereco}
        </div>
        {i.tipo === 'EMAIL_ENTRADA' && (
          <p className="text-xs text-brand-muted">Quem lê a caixa de e-mail chama esta rota com o cabeçalho <code>X-Integration-Token</code>.</p>
        )}
        {result ? (
          <div role="status" className={cn('flex items-start gap-2 rounded-md p-3 text-xs', result.sucesso ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800')}>
            {result.sucesso ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden /> : <XCircle className="h-4 w-4 shrink-0" aria-hidden />}
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
      <CardFooter className="justify-between gap-2">
        <Switch
          checked={i.ativo}
          onChange={(ativo) => ativar.mutate({ id: i.id, ativo }, { onError: (e) => toast.error(getErrorMessage(e)) })}
          label={i.ativo ? 'Ativo' : 'Inativo'}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => onEditar(i)} aria-label={`Editar ${i.nome}`} />
          {i.tipo !== 'EMAIL_ENTRADA' && (
            <Button size="sm" variant="outline" icon={<PlugZap className="h-4 w-4" />} loading={testing} onClick={() => testar(i.id)}>
              {i.tipo === 'SMTP' ? 'Enviar e-mail de teste' : 'Testar'}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
});

export function IntegracoesView() {
  const { data, isLoading, isError, error, refetch } = useIntegracoes();
  const create = useCreateIntegracao();
  const atualizar = useAtualizarIntegracao();
  const categorias = useCategoriaOptions();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Integracao | null>(null);
  const [form, setForm] = useState<IntegracaoInput>(EMPTY);

  const lista = data ?? [];
  const testadas = lista.filter((i) => i.ultimoTeste);
  const falhas = testadas.filter((i) => i.ultimoResultado === 'FALHA').length;
  const latencias = testadas.map((i) => i.latenciaMs).filter((l): l is number => l !== null);
  const latenciaMedia = latencias.length ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length) : null;

  const novo = editando === null;
  const portaValida = Number.isInteger(form.porta) && form.porta >= 1 && form.porta <= 65535;
  const erroNome = form.nome ? textoInvalido(form.nome, { rotulo: 'O nome' }) : undefined;
  const urlValida = /^https?:\/\/\S+$/i.test(form.url ?? '');
  const tokenOk = (form.token ?? '').trim().length >= 16;
  let valido = !textoInvalido(form.nome);
  if (form.tipo === 'SMTP' || form.tipo === 'LDAP' || form.tipo === 'AD') valido &&= !!form.host.trim() && portaValida;
  if (form.tipo === 'WEBHOOK') valido &&= urlValida;
  if (form.tipo === 'EMAIL_ENTRADA') valido &&= !!form.idCategoria && (tokenOk || !novo);

  function abrirNovo() {
    setEditando(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function abrirEdicao(i: Integracao) {
    setEditando(i);
    setForm(paraFormulario(i));
    setOpen(true);
  }

  function fechar() {
    setOpen(false);
    setEditando(null);
    setForm(EMPTY);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    if (editando) atualizar.mutate({ id: editando.id, input: form }, { onSuccess: fechar });
    else create.mutate(form, { onSuccess: fechar });
  }

  function alternarEvento(valor: string) {
    const atuais = form.eventos ?? [];
    setForm({ ...form, eventos: atuais.includes(valor) ? atuais.filter((e) => e !== valor) : [...atuais, valor] });
  }

  async function copiarToken() {
    try {
      await navigator.clipboard.writeText(form.token ?? '');
      toast.success('Token copiado. Ele não é mostrado de novo depois de salvo.');
    } catch {
      toast.error('Não foi possível copiar. Selecione e copie manualmente.');
    }
  }

  return (
    <>
      <PageHeader
        title="Integrações"
        description="Conecte o portal a e-mail, sistemas externos e diretórios."
        breadcrumbs={[{ label: 'Administração' }, { label: 'Integrações' }]}
        actions={<Button size="lg" icon={<Plus className="h-4 w-4" />} onClick={abrirNovo}>Novo Conector</Button>}
      />

      <div className={cn('mb-6 grid grid-cols-2 gap-4', testadas.length ? 'xl:grid-cols-4' : 'max-w-xl')}>
        <StatCard label="Conectores" value={lista.length} icon={<Plug className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Ativos" value={lista.filter((i) => i.ativo).length} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" loading={isLoading} />
        {testadas.length > 0 && (
          <>
            <StatCard label="Falhas no Último Teste" value={falhas} icon={<XCircle className="h-5 w-5" />} tone={falhas ? 'danger' : 'default'} loading={isLoading} />
            <StatCard label="Latência Média" value={latenciaMedia !== null ? `${latenciaMedia} ms` : '—'} icon={<Activity className="h-5 w-5" />} tone="dark" loading={isLoading} />
          </>
        )}
      </div>

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      ) : lista.length === 0 ? (
        <EmptyState title="Nenhum conector configurado" description="Comece pelo SMTP: com ele o portal envia as notificações e a redefinição de senha por e-mail." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((i) => (
            <IntegracaoCard key={i.id} i={i} onEditar={abrirEdicao} />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={fechar}
        title={novo ? 'Novo Conector' : `Editar ${editando?.nome}`}
        description={novo ? 'Depois de salvar, use "Testar" para conferir a conexão.' : 'Campos secretos em branco mantêm o valor já gravado.'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={fechar}>Cancelar</Button>
            <Button type="submit" form="form-integracao" disabled={!valido} loading={create.isPending || atualizar.isPending}>
              Salvar
            </Button>
          </>
        }
      >
        <form id="form-integracao" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-[1fr_120px]">
          {novo && (
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Tipo</p>
              <ToggleGroup
                aria-label="Tipo de conector"
                value={form.tipo}
                onChange={(tipo) => setForm({ ...form, tipo, porta: TIPOS[tipo].porta, token: tipo === 'EMAIL_ENTRADA' ? gerarToken() : form.token })}
                options={(Object.keys(TIPOS) as TipoIntegracao[]).map((t) => ({ value: t, label: TIPOS[t].label }))}
                className="w-full flex-wrap"
              />
            </div>
          )}
          <Field label="Nome" required error={erroNome} className="sm:col-span-2">
            {(id) => <Input id={id} maxLength={100} value={form.nome} placeholder={`Ex.: ${TIPOS[form.tipo].label} Matriz`} onChange={(e) => setForm({ ...form, nome: e.target.value })} />}
          </Field>

          {(form.tipo === 'SMTP' || form.tipo === 'LDAP' || form.tipo === 'AD') && (
            <>
              <Field label="Host" required>
                {(id) => <Input id={id} value={form.host} className="font-mono" placeholder={form.tipo === 'SMTP' ? 'smtp.empresa.com.br' : 'ldap.empresa.local'} onChange={(e) => setForm({ ...form, host: e.target.value.trim() })} />}
              </Field>
              <Field label="Porta" required error={portaValida ? undefined : 'Entre 1 e 65535.'}>
                {(id) => <Input id={id} type="number" min={1} max={65535} step={1} value={form.porta} className="font-mono" onChange={(e) => setForm({ ...form, porta: Number(e.target.value) })} />}
              </Field>
            </>
          )}

          {form.tipo === 'SMTP' && (
            <>
              <Field label="Usuário" hint="Deixe em branco se o servidor não exige login.">
                {(id) => <Input id={id} autoComplete="off" value={form.usuario ?? ''} onChange={(e) => setForm({ ...form, usuario: e.target.value })} />}
              </Field>
              <Field label="Senha" hint={novo ? undefined : 'Em branco: mantém a atual.'} className="sm:col-start-1">
                {(id) => <Input id={id} type="password" autoComplete="new-password" value={form.senha ?? ''} onChange={(e) => setForm({ ...form, senha: e.target.value })} />}
              </Field>
              <Field label="Remetente" hint='Ex.: "Service Desk <suporte@empresa.com.br>"' className="sm:col-span-2">
                {(id) => <Input id={id} value={form.remetente ?? ''} onChange={(e) => setForm({ ...form, remetente: e.target.value })} />}
              </Field>
              <p className="text-xs text-brand-muted sm:col-span-2">Só pode haver um SMTP ativo. A porta 465 usa TLS direto; nas demais, o STARTTLS é negociado se o servidor oferecer.</p>
            </>
          )}

          {form.tipo === 'WEBHOOK' && (
            <>
              <Field label="URL" required error={form.url && !urlValida ? 'Informe uma URL http(s) completa.' : undefined} className="sm:col-span-2">
                {(id) => <Input id={id} value={form.url ?? ''} className="font-mono" placeholder="https://sistema.empresa.com.br/hooks/itsm" onChange={(e) => setForm({ ...form, url: e.target.value.trim() })} />}
              </Field>
              <Field label="Segredo de assinatura" hint={`Cada entrega vem assinada (cabeçalho X-ITSM-Signature, HMAC-SHA256).${novo ? '' : ' Em branco: mantém o atual.'}`} className="sm:col-span-2">
                {(id) => <Input id={id} type="password" autoComplete="new-password" value={form.segredo ?? ''} onChange={(e) => setForm({ ...form, segredo: e.target.value })} />}
              </Field>
              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Eventos (nenhum marcado = todos)</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {EVENTOS_WEBHOOK.map((e) => (
                    <Checkbox key={e.value} label={e.label} checked={(form.eventos ?? []).includes(e.value)} onChange={() => alternarEvento(e.value)} />
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {form.tipo === 'EMAIL_ENTRADA' && (
            <>
              <Callout tone="info" className="sm:col-span-2">
                O portal não lê caixas de e-mail. Um gateway (Power Automate, Zapier, script) chama <code>POST /api/entrada/email</code> com{' '}
                <code>{'{ de, assunto, texto }'}</code> e o token abaixo. O remetente precisa ser um usuário ativo; um assunto com <code>#123</code> vira comentário no chamado 123.
              </Callout>
              <Field label="Token" required={novo} hint={novo ? 'Guarde agora: depois de salvo ele fica criptografado e não é mostrado.' : 'Em branco: mantém o atual. Gere outro para trocar.'} className="sm:col-span-2">
                {(id) => (
                  <div className="flex gap-2">
                    <Input id={id} value={form.token ?? ''} className="font-mono" autoComplete="off" onChange={(e) => setForm({ ...form, token: e.target.value.trim() })} />
                    <Button type="button" variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={() => setForm({ ...form, token: gerarToken() })} aria-label="Gerar novo token" />
                    <Button type="button" variant="outline" icon={<Copy className="h-4 w-4" />} disabled={!form.token} onClick={copiarToken} aria-label="Copiar token" />
                  </div>
                )}
              </Field>
              <Field label="Categoria dos chamados" required className="sm:col-span-2">
                {(id) => <Select id={id} placeholder="Selecione..." options={categorias} value={form.idCategoria ?? ''} onChange={(e) => setForm({ ...form, idCategoria: e.target.value ? Number(e.target.value) : undefined })} />}
              </Field>
              <Field label="Prioridade padrão">
                {(id) => <Select id={id} options={PRIORIDADES} value={form.prioridade ?? 'MEDIA'} onChange={(e) => setForm({ ...form, prioridade: e.target.value as IntegracaoInput['prioridade'] })} />}
              </Field>
              <Field label="Tipo">
                {(id) => <Select id={id} options={[{ value: 'INCIDENTE', label: 'Incidente' }, { value: 'REQUISICAO', label: 'Requisição' }]} value={form.tipoChamado ?? 'INCIDENTE'} onChange={(e) => setForm({ ...form, tipoChamado: e.target.value as IntegracaoInput['tipoChamado'] })} />}
              </Field>
            </>
          )}

          <div className="sm:col-span-2">
            <Switch checked={form.ativo} onChange={(ativo) => setForm({ ...form, ativo })} label="Conector ativo" description="Conectores inativos não são utilizados pelo sistema." />
          </div>
        </form>
      </Modal>
    </>
  );
}
