'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { Button, Callout, Field, Input, Progress } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { isEmail, senhaInvalida } from '@/lib/validation';
import { authService } from '../services/auth.service';

function forca(s: string) {
  return [s.length >= 8, /[A-Z]/.test(s), /[a-z]/.test(s), /\d/.test(s), /[^A-Za-z0-9]/.test(s)].filter(Boolean).length;
}

/** Passo 1: pede o e-mail. A resposta é sempre a mesma, exista ou não a conta. */
export function EsqueciSenhaForm() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isEmail(email)) return setErro('Informe um e-mail válido.');
    setErro(null);
    setCarregando(true);
    try {
      setEnviado(await authService.esqueciSenha(email));
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setCarregando(false);
    }
  }

  if (enviado) {
    return (
      <div className="space-y-5">
        <Callout tone="success" icon={<CheckCircle2 className="h-5 w-5" />} title="Verifique o seu e-mail">
          {enviado} O link vale por 1 hora.
        </Callout>
        <p className="text-xs text-brand-muted">Não chegou? Veja a caixa de spam ou peça ao administrador do portal para conferir o e-mail cadastrado.</p>
        <Link href="/login" className="block text-center text-sm font-semibold text-brand-primary hover:underline">
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {erro && (
        <Callout tone="danger" role="alert">
          {erro}
        </Callout>
      )}
      <p className="text-sm text-brand-muted">Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</p>
      <Field label="E-mail Corporativo" required>
        {(id) => <Input id={id} type="email" autoComplete="username" placeholder="seu@email.com" leftIcon={<Mail className="h-4 w-4" />} value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={carregando}>
        Enviar link de redefinição
      </Button>
      <Link href="/login" className="block text-center text-sm font-semibold text-brand-primary hover:underline">
        Voltar ao login
      </Link>
    </form>
  );
}

/** Passo 2: a pessoa chega pelo link do e-mail (`?token=`) e define a nova senha. */
export function RedefinirSenhaForm() {
  const token = useSearchParams().get('token') ?? '';
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const f = forca(senha);
  const erroSenha = senha ? (senhaInvalida(senha) ?? (!/[A-Za-z]/.test(senha) || !/\d/.test(senha) ? 'Use letras e números.' : undefined)) : undefined;
  const confere = !confirmar || senha === confirmar;
  const valido = !!senha && !erroSenha && senha === confirmar;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setErro(null);
    setCarregando(true);
    try {
      await authService.redefinirSenha(token, senha);
      setConcluido(true);
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setCarregando(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <Callout tone="danger" title="Link incompleto">
          Abra o link completo que enviamos por e-mail ou peça uma nova redefinição.
        </Callout>
        <Link href="/esqueci-senha" className="block text-center text-sm font-semibold text-brand-primary hover:underline">
          Pedir novo link
        </Link>
      </div>
    );
  }

  if (concluido) {
    return (
      <div className="space-y-5">
        <Callout tone="success" icon={<CheckCircle2 className="h-5 w-5" />} title="Senha redefinida">
          Pronto! Todos os dispositivos foram desconectados. Entre com a nova senha.
        </Callout>
        <Link href="/login" className="block text-center text-sm font-semibold text-brand-primary hover:underline">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {erro && (
        <Callout tone="danger" role="alert">
          {erro} <Link href="/esqueci-senha" className="font-semibold underline">Pedir novo link</Link>
        </Callout>
      )}
      <Field label="Nova senha" required error={erroSenha} hint="Mínimo de 8 caracteres, com letras e números.">
        {(id) => <Input id={id} type="password" autoComplete="new-password" maxLength={128} leftIcon={<KeyRound className="h-4 w-4" />} value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />}
      </Field>
      {senha && (
        <div aria-live="polite">
          <Progress value={(f / 5) * 100} tone={f >= 4 ? 'success' : f === 3 ? 'warning' : 'danger'} size="xs" />
        </div>
      )}
      <Field label="Confirmar nova senha" required error={confere ? undefined : 'As senhas não conferem.'}>
        {(id) => <Input id={id} type="password" autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />}
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={!valido} loading={carregando}>
        Redefinir senha
      </Button>
    </form>
  );
}
