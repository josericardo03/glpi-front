'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { Button, Callout, Field, Input, Select } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { isEmail } from '@/lib/validation';
import { safeRedirect, useAuth } from '../auth-provider';
import { ClienteObrigatorioError, MfaObrigatorioError, type ClienteDoLogin } from '../services/auth.service';

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<ClienteDoLogin[]>([]);
  const [idCliente, setIdCliente] = useState('');
  const [pedirCodigo, setPedirCodigo] = useState(false);
  const [codigoMfa, setCodigoMfa] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isEmail(email)) return setError('Informe um e-mail válido.');
    if (!senha) return setError('Informe a senha.');
    if (clientes.length && !idCliente) return setError('Escolha o cliente para entrar.');
    if (pedirCodigo && codigoMfa.trim().length < 6) return setError('Informe o código de verificação.');
    setError(null);
    setLoading(true);
    try {
      await login({ email, senha, ...(idCliente && { idCliente: Number(idCliente) }), ...(pedirCodigo && codigoMfa && { codigoMfa }) });
      router.replace(safeRedirect(params.get('next')));
    } catch (err) {
      if (err instanceof MfaObrigatorioError) {
        // A senha está certa: abre o campo do código (ou avisa que o código digitado não serviu).
        setPedirCodigo(true);
        setCodigoMfa('');
        setError(err.codigoInvalido ? err.message : null);
      } else if (err instanceof ClienteObrigatorioError) {
        setClientes(err.clientes);
        setIdCliente('');
        setError(err.message);
      } else {
        setError(getErrorMessage(err));
      }
      setLoading(false);
    }
  }

  /** Trocar e-mail ou senha invalida a escolha anterior do cliente e o código já pedido. */
  function limparCliente() {
    if (clientes.length) {
      setClientes([]);
      setIdCliente('');
    }
    if (pedirCodigo) {
      setPedirCodigo(false);
      setCodigoMfa('');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      )}
      <Field label="E-mail Corporativo" required>
        {(id) => (
          <Input
            id={id}
            type="email"
            autoComplete="username"
            placeholder="seu@email.com"
            leftIcon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => {
              limparCliente();
              setEmail(e.target.value);
            }}
            required
            autoFocus
          />
        )}
      </Field>
      <Field label="Senha" required>
        {(id) => (
          <Input
            id={id}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
            value={senha}
            onChange={(e) => {
              limparCliente();
              setSenha(e.target.value);
            }}
            required
          />
        )}
      </Field>
      {pedirCodigo && (
        <Field label="Código de verificação" required hint="Digite o código de 6 dígitos do aplicativo autenticador, ou um código de recuperação.">
          {(id) => (
            <Input
              id={id}
              inputMode="text"
              autoComplete="one-time-code"
              maxLength={20}
              placeholder="123456"
              leftIcon={<ShieldCheck className="h-4 w-4" />}
              className="font-mono tracking-widest"
              value={codigoMfa}
              onChange={(e) => setCodigoMfa(e.target.value)}
              autoFocus
            />
          )}
        </Field>
      )}
      {clientes.length > 0 && (
        <Field label="Cliente" required>
          {(id) => (
            <Select
              id={id}
              placeholder="Selecione..."
              options={clientes.map((c) => ({ value: String(c.id), label: c.nome }))}
              value={idCliente}
              onChange={(e) => setIdCliente(e.target.value)}
            />
          )}
        </Field>
      )}
      <Button type="submit" size="lg" className="w-full" loading={loading} icon={!loading && <LogIn className="h-4 w-4" />}>
        Entrar no Sistema
      </Button>
      <p className="text-center text-xs text-brand-muted">
        <Link href="/esqueci-senha" className="font-semibold text-brand-primary hover:underline">
          Esqueci minha senha
        </Link>
      </p>
    </form>
  );
}
