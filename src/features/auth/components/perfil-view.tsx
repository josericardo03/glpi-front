'use client';

import { useState, type FormEvent } from 'react';
import { Bell, Building2, CalendarClock, KeyRound, Mail, Save, ShieldCheck, UserRound } from 'lucide-react';
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
import { formatDate, timeAgo } from '@/lib/format';
import type { Papel, Usuario, UsuarioInput } from '@/types';
import { useAuth } from '../auth-provider';

type Aba = 'dados' | 'seguranca' | 'preferencias';

const PAPEIS: Record<Papel, { label: string; tone: BadgeTone }> = {
  ADMIN: { label: 'Admin', tone: 'primary' },
  GESTOR: { label: 'Gestor', tone: 'pendente' },
  TECNICO: { label: 'Técnico', tone: 'atendimento' },
  SOLICITANTE: { label: 'Solicitante', tone: 'neutral' },
};

const PREFS_KEY = 'itsm_prefs';
const PREFS = [
  { key: 'emailAtribuicao', label: 'E-mail ao receber um chamado', description: 'Quando um ticket for atribuído a você ou ao seu grupo.' },
  { key: 'emailSla', label: 'Alertas de SLA por e-mail', description: 'Avisos preventivos e violações de prazo.' },
  { key: 'inAppComentarios', label: 'Notificações de comentários', description: 'Novas interações nos chamados que você acompanha.' },
  { key: 'resumoDiario', label: 'Resumo diário', description: 'Consolidado da fila enviado às 08:00.' },
] as const;
type Prefs = Record<(typeof PREFS)[number]['key'], boolean>;
const DEFAULT_PREFS: Prefs = { emailAtribuicao: true, emailSla: true, inAppComentarios: true, resumoDiario: false };

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
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

const toInput = (u: Usuario): UsuarioInput => ({ nome: u.nome, email: u.email, cargo: u.cargo, departamentoId: u.departamentoId, papeis: u.papeis, status: u.status });

function DadosTab({ user }: { user: Usuario }) {
  const { updateUser } = useAuth();
  const update = useUpdateUsuario();
  const [form, setForm] = useState({ nome: user.nome, cargo: user.cargo });
  const dirty = form.nome !== user.nome || form.cargo !== user.cargo;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    update.mutate({ id: user.id, input: { ...toInput(user), ...form } }, { onSuccess: updateUser });
  }

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <CardHeader title="Dados Pessoais" description="Informações exibidas nos chamados e comentários." icon={<UserRound className="h-5 w-5" />} />
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label="Nome completo" required>{(id) => <Input id={id} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />}</Field>
          <Field label="Cargo">{(id) => <Input id={id} value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />}</Field>
          <Field label="E-mail corporativo" hint="Gerenciado pelo administrador / diretório LDAP.">
            {(id) => <Input id={id} value={user.email} disabled leftIcon={<Mail className="h-4 w-4" />} />}
          </Field>
          <Field label="Departamento">{(id) => <Input id={id} value={user.departamentoNome ?? '—'} disabled leftIcon={<Building2 className="h-4 w-4" />} />}</Field>
        </CardBody>
        <CardFooter className="justify-end">
          <Button type="submit" icon={<Save className="h-4 w-4" />} disabled={!dirty || !form.nome.trim()} loading={update.isPending}>Salvar Alterações</Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function SegurancaTab({ user }: { user: Usuario }) {
  const update = useUpdateUsuario();
  const [senha, setSenha] = useState({ atual: '', nova: '', confirmar: '' });
  const forca = forcaSenha(senha.nova);
  const confere = !senha.confirmar || senha.nova === senha.confirmar;
  const valido = senha.atual && forca >= 4 && senha.nova === senha.confirmar;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    update.mutate({ id: user.id, input: { ...toInput(user), senha: senha.nova } }, { onSuccess: () => setSenha({ atual: '', nova: '', confirmar: '' }) });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <form onSubmit={onSubmit}>
          <CardHeader title="Alterar Senha" icon={<KeyRound className="h-5 w-5" />} />
          <CardBody className="space-y-4">
            <Field label="Senha atual" required>
              {(id) => <Input id={id} type="password" autoComplete="current-password" value={senha.atual} onChange={(e) => setSenha({ ...senha, atual: e.target.value })} />}
            </Field>
            <Field label="Nova senha" required hint="Mínimo 8 caracteres, com maiúsculas, minúsculas, números e símbolos.">
              {(id) => <Input id={id} type="password" autoComplete="new-password" value={senha.nova} onChange={(e) => setSenha({ ...senha, nova: e.target.value })} />}
            </Field>
            {senha.nova && (
              <div>
                <Progress value={(forca / 5) * 100} tone={FORCA[forca].tone} size="xs" />
                <p className="mt-1 text-xs text-brand-muted">Força: <strong>{FORCA[forca].label}</strong></p>
              </div>
            )}
            <Field label="Confirmar nova senha" required error={confere ? undefined : 'As senhas não conferem.'}>
              {(id) => <Input id={id} type="password" autoComplete="new-password" invalid={!confere} value={senha.confirmar} onChange={(e) => setSenha({ ...senha, confirmar: e.target.value })} />}
            </Field>
          </CardBody>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={!valido} loading={update.isPending}>Atualizar Senha</Button>
          </CardFooter>
        </form>
      </Card>
      <div className="space-y-4">
        <Callout tone="success" title="Autenticação em dois fatores" icon={<ShieldCheck className="h-5 w-5" />}>
          MFA ativo via aplicativo autenticador. Para redefinir, procure o Service Desk.
        </Callout>
        <Callout tone="info" title="Sessão atual">
          Último acesso {user.ultimoAcesso ? timeAgo(user.ultimoAcesso) : 'agora mesmo'}. O token expira automaticamente após inatividade.
        </Callout>
      </div>
    </div>
  );
}

function PreferenciasTab() {
  const toast = useToast();
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

  function toggle(key: keyof Prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    toast.success('Preferência salva.');
  }

  return (
    <Card>
      <CardHeader title="Notificações" description="Escolha como deseja ser avisado." icon={<Bell className="h-5 w-5" />} />
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
  const { user } = useAuth();
  const [aba, setAba] = useState<Aba>('dados');
  if (!user) return null;

  return (
    <>
      <PageHeader title="Minha Conta" description="Gerencie seus dados, segurança e preferências de notificação." />

      <Card className="mb-6 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand-darker via-brand-dark to-brand-primary" />
        <CardBody className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
          <Avatar name={user.nome} src={user.avatarUrl} size="xl" className="ring-4" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-brand-darker">{user.nome}</h2>
            <p className="text-sm text-brand-muted">{user.cargo}{user.departamentoNome && ` · ${user.departamentoNome}`}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.papeis.map((p) => <Badge key={p} tone={PAPEIS[p].tone}>{PAPEIS[p].label}</Badge>)}
            </div>
          </div>
          <p className="inline-flex items-center gap-1.5 text-xs text-brand-muted">
            <CalendarClock className="h-4 w-4" /> Membro desde {formatDate(user.criadoEm)}
          </p>
        </CardBody>
        <Tabs
          value={aba}
          onChange={setAba}
          items={[
            { value: 'dados', label: 'Dados Pessoais', icon: <UserRound className="h-4 w-4" /> },
            { value: 'seguranca', label: 'Segurança', icon: <KeyRound className="h-4 w-4" /> },
            { value: 'preferencias', label: 'Preferências', icon: <Bell className="h-4 w-4" /> },
          ]}
          className="border-t"
        />
      </Card>

      {aba === 'dados' && <DadosTab key={user.id} user={user} />}
      {aba === 'seguranca' && <SegurancaTab user={user} />}
      {aba === 'preferencias' && <PreferenciasTab />}
    </>
  );
}
