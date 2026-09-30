'use client';

import { useState, type FormEvent } from 'react';
import { Bell, Building2, CalendarClock, KeyRound, Lock, Mail, Save, UserRound } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Progress,
  Switch,
  Tabs,
  useToast,
  type BadgeTone,
} from '@/components/ui';
import { useUpdateUsuario } from '@/features/cadastros/use-cadastros';
import { getErrorMessage } from '@/lib/api';
import { PAPEL_LABEL, perfilPrincipal } from '@/lib/backend/usuario.mapper';
import { formatDate, timeAgo } from '@/lib/format';
import { recursos } from '@/lib/recursos';
import { semErros, senhaInvalida, textoInvalido } from '@/lib/validation';
import type { Papel, Usuario } from '@/types';
import { useAuth } from '../auth-provider';
import { authService } from '../services/auth.service';

type Aba = 'dados' | 'seguranca' | 'preferencias';

const PAPEL_TONE: Record<Papel, BadgeTone> = { ADMIN: 'primary', GESTOR: 'pendente', TECNICO: 'atendimento', SOLICITANTE: 'neutral' };

const PREFS = [
  { key: 'emailAtribuicao', label: 'E-mail ao receber um chamado', description: 'Quando um ticket for atribuído a você ou ao seu grupo.' },
  { key: 'emailSla', label: 'Alertas de SLA por e-mail', description: 'Avisos preventivos e violações de prazo.' },
  { key: 'inAppComentarios', label: 'Notificações de comentários', description: 'Novas interações nos chamados que você acompanha.' },
  { key: 'resumoDiario', label: 'Resumo diário', description: 'Consolidado da fila enviado às 08:00.' },
] as const;
type Prefs = Record<(typeof PREFS)[number]['key'], boolean>;
const DEFAULT_PREFS: Prefs = { emailAtribuicao: true, emailSla: true, inAppComentarios: true, resumoDiario: false };
const prefsKey = (userId: number) => `itsm_prefs_${userId}`;

function loadPrefs(userId: number): Prefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(prefsKey(userId)) ?? '{}') };
  } catch {
    return DEFAULT_PREFS;
  }
}

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

const AVISO_SOMENTE_LEITURA = 'A alteração de dados cadastrais é feita pelo administrador do sistema. Solicite a mudança pelo Service Desk.';

function DadosTab({ user, editavel }: { user: Usuario; editavel: boolean }) {
  const { updateUser } = useAuth();
  const update = useUpdateUsuario('Dados atualizados.');
  const [form, setForm] = useState({ nome: user.nome, cargo: user.cargo });
  const erros = { nome: textoInvalido(form.nome, { rotulo: 'O nome' }), cargo: textoInvalido(form.cargo, { rotulo: 'O cargo' }) };
  const dirty = form.nome.trim() !== user.nome || form.cargo.trim() !== user.cargo;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!dirty || !semErros(erros)) return;
    update.mutate({ id: user.id, input: { nome: form.nome, cargo: form.cargo } }, { onSuccess: updateUser });
  }

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate>
        <CardHeader title="Dados Pessoais" description="Informações exibidas nos chamados e comentários." icon={<UserRound className="h-5 w-5" />} />
        <CardBody className="grid gap-4 md:grid-cols-2">
          {!editavel && (
            <Callout tone="info" icon={<Lock className="h-5 w-5" />} className="md:col-span-2">
              {AVISO_SOMENTE_LEITURA}
            </Callout>
          )}
          <Field label="Nome completo" required={editavel} error={dirty ? erros.nome : undefined}>
            {(id) => <Input id={id} maxLength={100} value={form.nome} disabled={!editavel} onChange={(e) => setForm({ ...form, nome: e.target.value })} />}
          </Field>
          <Field label="Cargo" required={editavel} error={dirty ? erros.cargo : undefined}>
            {(id) => <Input id={id} maxLength={100} value={form.cargo} disabled={!editavel} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />}
          </Field>
          <Field label="E-mail corporativo" hint="O e-mail de acesso não pode ser alterado.">
            {(id) => <Input id={id} value={user.email} disabled leftIcon={<Mail className="h-4 w-4" />} />}
          </Field>
          <Field label="Departamento">{(id) => <Input id={id} value={user.departamentoNome ?? '—'} disabled leftIcon={<Building2 className="h-4 w-4" />} />}</Field>
        </CardBody>
        {editavel && (
          <CardFooter className="justify-end">
            <Button type="submit" icon={<Save className="h-4 w-4" />} disabled={!dirty || !semErros(erros)} loading={update.isPending}>
              Salvar Alterações
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}

const SENHA_VAZIA = { atual: '', nova: '', confirmar: '' };

function SegurancaTab({ user, editavel }: { user: Usuario; editavel: boolean }) {
  const update = useUpdateUsuario('Senha alterada com sucesso.');
  const [senha, setSenha] = useState(SENHA_VAZIA);
  const [verificando, setVerificando] = useState(false);
  const [erroAtual, setErroAtual] = useState<string>();
  const forca = forcaSenha(senha.nova);
  const confere = !senha.confirmar || senha.nova === senha.confirmar;
  const erroNova = senha.nova ? (senhaInvalida(senha.nova) ?? (senha.nova === senha.atual ? 'A nova senha deve ser diferente da atual.' : undefined)) : undefined;
  const valido = !!senha.atual && !erroNova && forca >= 4 && senha.nova === senha.confirmar;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setErroAtual(undefined);
    setVerificando(true);
    try {
      if (!(await authService.verificarSenha(user.email, senha.atual))) {
        setErroAtual('Senha atual incorreta.');
        return;
      }
    } catch (err) {
      setErroAtual(getErrorMessage(err));
      return;
    } finally {
      setVerificando(false);
    }
    update.mutate({ id: user.id, input: { senha: senha.nova } }, { onSuccess: () => setSenha(SENHA_VAZIA) });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <form onSubmit={onSubmit} noValidate>
          <CardHeader title="Alterar Senha" icon={<KeyRound className="h-5 w-5" />} />
          {editavel ? (
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
              <Field label="Nova senha" required error={erroNova} hint="Mínimo de 8 caracteres, com maiúsculas, minúsculas, números e símbolos.">
                {(id) => <Input id={id} type="password" autoComplete="new-password" value={senha.nova} onChange={(e) => setSenha({ ...senha, nova: e.target.value })} />}
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
          ) : (
            <CardBody>
              <Callout tone="info" icon={<Lock className="h-5 w-5" />}>
                A redefinição de senha é feita pelo administrador do sistema. Solicite pelo Service Desk.
              </Callout>
            </CardBody>
          )}
          {editavel && (
            <CardFooter className="justify-end">
              <Button type="submit" disabled={!valido} loading={verificando || update.isPending}>
                Atualizar Senha
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>
      <Callout tone="info" title="Sessão atual">
        {user.ultimoAcesso ? `Último acesso ${timeAgo(user.ultimoAcesso)}. ` : ''}A sessão expira automaticamente; ao expirar, será necessário entrar novamente.
      </Callout>
    </div>
  );
}

function PreferenciasTab({ userId }: { userId: number }) {
  const toast = useToast();
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(userId));

  function toggle(key: keyof Prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      localStorage.setItem(prefsKey(userId), JSON.stringify(next));
      toast.success('Preferência salva neste navegador.');
    } catch {
      toast.error('Não foi possível salvar a preferência neste navegador.');
    }
  }

  return (
    <Card>
      <CardHeader title="Notificações" description="Preferências salvas neste navegador." icon={<Bell className="h-5 w-5" />} />
      <CardBody className="divide-y divide-brand-border py-0">
        {PREFS.map((p) => (
          <div key={p.key} className="py-4">
            <Switch checked={prefs[p.key]} onChange={(v) => toggle(p.key, v)} label={p.label} description={p.description} />
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

export function PerfilView() {
  const { user, hasRole } = useAuth();
  const [aba, setAba] = useState<Aba>('dados');
  if (!user) return null;

  /** PATCH /usuarios/:id é restrito a administradores na API. */
  const editavel = hasRole('ADMIN') || recursos.autoatendimentoPerfil;
  const papel = perfilPrincipal(user.papeis);

  return (
    <>
      <PageHeader title="Minha Conta" description="Seus dados, segurança e preferências de notificação." />

      <Card className="mb-6 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand-darker via-brand-dark to-brand-primary" />
        <CardBody className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
          <Avatar name={user.nome} src={user.avatarUrl} size="xl" className="ring-4" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-brand-darker">{user.nome}</h2>
            <p className="text-sm text-brand-muted">
              {user.cargo}
              {user.departamentoNome && ` · ${user.departamentoNome}`}
            </p>
            <div className="mt-2">
              <Badge tone={PAPEL_TONE[papel]}>{PAPEL_LABEL[papel]}</Badge>
            </div>
          </div>
          {user.criadoEm && (
            <p className="inline-flex items-center gap-1.5 text-xs text-brand-muted">
              <CalendarClock className="h-4 w-4" aria-hidden /> Membro desde {formatDate(user.criadoEm)}
            </p>
          )}
        </CardBody>
        <Tabs
          value={aba}
          onChange={setAba}
          aria-label="Seções da conta"
          items={[
            { value: 'dados', label: 'Dados Pessoais', icon: <UserRound className="h-4 w-4" /> },
            { value: 'seguranca', label: 'Segurança', icon: <KeyRound className="h-4 w-4" /> },
            { value: 'preferencias', label: 'Preferências', icon: <Bell className="h-4 w-4" /> },
          ]}
          className="border-t"
        />
      </Card>

      {aba === 'dados' && <DadosTab key={`${user.id}-${user.nome}-${user.cargo}`} user={user} editavel={editavel} />}
      {aba === 'seguranca' && <SegurancaTab user={user} editavel={editavel} />}
      {aba === 'preferencias' && <PreferenciasTab key={user.id} userId={user.id} />}
    </>
  );
}
