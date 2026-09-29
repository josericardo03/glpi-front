'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, LogIn, Mail } from 'lucide-react';
import { Button, Callout, Checkbox, Field, Input } from '@/components/ui';
import { getErrorMessage } from '@/lib/api';
import { useAuth } from '../auth-provider';

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.');
    setError(null);
    setLoading(true);
    try {
      await login({ email, senha, lembrar });
      router.replace(params.get('next') || '/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <Callout tone="danger">{error}</Callout>}
      <Field label="E-mail Corporativo" required>
        {(id) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            leftIcon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        )}
      </Field>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="senha" className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
            Senha <span className="text-status-critica">*</span>
          </label>
          <button type="button" className="text-[11px] font-semibold uppercase tracking-wide text-brand-primary hover:underline">
            Esqueci minha senha
          </button>
        </div>
        <Input
          id="senha"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          leftIcon={<Lock className="h-4 w-4" />}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
      </div>
      <Checkbox label="Manter conectado por 30 dias" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} className="text-brand-muted" />
      <Button type="submit" size="lg" className="w-full" loading={loading} icon={!loading && <LogIn className="h-4 w-4" />}>
        Entrar no Sistema
      </Button>
    </form>
  );
}
