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
import { SegurancaTab } from './seguranca-tab';

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
        {/* Só o avatar sobe sobre o banner. O texto fica abaixo dele: texto escuro sobre o degradê escuro some. */}
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={user.nome} src={user.avatarUrl} size="xl" className="-mt-12 shrink-0 ring-4" />
          <div className="min-w-0 flex-1 sm:pt-1">
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
            <p className="inline-flex items-center gap-1.5 text-xs text-brand-muted sm:self-end">
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
      {aba === 'seguranca' && <SegurancaTab user={user} />}
      {aba === 'preferencias' && <PreferenciasTab key={user.id} userId={user.id} />}
    </>
  );
}
