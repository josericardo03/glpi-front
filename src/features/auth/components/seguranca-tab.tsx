'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Copy, KeyRound, Laptop, LogOut, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { Badge, Button, Callout, Card, CardBody, CardFooter, CardHeader, EmptyState, Field, Input, Progress, Spinner, useToast } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { senhaInvalida } from '@/lib/validation';
import type { Usuario } from '@/types';
import { useAuth } from '../auth-provider';
import { authService, type SessaoAtiva } from '../services/auth.service';

function forcaSenha(s: string) {
  const regras = [s.length >= 8, /[A-Z]/.test(s), /[a-z]/.test(s), /\d/.test(s), /[^A-Za-z0-9]/.test(s)];
  return regras.filter(Boolean).length;
}
const FORCA = [
  { label: 'Muito fraca', tone: 'danger' },
  { label: 'Muito fraca', tone: 'danger' },
  { label: 'Fraca', tone: 'danger' },
  { label: 'Média', tone: 'warning' },
  { label: 'Boa', tone: 'accent' },
  { label: 'Forte', tone: 'success' },
] as const;

const SENHA_VAZIA = { atual: '', nova: '', confirmar: '' };

/** Qualquer usuário troca a própria senha. Precisa da atual; as outras sessões são encerradas. */
function TrocarSenha() {
  const toast = useToast();
  const [senha, setSenha] = useState(SENHA_VAZIA);
  const [enviando, setEnviando] = useState(false);
  const [erroAtual, setErroAtual] = useState<string>();
  const forca = forcaSenha(senha.nova);
  const confere = !senha.confirmar || senha.nova === senha.confirmar;
  const erroNova = senha.nova
    ? (senhaInvalida(senha.nova) ?? (!/[A-Za-z]/.test(senha.nova) || !/\d/.test(senha.nova) ? 'Use letras e números.' : undefined) ?? (senha.nova === senha.atual ? 'A nova senha deve ser diferente da atual.' : undefined))
    : undefined;
  const valido = !!senha.atual && !erroNova && forca >= 3 && senha.nova === senha.confirmar;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setErroAtual(undefined);
    setEnviando(true);
    try {
      await authService.trocarSenha(senha.atual, senha.nova);
      setSenha(SENHA_VAZIA);
      toast.success('Senha alterada. Os outros dispositivos foram desconectados.');
    } catch (err) {
      const msg = getErrorMessage(err);
      if (/atual/i.test(msg)) setErroAtual(msg);
      else toast.error(msg);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate>
        <CardHeader title="Alterar Senha" icon={<KeyRound className="h-5 w-5" />} />
        <CardBody className="space-y-4">
          <Field label="Senha atual" required error={erroAtual}>
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete="current-password"
                value={senha.atual}
                onChange={(e) => {
                  setErroAtual(undefined);
                  setSenha({ ...senha, atual: e.target.value });
                }}
              />
            )}
          </Field>
          <Field label="Nova senha" required error={erroNova} hint="Mínimo de 8 caracteres, com letras e números. Misture maiúsculas e símbolos para ficar mais forte.">
            {(id) => <Input id={id} type="password" autoComplete="new-password" maxLength={128} value={senha.nova} onChange={(e) => setSenha({ ...senha, nova: e.target.value })} />}
          </Field>
          {senha.nova && (
            <div aria-live="polite">
              <Progress value={(forca / 5) * 100} tone={FORCA[forca].tone} size="xs" />
              <p className="mt-1 text-xs text-brand-muted">
                Força: <strong>{FORCA[forca].label}</strong>
              </p>
            </div>
          )}
          <Field label="Confirmar nova senha" required error={confere ? undefined : 'As senhas não conferem.'}>
            {(id) => <Input id={id} type="password" autoComplete="new-password" value={senha.confirmar} onChange={(e) => setSenha({ ...senha, confirmar: e.target.value })} />}
          </Field>
        </CardBody>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={!valido} loading={enviando}>
            Atualizar Senha
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

/** Verificação em duas etapas (TOTP): ativar, ver os códigos de recuperação uma única vez e desativar. */
function VerificacaoEmDuasEtapas({ user }: { user: Usuario }) {
  const toast = useToast();
  const { updateUser } = useAuth();
  const [passo, setPasso] = useState<'inicio' | 'configurar' | 'codigos' | 'desativar'>('inicio');
  const [segredo, setSegredo] = useState<{ segredo: string; otpauth_url: string } | null>(null);
  const [codigo, setCodigo] = useState('');
  const [codigos, setCodigos] = useState<string[]>([]);
  const [senha, setSenha] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function executar(acao: () => Promise<void>) {
    setOcupado(true);
    try {
      await acao();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setOcupado(false);
    }
  }

  const iniciar = () =>
    executar(async () => {
      setSegredo(await authService.mfa.configurar());
      setCodigo('');
      setPasso('configurar');
    });

  const ativar = (e: FormEvent) => {
    e.preventDefault();
    return executar(async () => {
      const r = await authService.mfa.ativar(codigo);
      setCodigos(r.codigos_recuperacao);
      updateUser({ ...user, mfaAtivo: true });
      setPasso('codigos');
    });
  };

  const desativar = (e: FormEvent) => {
    e.preventDefault();
    return executar(async () => {
      await authService.mfa.desativar(senha, codigo);
      updateUser({ ...user, mfaAtivo: false });
      setSenha('');
      setCodigo('');
      setPasso('inicio');
      toast.success('Verificação em duas etapas desativada.');
    });
  };

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Copiado.');
    } catch {
      toast.error('Não foi possível copiar. Selecione e copie manualmente.');
    }
  };

  return (
    <Card>
      <CardHeader
        title="Verificação em Duas Etapas"
        description="Além da senha, o login pede um código gerado no seu celular."
        icon={user.mfaAtivo ? <ShieldCheck className="h-5 w-5 text-status-resolvido" /> : <Smartphone className="h-5 w-5" />}
        actions={<Badge tone={user.mfaAtivo ? 'success' : 'neutral'} dot>{user.mfaAtivo ? 'Ativa' : 'Desativada'}</Badge>}
      />
      <CardBody className="space-y-4">
        {passo === 'inicio' && !user.mfaAtivo && (
          <>
            <p className="text-sm text-brand-muted">
              Use um aplicativo autenticador (Google Authenticator, Microsoft Authenticator, Authy...). Mesmo que alguém descubra a sua senha, não consegue entrar sem o código do seu celular.
            </p>
            <Button icon={<ShieldCheck className="h-4 w-4" />} onClick={iniciar} loading={ocupado}>
              Ativar verificação em duas etapas
            </Button>
          </>
        )}

        {passo === 'configurar' && segredo && (
          <form onSubmit={ativar} className="space-y-4" noValidate>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>No aplicativo autenticador, adicione uma conta e escolha <strong>informar uma chave de configuração</strong>.</li>
              <li>
                Digite esta chave (tipo baseado em tempo):
                <div className="mt-1 flex items-center gap-2">
                  <code className="select-all break-all rounded bg-slate-100 px-2 py-1 font-mono text-sm tracking-wider text-brand-darker">{segredo.segredo.match(/.{1,4}/g)?.join(' ')}</code>
                  <Button type="button" variant="ghost" size="icon" aria-label="Copiar chave" onClick={() => copiar(segredo.segredo)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </li>
              <li>
                Pelo celular, é possível abrir direto: <a className="break-all text-brand-primary underline" href={segredo.otpauth_url}>link do autenticador</a>.
              </li>
              <li>Digite abaixo o código de 6 dígitos que o aplicativo mostrar.</li>
            </ol>
            <Field label="Código de 6 dígitos" required>
              {(id) => <Input id={id} inputMode="numeric" autoComplete="one-time-code" maxLength={7} className="max-w-[160px] font-mono tracking-widest" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/[^\d\s]/g, ''))} />}
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={codigo.replace(/\s/g, '').length !== 6} loading={ocupado}>
                Confirmar e ativar
              </Button>
              <Button type="button" variant="outline" onClick={() => setPasso('inicio')}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {passo === 'codigos' && (
          <div className="space-y-3">
            <Callout tone="warning" title="Guarde estes códigos de recuperação">
              Cada um vale uma única vez e serve se você perder o celular. Eles <strong>não serão mostrados de novo</strong>.
            </Callout>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {codigos.map((c) => (
                <li key={c} className="select-all rounded-md border border-brand-border bg-slate-50 px-3 py-2 text-center font-mono text-sm">
                  {c}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button type="button" variant="outline" icon={<Copy className="h-4 w-4" />} onClick={() => copiar(codigos.join('\n'))}>
                Copiar todos
              </Button>
              <Button type="button" onClick={() => setPasso('inicio')}>
                Já guardei
              </Button>
            </div>
          </div>
        )}

        {passo === 'inicio' && user.mfaAtivo && (
          <>
            <p className="text-sm text-brand-muted">Seu login exige a senha e o código do aplicativo autenticador.</p>
            <Button variant="danger-outline" icon={<ShieldOff className="h-4 w-4" />} onClick={() => { setCodigo(''); setSenha(''); setPasso('desativar'); }}>
              Desativar
            </Button>
          </>
        )}

        {passo === 'desativar' && (
          <form onSubmit={desativar} className="space-y-4" noValidate>
            <p className="text-sm text-brand-muted">Para desativar, confirme a senha e um código atual (do aplicativo ou de recuperação).</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Senha" required>
                {(id) => <Input id={id} type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />}
              </Field>
              <Field label="Código" required>
                {(id) => <Input id={id} autoComplete="one-time-code" maxLength={20} className="font-mono tracking-widest" value={codigo} onChange={(e) => setCodigo(e.target.value)} />}
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="danger" disabled={!senha || codigo.trim().length < 6} loading={ocupado}>
                Desativar verificação
              </Button>
              <Button type="button" variant="outline" onClick={() => setPasso('inicio')}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

/** Navegadores e dispositivos conectados. */
function Dispositivos() {
  const toast = useToast();
  const { logout } = useAuth();
  const [sessoes, setSessoes] = useState<SessaoAtiva[] | null>(null);
  const [erro, setErro] = useState<string>();

  const carregar = useCallback(async () => {
    try {
      setSessoes(await authService.sessoes.listar());
      setErro(undefined);
    } catch (err) {
      setErro(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function revogar(id: string) {
    try {
      await authService.sessoes.revogar(id);
      toast.success('Dispositivo desconectado.');
      await carregar();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function sairDeTodas() {
    try {
      await authService.sessoes.sairDeTodas();
    } catch (err) {
      toast.error(getErrorMessage(err));
      return;
    }
    logout();
  }

  return (
    <Card>
      <CardHeader title="Dispositivos Conectados" description="Navegadores com sessão aberta na sua conta." icon={<Laptop className="h-5 w-5" />} />
      <CardBody>
        {erro ? (
          <p className="text-sm text-status-critica">{erro}</p>
        ) : !sessoes ? (
          <div className="flex justify-center py-4"><Spinner className="h-6 w-6" /></div>
        ) : sessoes.length === 0 ? (
          <EmptyState title="Nenhuma sessão ativa" />
        ) : (
          <ul className="divide-y divide-brand-border">
            {sessoes.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-brand-darker" title={s.agente ?? undefined}>
                    {s.agente ?? 'Dispositivo desconhecido'} {s.atual && <Badge tone="primary" className="ml-1">Este dispositivo</Badge>}
                  </p>
                  <p className="text-xs text-brand-muted">
                    {s.endereco_ip ?? 'IP desconhecido'} · último uso {timeAgo(s.ultimo_uso)}
                  </p>
                </div>
                {!s.atual && (
                  <Button size="sm" variant="ghost" onClick={() => revogar(s.id)}>
                    Desconectar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
      <CardFooter className="justify-end">
        <Button variant="danger-outline" size="sm" icon={<LogOut className="h-4 w-4" />} onClick={sairDeTodas}>
          Sair de todos os dispositivos
        </Button>
      </CardFooter>
    </Card>
  );
}

export function SegurancaTab({ user }: { user: Usuario }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <TrocarSenha />
      </div>
      <div className="space-y-6">
        <VerificacaoEmDuasEtapas user={user} />
        <Dispositivos />
      </div>
    </div>
  );
}
